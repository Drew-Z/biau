"""Bounded adapter around the pinned Horizon skill's native pipeline service."""
import argparse
import asyncio
import contextlib
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
import logging
import os
from pathlib import Path
import re
import sys
import tempfile
import time

HERE = Path(__file__).resolve().parent
SHANGHAI = timezone(timedelta(hours=8))
MAX_MODEL_RESPONSE_BYTES = 1024 * 1024
SCHEDULES = {"17 0 * * *": "morning", "17 12 * * *": "evening"}


class StageRejected(ValueError):
    def __init__(self, code, diagnostics):
        super().__init__(code)
        self.diagnostics = diagnostics


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def stamp(value):
    return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def configuration_hash():
    paths = sorted([HERE / "config.json", HERE / "budget.json", *HERE.glob("profiles/**/*.*")])
    digest = hashlib.sha256()
    for path in paths:
        digest.update(path.relative_to(HERE).as_posix().encode() + b"\0" + path.read_bytes().replace(b"\r\n", b"\n") + b"\0")
    return digest.hexdigest()


def resolve_channel(config, selected=None):
    """Select one complete credential group; never fall back after a request."""
    from urllib.parse import urlsplit
    fields = ("API_KEY", "BASE_URL", "MODEL")
    selected = selected if selected is not None else os.getenv("HORIZON_CHANNEL")
    if selected is None:
        selected = "2" if any(f"HORIZON_{field}2" in os.environ for field in fields) else "1"
        if selected == "1" and not any(f"HORIZON_{field}" in os.environ for field in fields):
            selected = "fast"
    elif selected not in ("1", "2"):
        raise ValueError("invalid-model-channel")
    names = [f"BLOG_DRAFT_FAST_{field}" if selected == "fast" else f"HORIZON_{field}{'2' if selected == '2' else ''}" for field in fields]
    key, base_url, model = (os.getenv(name, "").strip() for name in names)
    parsed = urlsplit(base_url)
    expected_model = config["adapter"]["channelModels"].get(selected, config["ai"]["model"])
    if not key or not parsed.hostname or parsed.scheme != "https" or parsed.username or parsed.password or parsed.query or parsed.fragment or model != expected_model:
        raise ValueError("model-channel-unconfigured-or-drifted")
    identity = {"id": selected, "endpointHash": hashlib.sha256(base_url.rstrip("/").encode()).hexdigest(), "model": model}
    return identity, base_url, names[0]


def system_proxy(base_url):
    """Opt-in local proxy selection; do not change the machine or TLS settings."""
    from urllib.parse import urlsplit
    from urllib.request import getproxies, proxy_bypass
    if proxy_bypass(urlsplit(base_url).hostname):
        return None
    proxy = getproxies().get("https") or getproxies().get("http")
    if not proxy:
        raise ValueError("system-proxy-unconfigured")
    if "://" not in proxy:
        proxy = "http://" + proxy
    parsed = urlsplit(proxy)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("unsupported-system-proxy")
    return proxy


def verify_upstream(root):
    lock = read_json(HERE / "upstream.json")
    paths = sorted([*root.glob("src/**/*.py"), *root.glob("skills/horizon/scripts/*.py"), root / "pyproject.toml", root / "uv.lock"], key=lambda p: p.relative_to(root).as_posix())
    digest = hashlib.sha256()
    for path in paths:
        digest.update(path.relative_to(root).as_posix().encode() + b"\0" + path.read_bytes() + b"\0")
    if digest.hexdigest() != lock["sourceSha256"]:
        raise ValueError("upstream-version-mismatch")
    if hashlib.sha256((root / "uv.lock").read_bytes()).hexdigest() != lock["uvLockSha256"]:
        raise ValueError("upstream-lock-mismatch")
    if sys.version_info[:2] != (3, 12):
        raise ValueError("python-3.12-required")


def resolve_edition(edition_id=None, schedule=None, created_at=None, now=None):
    now = now or datetime.now(timezone.utc)
    if edition_id:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}-(morning|evening)", edition_id):
            raise ValueError("invalid-edition")
        date, slot = edition_id[:10], edition_id[11:]
    else:
        if schedule not in SCHEDULES or not created_at:
            raise ValueError("explicit-edition-required")
        created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        if created.tzinfo is None:
            raise ValueError("ambiguous-schedule")
        date = created.astimezone(SHANGHAI).date().isoformat()
        slot = SCHEDULES[schedule]
        scheduled = datetime.fromisoformat(f"{date}T{'08' if slot == 'morning' else '20'}:00:00+08:00")
        # The edition anchor stays 08:00/20:00; the trigger avoids the busy hour boundary.
        trigger = scheduled + timedelta(minutes=int(schedule.split()[0]))
        if not trigger <= created <= now < scheduled + timedelta(hours=12):
            raise ValueError("delayed-schedule-use-manual-edition")
    scheduled = datetime.fromisoformat(f"{date}T{'08' if slot == 'morning' else '20'}:00:00+08:00")
    if scheduled > now:
        raise ValueError("future-edition")
    return {"editionId": f"{date}-{slot}", "scheduledFor": stamp(scheduled)}


def require_fetch(result, raw, budget):
    report = result.get("fetch_report", {})
    sources = report.get("sources", [])
    if (result.get("fetch_status") != "success" or report.get("status") != "success"
            or report.get("attempted") != 1 or report.get("failed") != 0
            or report.get("partial_failure") != 0 or len(sources) != 1
            or sources[0].get("source") != "RSS Feeds"
            or sources[0].get("status") not in ("success", "empty") or sources[0].get("failures")):
        raise ValueError("incomplete-fetch")
    if not isinstance(raw, list) or type(result.get("fetched")) is not int or result["fetched"] != len(raw):
        raise ValueError("incomplete-fetch")
    if len(raw) > budget["maxFetchedItems"]:
        raise ValueError("over-budget-input")
    if len({i["id"] for i in raw}) != len(raw):
        raise ValueError("duplicate-input")


def require_scored(raw, scored):
    if not raw or {i["id"] for i in raw} != {i["id"] for i in scored} or len(raw) != len(scored):
        raise ValueError("incomplete-score")
    for item in scored:
        score = ((item.get("processing") or {}).get("analysis") or {}).get("score")
        if isinstance(score, bool) or not isinstance(score, (int, float)) or not 0 <= score <= 10:
            raise ValueError("incomplete-score")


class RequestBudget:
    """Count actual HTTP attempts; SDK/repair retries all share this one budget."""
    def __init__(self, budget):
        self.budget = budget
        self.requests = 0
        self.started = time.monotonic()
        self.stopped = False
        self.stage = "score"
        self.failure = None
        self.attempts = []
        self.item = None
        self.item_failure = None
        self.persist = lambda: None
        self.omissions = lambda: []

    def usage_coverage(self):
        known = sum(attempt["usage"] is not None for attempt in self.attempts)
        return {"reportedRequests": known, "unknownRequests": self.requests - known}

    def reported_usage(self):
        # Only this run's HTTP attempts; native global counters may span invocations.
        usages = [attempt["usage"] for attempt in self.attempts if attempt["usage"] is not None]
        return {key: sum(usage[key] for usage in usages) for key in ("prompt_tokens", "completion_tokens", "total_tokens")} if usages else None

    def stop(self, code, http_status=None):
        self.stopped = True
        if self.failure is None:
            self.failure = {"category": code, "httpStatus": http_status}

    def fail(self, code, http_status=None):
        recoverable = code in {"provider-edge-timeout", "request-timeout", "transport-error", "connection-error",
                              "incomplete-model-stream", "invalid-model-result", "invalid-model-json",
                              "provider-stream-error", "invalid-model-stream", "unexpected-model-content-type",
                              "model-response-too-large", "invalid-item-output"}
        recoverable |= code == "provider-http-error" and http_status is not None and 500 <= http_status <= 599
        if self.item is not None and recoverable and not self.stopped:
            if self.item_failure is None:
                self.item_failure = {"category": code, "httpStatus": http_status}
        else:
            self.stop(code, http_status)

    def reserve(self, body):
        if (self.stopped or self.requests >= self.budget["maxModelRequests"]
                or time.monotonic() - self.started >= self.budget["deadlineSeconds"]):
            raise ValueError("model-budget-exhausted")
        prompt_chars = sum(len(str(message.get("content", ""))) for message in body.get("messages", []))
        tokens = body.get("max_tokens", body.get("max_completion_tokens", 0))
        if not 0 < tokens <= self.budget["maxOutputTokensPerRequest"] or prompt_chars > self.budget["maxPromptCharacters"]:
            raise ValueError("model-request-over-budget")
        previous = [a for a in self.attempts if self.item is not None and a.get("item") == self.item and a["stage"] == self.stage]
        signature = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
        if self.item_failure or any(a["outcome"] == "complete" for a in previous):
            # Native schema-repair/tenacity may call again; never resend a possibly billed item.
            self.fail("invalid-item-output")
            raise ValueError("item-request-stopped")
        if previous and (len(previous) >= 3 or any(a.get("requestHash") == signature for a in previous)):
            self.stop("provider-http-error", previous[-1]["httpStatus"])
            raise ValueError("item-request-stopped")
        self.requests += 1
        return signature


@contextlib.asynccontextmanager
async def guarded_client(budget, base_url, proxy=None):
    import httpx
    from openai import APIConnectionError, APIError, APIStatusError
    from src.ai import client as native
    from src.ai.errors import AIProviderUnavailableError
    original = native.AsyncOpenAI
    meter = RequestBudget(budget)
    clients = []
    endpoint = base_url.rstrip("/") + "/chat/completions"
    current_attempt = ContextVar("horizon_model_attempt", default=None)

    def safe_request_id(value):
        # Only recognizable opaque IDs, never arbitrary header text or credentials.
        if value and re.fullmatch(r"(?:req_[A-Za-z0-9_-]{8,96}|[a-fA-F0-9]{32}|[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12})", value) and "sk-" not in value.lower():
            return value
        return None

    def reject(code, http_status=None):
        if not meter.item_failure and not meter.failure:
            meter.fail(code, http_status)
        raise AIProviderUnavailableError("bounded-model-request-stopped")

    class BoundedResponseStream(httpx.AsyncByteStream):
        def __init__(self, inner):
            self.inner = inner

        async def __aiter__(self):
            size = 0
            async for chunk in self.inner:
                size += len(chunk)
                if size > MAX_MODEL_RESPONSE_BYTES:
                    reject("model-response-too-large")
                yield chunk

        async def aclose(self):
            await self.inner.aclose()

    class Transport(httpx.AsyncBaseTransport):
        def __init__(self):
            self.inner = httpx.AsyncHTTPTransport(retries=0, proxy=proxy)

        async def handle_async_request(self, request):
            try:
                if request.method != "POST" or str(request.url) != endpoint:
                    raise ValueError("unexpected-model-endpoint")
                body = json.loads(request.content)
                if body.get("stream") is not True or body.get("tools") or body.get("n", 1) != 1:
                    reject("unsupported-model-request")
                signature = meter.reserve(body)
                attempt, started = current_attempt.get()
                attempt["number"] = meter.requests
                attempt["requestHash"] = signature
                meter.attempts.append(attempt)
                # Persist the reservation BEFORE sending; a crash cannot reset paid/unknown usage.
                meter.persist()
                response = await self.inner.handle_async_request(request)
                attempt["httpStatus"] = response.status_code
                attempt["headersSeconds"] = round(time.monotonic() - started, 3)
                attempt["requestId"] = safe_request_id(response.headers.get("x-request-id"))
                ray = response.headers.get("cf-ray", "")
                attempt["edgeTraceId"] = ray if re.fullmatch(r"[a-fA-F0-9]{16,32}-[A-Z]{3}", ray) else None
                if response.status_code == 429:
                    meter.stop("provider-http-error", 429)
                    retry_after = response.headers.get("retry-after", "")
                    if re.fullmatch(r"[0-9]{1,5}", retry_after) and int(retry_after) <= 86400:
                        attempt["retryAfterSeconds"] = int(retry_after)
                    attempt["limitKind"] = "unknown"
                    # Keep only known machine codes, never error messages or raw bodies.
                    try:
                        async with asyncio.timeout(1):
                            data = bytearray()
                            async for part in response.aiter_bytes():
                                if len(data) + len(part) > 16384:
                                    break
                                data.extend(part)
                            else:
                                error_body = json.loads(data)
                                error_body = error_body.get("error", {}) if isinstance(error_body, dict) else {}
                                if isinstance(error_body, dict):
                                    markers = [error_body.get("code"), error_body.get("type")]
                                    if any(value in ("insufficient_quota", "quota_exceeded") for value in markers):
                                        attempt["limitKind"] = "quota"
                                    elif any(value in ("rate_limit_exceeded", "rate_limit_error") for value in markers):
                                        attempt["limitKind"] = "rate-limit"
                    except (ValueError, TimeoutError, httpx.HTTPError):
                        pass
                if response.status_code >= 300 and response.status_code not in (400, 422):
                    await response.aclose()
                    reject("provider-edge-timeout" if response.status_code == 524 else "provider-http-error", response.status_code)
                if response.status_code == 200 and response.headers.get("content-type", "").split(";", 1)[0].strip().lower() != "text/event-stream":
                    await response.aclose()
                    reject("unexpected-model-content-type")
                response.stream = BoundedResponseStream(response.stream)
                return response
            except Exception as error:
                if isinstance(error, httpx.TimeoutException):
                    code = "request-timeout"
                elif isinstance(error, httpx.TransportError):
                    code = "transport-error"
                elif isinstance(error, ValueError) and str(error) in ("model-budget-exhausted", "model-request-over-budget", "unexpected-model-endpoint"):
                    code = str(error)
                else:
                    code = "transport-failed"
                reject(code)

        async def aclose(self):
            await self.inner.aclose()

    class BoundedSDK(original):
        async def request(self, *args, **kwargs):
            try:
                async with asyncio.timeout(budget["requestTimeoutSeconds"]):
                    return await super().request(*args, **kwargs)
            except Exception as error:
                # OpenAI wraps transport errors; restore Horizon's stop-without-retry signal.
                if meter.stopped or meter.item_failure or isinstance(error, (APIConnectionError, TimeoutError)):
                    reject("request-timeout" if isinstance(error, TimeoutError) else "connection-error")
                raise

    class StreamingCompletions:
        """Keep Horizon's complete-response interface; let the SDK own SSE parsing."""
        def __init__(self, resource):
            self.resource = resource

        async def create(self, **kwargs):
            started = time.monotonic()
            attempt = {"number": None, "stage": meter.stage, "item": meter.item, "httpStatus": None, "requestId": None,
                       "edgeTraceId": None, "headersSeconds": None, "firstChunkSeconds": None,
                       "elapsedSeconds": None, "finishReason": None, "usage": None, "jsonFormat": None,
                       "retryAfterSeconds": None, "limitKind": None, "outcome": "pending"}
            token = current_attempt.set((attempt, started))
            try:
                # Includes response headers, every chunk, final aggregation and validation.
                async with asyncio.timeout(budget["requestTimeoutSeconds"]):
                    async with self.resource.stream(**kwargs, stream_options={"include_usage": True}) as stream:
                        async for event in stream:
                            if event.type != "chunk":
                                continue
                            if attempt["firstChunkSeconds"] is None:
                                attempt["firstChunkSeconds"] = round(time.monotonic() - started, 3)
                            usage = event.chunk.usage
                            if usage is not None:
                                counts = {key: getattr(usage, key, None) for key in ("prompt_tokens", "completion_tokens", "total_tokens")}
                                if all(type(value) is int and value >= 0 for value in counts.values()):
                                    attempt["usage"] = counts
                            for choice in event.chunk.choices:
                                if choice.finish_reason is not None:
                                    reason = choice.finish_reason
                                    attempt["finishReason"] = reason if reason in ("stop", "length", "content_filter", "tool_calls", "function_call") else "unknown"
                        if attempt["finishReason"] != "stop":
                            reject("incomplete-model-stream")
                        completion = await stream.get_final_completion()
                    if len(completion.choices) != 1 or completion.choices[0].finish_reason != "stop":
                        reject("incomplete-model-stream")
                    message = completion.choices[0].message
                    if message.refusal or message.tool_calls or not isinstance(message.content, str) or not message.content.strip():
                        reject("invalid-model-result")
                    # Some compatible providers wrap a complete JSON object in Markdown.
                    # Accept only the entire fence, never search prose for a JSON substring.
                    content = message.content.strip()
                    fenced = re.fullmatch(r"```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```", content, re.IGNORECASE)
                    if fenced:
                        content = fenced[1]
                    try:
                        parsed = json.loads(content)
                    except (ValueError, TypeError):
                        attempt["jsonFormat"] = "invalid"
                        reject("invalid-model-json")
                    if not isinstance(parsed, dict):
                        attempt["jsonFormat"] = "non-object"
                        reject("invalid-model-json")
                    message.content = content
                    attempt["jsonFormat"] = "fenced-object" if fenced else "object"
                    attempt["outcome"] = "complete"
                    return completion
            except APIStatusError as error:
                # Preserve only the pinned native client's bounded 400/422 parameter compatibility.
                if error.status_code in (400, 422) and not meter.stopped:
                    attempt["outcome"] = "parameter-rejected"
                    raise
                reject("provider-http-error")
            except asyncio.CancelledError:
                meter.stop("run-cancelled-or-deadline")
                raise
            except Exception as error:
                if isinstance(error, (TimeoutError, httpx.TimeoutException)):
                    code = "request-timeout"
                elif isinstance(error, httpx.TransportError):
                    code = "transport-error"
                elif isinstance(error, APIError):
                    # Some compatible gateways put quota/auth failures inside HTTP 200 SSE.
                    markers = {v for v in (error.code, error.type) if isinstance(v, str)}
                    for status, known in ((402, {"insufficient_quota", "quota_exceeded"}),
                                          (429, {"rate_limit_exceeded", "rate_limit_error"}),
                                          (401, {"invalid_api_key", "authentication_error"}),
                                          (403, {"permission_denied", "permission_error"})):
                        if markers & known:
                            reject("provider-http-error", status)
                    code = "provider-stream-error"
                else:
                    code = "invalid-model-stream"
                # Also prevents Horizon's repair/retry loops from reissuing a failed stream.
                reject(code)
            finally:
                attempt["elapsedSeconds"] = round(time.monotonic() - started, 3)
                failure = meter.failure or meter.item_failure
                if failure:
                    attempt["outcome"] = failure["category"]
                current_attempt.reset(token)
                meter.persist()

    def factory(**kwargs):
        client = BoundedSDK(**kwargs, max_retries=0, timeout=budget["requestTimeoutSeconds"], http_client=httpx.AsyncClient(transport=Transport(), timeout=budget["requestTimeoutSeconds"], follow_redirects=False))
        # Retain the original SDK resource: its stream() calls its own create().
        client.chat.completions = StreamingCompletions(client.chat.completions)
        clients.append(client)
        return client

    native.AsyncOpenAI = factory
    try:
        yield meter
    except (Exception, asyncio.CancelledError) as error:
        if meter.failure is None:
            code = "run-cancelled-or-deadline" if isinstance(error, asyncio.CancelledError) else "model-stage-error"
            if isinstance(error, ValueError) and str(error) in ("incomplete-score", "incomplete-selection", "over-budget-selection", "incomplete-enrichment", "incomplete-summary", "chinese-content-required", "insufficient-stage-coverage", "checkpoint-artifact-drift", "checkpoint-input-drift", "checkpoint-record-invalid"):
                code = str(error)
            meter.stop(code)
        meter.persist()
        raise StageRejected("model-stage-failed", {"stage": meter.stage, "modelCalls": meter.requests, "elapsedSeconds": round(time.monotonic() - meter.started, 2), "failure": meter.failure, "usage": meter.reported_usage(), "usageCoverage": meter.usage_coverage(), "attempts": meter.attempts, "omissions": meter.omissions()}) from None
    finally:
        native.AsyncOpenAI = original
        for client in clients:
            await client.close()


def public_source(item):
    from urllib.parse import urlsplit
    url = str(item["url"])
    artifact = item["processing"]["artifacts"]["zh"]
    if not re.search(r"[\u3400-\u9fff]", artifact["title"]) or not any(block["id"] == "summary" and re.search(r"[\u3400-\u9fff]", block["content"]) for block in artifact["blocks"]):
        raise ValueError("chinese-content-required")
    return {"title": item["processing"]["artifacts"]["zh"]["title"], "publisher": item.get("metadata", {}).get("feed_name") or urlsplit(url).hostname, "url": url}


async def execute(args):
    root = Path(args.horizon_path).resolve()
    verify_upstream(root)
    sys.path.insert(0, str(root))
    from rich.console import Console
    from src.mcp.service import HorizonPipelineService
    from item_runs import ItemRuns
    config = read_json(HERE / "config.json")
    models = config.get("adapter", {}).get("channelModels")
    if not isinstance(models, dict) or set(models) != {"1", "2"} or not all(isinstance(m, str) and m.strip() == m and m for m in models.values()) or models["2"] != config["ai"]["model"]:
        raise ValueError("invalid-channel-model-config")
    budget = read_json(HERE / "budget.json")
    request_limit = getattr(args, "request_limit", None)
    if request_limit is not None:
        if not isinstance(request_limit, int) or isinstance(request_limit, bool) or not 1 <= request_limit <= budget["maxModelRequests"]:
            raise ValueError("invalid-request-limit")
        budget["maxModelRequests"] = request_limit
    if len(config["sources"]["rss"]) > budget["maxSources"] or config["digest"]["max_items"] > budget["maxPublishedItems"]:
        raise ValueError("config-over-budget")
    config["processing"]["profiles_dir"] = str(HERE / "profiles")
    live = args.operation == "generate"
    if live:
        output = Path(args.output).resolve()
        if output.exists() or not output.parent.is_dir():
            raise ValueError("output-unavailable")
        if os.getenv("HORIZON_GENERATION_APPROVED") != "true":
            raise ValueError("generation-not-approved")
        from dotenv import load_dotenv
        if args.env_file:
            load_dotenv(args.env_file, override=False)
        channel, base_url, key_env = resolve_channel(config, getattr(args, "channel", None))
        proxy = system_proxy(base_url) if getattr(args, "use_system_proxy", False) else None
        config["ai"]["api_key_env"] = key_env
        config["ai"]["base_url"] = base_url
        config["ai"]["model"] = channel["model"]
    config.pop("adapter")  # Local policy is not a native provider chain.
    with contextlib.ExitStack() as resources:
        temporary = resources.enter_context(tempfile.TemporaryDirectory(prefix="biau-horizon-run-"))
        work = Path(temporary)
        private_config = work / "config.json"
        private_config.write_text(json.dumps(config, ensure_ascii=False), encoding="utf-8")
        service = HorizonPipelineService(runs_root=work / "runs", console=Console(file=io.StringIO()))
        common = {"horizon_path": str(root), "config_path": str(private_config)}
        checked = await service.validate_config(**common, check_env=live)
        if checked["missing_env"] or checked["unknown_sources"]:
            raise ValueError("invalid-runtime-config")
        if args.operation == "validate":
            return {"ok": True, "operation": "validate", "configurationHash": configuration_hash(), "modelCalls": 0}
        edition = resolve_edition(args.edition_id, args.schedule, args.created_at)
        state = None
        if live:
            from filelock import FileLock
            checkpoint = Path(getattr(args, "checkpoint", None) or str(output) + ".checkpoint").resolve()
            if checkpoint.is_relative_to(HERE.parents[1]) or not checkpoint.parent.is_dir():
                raise ValueError("checkpoint-must-be-outside-repository")
            resources.enter_context(FileLock(str(checkpoint) + ".lock", timeout=0))
            resume = getattr(args, "resume", False)
            if checkpoint.exists() != resume:
                raise ValueError("checkpoint-exists-use-resume" if checkpoint.exists() else "checkpoint-missing")
            if resume:
                service = HorizonPipelineService(runs_root=checkpoint, console=Console(file=io.StringIO()))
                state = ItemRuns(service, edition, configuration_hash(), budget, channel=channel)
                raw = state.raw
                fetched = {**state.state["fetched"], "meta": {"since": state.state["windowStart"]}}
        if state is None:
            fetched = await service.fetch_items(hours=24, **common)
            raw = read_json(fetched["artifact"])
        try:
            require_fetch(fetched, raw, budget)
        except ValueError as error:
            report = fetched.get("fetch_report", {})
            failures = {key: value for source in report.get("sources", []) for key, value in source.get("failures", {}).items()}
            known_failures = []
            for source in config["sources"]["rss"]:
                reasons = [str(value) for key, value in failures.items() if key == source["name"] or key.startswith(source["name"] + "/")]
                for reason in reasons:
                    category = "source-error"
                    for kind in ("HTTPStatusError", "ConnectError", "ReadTimeout", "ConnectTimeout", "ValueError"):
                        if kind in reason:
                            category = kind
                            break
                    status = re.search(r"\b([45]\d\d)\b", reason) if category == "HTTPStatusError" else None
                    known_failures.append({"source": source["name"], "category": category, "httpStatus": int(status.group(1)) if status else None})
            raise StageRejected(str(error), {"stage": "fetch", "fetched": len(raw), "fetchStatus": fetched.get("fetch_status"), "failures": known_failures, "modelCalls": 0}) from None
        window_start = datetime.fromisoformat(fetched["meta"]["since"])
        if args.operation == "collect":
            # Public metadata only; collection never loads a model channel or emits a bundle.
            return {"ok": True, "operation": "collect", **edition, "configurationHash": configuration_hash(),
                    "windowStart": stamp(window_start), "windowEnd": stamp(window_start + timedelta(hours=24)),
                    "fetched": len(raw), "modelCalls": 0,
                    "sourceCounts": [{"publisher": source["name"], "items": sum(item.get("metadata", {}).get("feed_name") == source["name"] for item in raw)} for source in config["sources"]["rss"] if source.get("enabled", True)],
                    "sources": [{"title": i["title"], "url": str(i["url"]), "publisher": i.get("metadata", {}).get("feed_name"),
                                 "publishedAt": i.get("published_at"), "contentChars": len(i.get("content") or "")} for i in raw]}
        result = {"ok": True, **edition, "outcome": "skipped", "stage": "fetch", "fetched": len(raw),
                  "scored": 0, "scoreFailed": 0, "selected": 0, "enrichmentFailed": 0, "items": 0, "modelCalls": 0, "published": False,
                  "reportedUsage": None, "usageCoverage": {"reportedRequests": 0, "unknownRequests": 0}}
        if not raw:
            return {**result, "reason": "no-input"}
        if state is None:
            service = HorizonPipelineService(runs_root=checkpoint, console=Console(file=io.StringIO()))
            state = ItemRuns(service, edition, configuration_hash(), budget, channel=channel, fetched=fetched, raw=raw)
        run_id = state.run_id

        def valid_score(item, native_result, items):
            if len(items) != 1 or items[0]["id"] != item["id"] or items[0]["url"] != item["url"] or native_result["scored"] != 1:
                raise ValueError("incomplete-score")
            try:
                require_scored([item], items)
                return True
            except ValueError:
                return False

        def valid_enrichment(item, native_result, items):
            if native_result["status"] == "failure" and native_result["failed"] == 1 and native_result["enriched"] == 0:
                return False
            if (native_result["status"] != "success" or native_result["failed"] != 0 or native_result["enriched"] != 1
                    or len(items) != 1 or items[0]["id"] != item["id"] or items[0]["url"] != item["url"]):
                raise ValueError("incomplete-enrichment")
            try:
                public_source(items[0])
                return True
            except (ValueError, KeyError, TypeError):
                return False

        async with contextlib.AsyncExitStack() as stack:
            meter = await stack.enter_async_context(guarded_client(budget, base_url, proxy))
            state.attach(meter)
            await stack.enter_async_context(asyncio.timeout(budget["deadlineSeconds"] - (time.monotonic() - meter.started)))

            def stats():
                return {**result, "modelCalls": meter.requests, "reportedUsage": meter.reported_usage(),
                        "usageCoverage": meter.usage_coverage(), "omissions": state.omissions()}

            scored_items = await state.process("score", raw, common, valid_score, config["ai"].get("throttle_sec", 0))
            score_failed = len(raw) - len(scored_items)
            result.update(scored=len(scored_items), scoreFailed=score_failed, stage="score")
            if not scored_items:
                return {**stats(), "reason": "no-complete-items"}
            if len(scored_items) / len(raw) < budget["minStageCompletionRatio"]:
                raise ValueError("insufficient-stage-coverage")
            service.run_store.save_items(run_id, "scored", scored_items)
            meter.stage = "filter"
            filtered = await service.filter_items(run_id, topic_dedup=False, **common)
            selected = filtered.get("kept")
            selected_items = read_json(filtered["artifact"])
            scored_ids = {i["id"] for i in scored_items}
            threshold = config["processing"]["profile_settings"]["ai-news"]["threshold"]
            if (not isinstance(selected_items, list) or type(selected) is not int or selected < 0 or selected != len(selected_items)
                    or len({i["id"] for i in selected_items}) != selected
                    or any(i["id"] not in scored_ids or i["processing"]["analysis"]["score"] < threshold for i in selected_items)):
                raise ValueError("incomplete-selection")
            if selected > budget["maxPublishedItems"]:
                raise ValueError("over-budget-selection")
            if selected == 0:
                return {**stats(), "reason": "no-qualified-items", "stage": "filter"}
            result.update(selected=selected, stage="enrich")
            items = await state.process("enrich", selected_items, common, valid_enrichment, config["ai"].get("throttle_sec", 0))
            enrichment_failed = selected - len(items)
            result.update(enrichmentFailed=enrichment_failed, items=len(items))
            if not items:
                return {**stats(), "reason": "no-complete-items"}
            if len(items) / selected < budget["minStageCompletionRatio"]:
                raise ValueError("insufficient-stage-coverage")
            service.run_store.save_items(run_id, "enriched", items)
            meter.stage = "summary"
            summary = await service.generate_summary(run_id, language="zh", source_stage="enriched", save_to_horizon_data=False, **common)
            if summary["source_stage"] != "enriched" or summary["items_used"] != len(items):
                raise ValueError("incomplete-summary")
            bundle = {"schemaVersion": 1, **edition, "generatedAt": stamp(datetime.fromisoformat(summary["meta"]["summary_generated_at"])),
                      "windowStart": stamp(window_start), "windowEnd": stamp(window_start + timedelta(hours=24)),
                      "markdown": Path(summary["summary_path"]).read_text(encoding="utf-8"), "sourceLinks": [public_source(i) for i in items],
                      "checks": {"fetchStatus": fetched["fetch_status"], "failedSources": fetched["fetch_report"]["failed"], "raw": len(raw), "scored": len(scored_items), "scoreFailed": score_failed,
                                 "selected": selected, "enrichmentStatus": "partial" if enrichment_failed else "success", "enriched": len(items), "failed": enrichment_failed,
                                 "summaryStage": summary["source_stage"], "language": summary["language"], "itemsUsed": summary["items_used"]},
                      "runtime": {"engineRevision": read_json(HERE / "upstream.json")["revision"], "configurationHash": configuration_hash(), "channel": channel["id"], "model": channel["model"], "requests": meter.requests, "usage": meter.reported_usage(), "usageCoverage": meter.usage_coverage(), "attempts": meter.attempts, "omissions": state.omissions(), "stopped": meter.stopped,
                                  "items": [{"id": i["id"], "url": i["url"], "score": i["processing"]["analysis"]["score"]} for i in items]}}
        with output.open("x", encoding="utf-8", newline="\n") as target:
            target.write(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n")
        return {**stats(), "outcome": "generated", "stage": "summary"}


def write_actions_result(result):
    """Export only the completed CLI result, never native logs or provider bodies."""
    outcome = result.get("outcome") if result.get("ok") else "failed"
    if outcome not in ("generated", "skipped", "failed"):
        raise ValueError("invalid-generation-outcome")
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8", newline="\n") as output:
        output.write(f"outcome={outcome}\n")
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8", newline="\n") as summary:
        summary.write("### Horizon generation\n\n```json\n" + json.dumps(result, ensure_ascii=False, indent=2) + "\n```\n\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["validate", "collect", "generate"])
    parser.add_argument("--horizon-path", required=True)
    parser.add_argument("--edition-id")
    parser.add_argument("--schedule")
    parser.add_argument("--created-at")
    parser.add_argument("--env-file")
    parser.add_argument("--channel", choices=["1", "2"], help="Select one complete channel group; defaults to channel 2 when configured")
    parser.add_argument("--use-system-proxy", action="store_true", help="Use the existing system HTTPS proxy for local model requests")
    parser.add_argument("--output")
    parser.add_argument("--request-limit", type=int, help="Lower the configured request cap for an authorized continuation")
    parser.add_argument("--checkpoint", help="Local checkpoint directory outside the repository; defaults to OUTPUT.checkpoint")
    parser.add_argument("--resume", action="store_true", help="Resume the frozen inputs and cumulative budget, without repeating attempted items")
    parser.add_argument("--github-actions", action="store_true", help="Write generation outcome and sanitized job summary")
    args = parser.parse_args()
    if args.operation == "generate" and not args.output:
        parser.error("generate requires --output")
    if args.github_actions and (args.operation != "generate" or not os.getenv("GITHUB_OUTPUT") or not os.getenv("GITHUB_STEP_SUMMARY")):
        parser.error("--github-actions requires generation and Actions output paths")
    logging.disable(logging.CRITICAL)
    try:
        # Third-party logs may contain upstream response bodies; never forward them.
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            result = asyncio.run(asyncio.wait_for(execute(args), timeout=read_json(HERE / "budget.json")["deadlineSeconds"]))
    except Exception as error:
        # Fixed diagnostic only; no URL, config, raw provider text or credentials.
        code = str(error) if isinstance(error, ValueError) and re.fullmatch(r"[a-z0-9.-]+", str(error)) else type(error).__name__
        result = {"ok": False, "outcome": "failed", "error": code, **({"diagnostics": error.diagnostics} if isinstance(error, StageRejected) else {})}
    print(json.dumps(result, ensure_ascii=False))
    if args.github_actions:
        write_actions_result(result)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
