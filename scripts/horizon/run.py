"""Bounded adapter around the pinned Horizon skill's native pipeline service."""
import argparse
import asyncio
import contextlib
from contextvars import ContextVar
from dataclasses import asdict
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

    def reserve(self, body):
        if (self.stopped or self.requests >= self.budget["maxModelRequests"]
                or time.monotonic() - self.started >= self.budget["deadlineSeconds"]):
            raise ValueError("model-budget-exhausted")
        prompt_chars = sum(len(str(message.get("content", ""))) for message in body.get("messages", []))
        tokens = body.get("max_tokens", body.get("max_completion_tokens", 0))
        if not 0 < tokens <= self.budget["maxOutputTokensPerRequest"] or prompt_chars > self.budget["maxPromptCharacters"]:
            raise ValueError("model-request-over-budget")
        self.requests += 1


@contextlib.asynccontextmanager
async def guarded_client(budget, base_url):
    import httpx
    from openai import APIConnectionError, APIError, APIStatusError
    from src.ai import client as native
    from src.ai.errors import AIProviderUnavailableError
    from src.ai.tokens import get_usage_snapshot
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

    def reject(code):
        meter.stop(code)
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
            self.inner = httpx.AsyncHTTPTransport(retries=0)

        async def handle_async_request(self, request):
            try:
                if request.method != "POST" or str(request.url) != endpoint:
                    raise ValueError("unexpected-model-endpoint")
                body = json.loads(request.content)
                if body.get("stream") is not True or body.get("tools") or body.get("n", 1) != 1:
                    reject("unsupported-model-request")
                meter.reserve(body)
                attempt, started = current_attempt.get()
                attempt["number"] = meter.requests
                meter.attempts.append(attempt)
                response = await self.inner.handle_async_request(request)
                attempt["httpStatus"] = response.status_code
                attempt["headersSeconds"] = round(time.monotonic() - started, 3)
                attempt["requestId"] = safe_request_id(response.headers.get("x-request-id"))
                ray = response.headers.get("cf-ray", "")
                attempt["edgeTraceId"] = ray if re.fullmatch(r"[a-fA-F0-9]{16,32}-[A-Z]{3}", ray) else None
                if response.status_code >= 300 and response.status_code not in (400, 422):
                    meter.stop("provider-edge-timeout" if response.status_code == 524 else "provider-http-error", response.status_code)
                    await response.aclose()
                    raise ValueError("provider-request-failed")
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
                meter.stop(code)
                raise AIProviderUnavailableError("bounded-model-request-stopped") from None

        async def aclose(self):
            await self.inner.aclose()

    class BoundedSDK(original):
        async def request(self, *args, **kwargs):
            try:
                async with asyncio.timeout(budget["requestTimeoutSeconds"]):
                    return await super().request(*args, **kwargs)
            except Exception as error:
                # OpenAI wraps transport errors; restore Horizon's stop-without-retry signal.
                if meter.stopped or isinstance(error, (APIConnectionError, TimeoutError)):
                    meter.stop("request-timeout" if isinstance(error, TimeoutError) else "connection-error")
                    raise AIProviderUnavailableError("bounded-model-request-stopped") from None
                raise

    class StreamingCompletions:
        """Keep Horizon's complete-response interface; let the SDK own SSE parsing."""
        def __init__(self, resource):
            self.resource = resource

        async def create(self, **kwargs):
            started = time.monotonic()
            attempt = {"number": None, "stage": meter.stage, "httpStatus": None, "requestId": None,
                       "edgeTraceId": None, "headersSeconds": None, "firstChunkSeconds": None,
                       "elapsedSeconds": None, "finishReason": None, "usage": None, "outcome": "pending"}
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
                    try:
                        parsed = json.loads(message.content)
                    except (ValueError, TypeError):
                        reject("invalid-model-json")
                    if not isinstance(parsed, dict):
                        reject("invalid-model-json")
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
                    code = "provider-stream-error"
                else:
                    code = "invalid-model-stream"
                # Also prevents Horizon's repair/retry loops from reissuing a failed stream.
                reject(code)
            finally:
                attempt["elapsedSeconds"] = round(time.monotonic() - started, 3)
                if meter.failure:
                    attempt["outcome"] = meter.failure["category"]
                current_attempt.reset(token)

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
            if isinstance(error, ValueError) and str(error) in ("incomplete-score", "incomplete-selection", "over-budget-selection", "incomplete-enrichment", "incomplete-summary", "chinese-content-required"):
                code = str(error)
            meter.stop(code)
        raise StageRejected("model-stage-failed", {"stage": meter.stage, "modelCalls": meter.requests, "elapsedSeconds": round(time.monotonic() - meter.started, 2), "failure": meter.failure, "usage": asdict(get_usage_snapshot()), "usageCoverage": meter.usage_coverage(), "attempts": meter.attempts}) from None
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
    from src.ai.tokens import get_usage_snapshot
    config = read_json(HERE / "config.json")
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
        # An explicit Horizon group, including blank fields, never borrows credentials.
        fields = ("API_KEY", "BASE_URL", "MODEL")
        prefix = "HORIZON" if any(f"HORIZON_{field}" in os.environ for field in fields) else "BLOG_DRAFT_FAST"
        key, base_url, model = (os.getenv(f"{prefix}_{field}", "").strip() for field in fields)
        from urllib.parse import urlsplit
        parsed = urlsplit(base_url or "")
        if not key or not parsed.hostname or parsed.scheme != "https" or parsed.username or parsed.password or parsed.query or parsed.fragment or model != config["ai"]["model"]:
            raise ValueError("model-channel-unconfigured-or-drifted")
        os.environ["HORIZON_API_KEY"] = key
        config["ai"]["base_url"] = base_url
    with tempfile.TemporaryDirectory(prefix="biau-horizon-run-") as temporary:
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
        fetched = await service.fetch_items(hours=24, **common)
        run_id = fetched["run_id"]
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
                  "scored": 0, "selected": 0, "items": 0, "modelCalls": 0, "published": False,
                  "reportedUsage": None, "usageCoverage": {"reportedRequests": 0, "unknownRequests": 0}}
        if not raw:
            return {**result, "reason": "no-input"}
        async with guarded_client(budget, base_url) as meter:
            scored = await service.score_items(run_id, **common)
            require_scored(raw, read_json(scored["artifact"]))
            meter.stage = "filter"
            filtered = await service.filter_items(run_id, topic_dedup=False, **common)
            selected = filtered.get("kept")
            selected_items = read_json(filtered["artifact"])
            if not isinstance(selected_items, list) or type(selected) is not int or selected < 0 or selected != len(selected_items) or selected > len(raw):
                raise ValueError("incomplete-selection")
            if selected > budget["maxPublishedItems"]:
                raise ValueError("over-budget-selection")
            if selected == 0:
                return {**result, "reason": "no-qualified-items", "stage": "filter", "scored": len(raw),
                        "modelCalls": meter.requests, "reportedUsage": meter.reported_usage(), "usageCoverage": meter.usage_coverage()}
            meter.stage = "enrich"
            enriched = await service.enrich_items(run_id, **common)
            if enriched["status"] != "success" or enriched["failed"] != 0 or enriched["enriched"] != filtered["kept"]:
                raise ValueError("incomplete-enrichment")
            meter.stage = "summary"
            summary = await service.generate_summary(run_id, language="zh", source_stage="enriched", save_to_horizon_data=False, **common)
            if summary["source_stage"] != "enriched" or summary["items_used"] != filtered["kept"]:
                raise ValueError("incomplete-summary")
            items = read_json(enriched["artifact"])
            bundle = {"schemaVersion": 1, **edition, "generatedAt": stamp(datetime.fromisoformat(summary["meta"]["summary_generated_at"])),
                      "windowStart": stamp(window_start), "windowEnd": stamp(window_start + timedelta(hours=24)),
                      "markdown": Path(summary["summary_path"]).read_text(encoding="utf-8"), "sourceLinks": [public_source(i) for i in items],
                      "checks": {"fetchStatus": fetched["fetch_status"], "failedSources": fetched["fetch_report"]["failed"], "raw": len(raw), "scored": scored["scored"],
                                 "selected": filtered["kept"], "enrichmentStatus": enriched["status"], "enriched": enriched["enriched"], "failed": enriched["failed"],
                                 "summaryStage": summary["source_stage"], "language": summary["language"], "itemsUsed": summary["items_used"]},
                      "runtime": {"engineRevision": read_json(HERE / "upstream.json")["revision"], "configurationHash": configuration_hash(), "requests": meter.requests, "usage": asdict(get_usage_snapshot()), "usageCoverage": meter.usage_coverage(), "attempts": meter.attempts}}
        with output.open("x", encoding="utf-8", newline="\n") as target:
            target.write(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n")
        return {**result, "outcome": "generated", "stage": "summary", "scored": len(raw), "selected": selected,
                "items": len(items), "modelCalls": meter.requests, "reportedUsage": meter.reported_usage(), "usageCoverage": meter.usage_coverage()}


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
    parser.add_argument("--output")
    parser.add_argument("--request-limit", type=int, help="Lower the configured request cap for an authorized continuation")
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
