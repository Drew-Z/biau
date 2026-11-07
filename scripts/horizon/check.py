"""Offline native-pipeline and bounded-transport regression checks. No network."""
import argparse
import asyncio
import contextlib
from datetime import datetime, timedelta, timezone
import io
import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
from types import SimpleNamespace
from unittest.mock import patch

from run import HERE, MAX_MODEL_RESPONSE_BYTES, SCHEDULES, RequestBudget, StageRejected, configuration_hash, execute, guarded_client, main, read_json, require_fetch, require_scored, resolve_edition, verify_upstream


def rejected(call):
    try:
        call()
    except (ValueError, KeyError, TypeError):
        return
    raise AssertionError("expected rejection")


async def check(root):
    verify_upstream(root)
    sys.path.insert(0, str(root))
    import httpx
    from src.ai.client import OpenAIClient
    from src.ai.errors import AIProviderUnavailableError
    from src.models import AIConfig, ContentItem
    from src.mcp.service import HorizonPipelineService
    from src.scrapers.base import FetchResult
    from src.scrapers.rss import RSSScraper
    # Follow the actual Actions handoff: only a generated, previewed bundle can publish.
    workflow = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import { readFileSync } from 'node:fs'; import { parse } from 'yaml'; console.log(JSON.stringify(parse(readFileSync('.github/workflows/ai-daily-horizon.yml', 'utf8'))));"], cwd=HERE.parents[1], text=True))
    assert {entry['cron'] for entry in workflow['on']['schedule']} == set(SCHEDULES)
    job = workflow['jobs']['generate']
    steps = {step['id']: step for step in job['steps'] if 'id' in step}
    assert '--github-actions' in steps['generate']['run']
    assert steps['preview']['if'] == "steps.generate.outputs.outcome == 'generated'"
    assert job['outputs']['publish'] == '${{ steps.preview.outputs.publish }}'
    assert next(step for step in job['steps'] if step.get('uses') == 'actions/upload-artifact@v4')['if'] == "steps.preview.outputs.publish == 'true'"
    assert workflow['jobs']['publish']['if'] == "needs.generate.outputs.publish == 'true' && vars.AI_DAILY_AUTOMATION_ENABLED == 'true'"

    now = datetime(2026, 11, 6, 0, 30, tzinfo=timezone.utc)
    assert resolve_edition(schedule="17 0 * * *", created_at="2026-11-06T00:17:00Z", now=now) == {"editionId": "2026-11-06-morning", "scheduledFor": "2026-11-06T00:00:00.000Z"}
    assert resolve_edition("2026-11-05-evening", now=now)["scheduledFor"] == "2026-11-05T12:00:00.000Z"
    evening_now = datetime(2026, 11, 6, 16, 1, tzinfo=timezone.utc)
    assert resolve_edition(schedule="17 12 * * *", created_at="2026-11-06T12:17:00Z", now=evening_now)["editionId"] == "2026-11-06-evening"
    rejected(lambda: resolve_edition(schedule="17 12 * * *", created_at="2026-11-05T23:55:00Z", now=now))
    rejected(lambda: resolve_edition(schedule="17 0 * * *", created_at="2026-11-06T00:17:00Z", now=now + timedelta(hours=12)))
    rejected(lambda: resolve_edition(schedule="17 0 * * *", created_at="2026-11-06T00:16:59Z", now=now))
    rejected(lambda: resolve_edition(schedule="0 0 * * *", created_at="2026-11-06T00:17:00Z", now=now))
    rejected(lambda: resolve_edition("2026-02-30-morning", now=now))
    rejected(lambda: resolve_edition("2027-01-01-morning", now=now))

    budget = read_json(HERE / "budget.json")
    meter = RequestBudget(budget)
    for _ in range(budget["maxModelRequests"]):
        meter.reserve({"messages": [], "max_tokens": 2048})
    rejected(lambda: meter.reserve({"messages": [], "max_tokens": 2048}))
    rejected(lambda: RequestBudget(budget).reserve({"messages": [{"content": "x" * 24001}], "max_tokens": 2048}))
    rejected(lambda: RequestBudget(budget).reserve({"messages": [], "max_tokens": 2049}))
    expired = RequestBudget(budget)
    expired.started -= budget["deadlineSeconds"] + 1
    rejected(lambda: expired.reserve({"messages": [], "max_tokens": 2048}))
    rejected(lambda: require_scored([{"id": "1"}], [{"id": "1", "processing": {"analysis": {"score": None}}}]))
    for status in ("failure", "partial_failure", "not_attempted"):
        rejected(lambda: require_fetch({"fetch_status": status}, [{"id": "1"}], budget))
    good_fetch = {"fetch_status": "success", "fetched": 1, "fetch_report": {"status": "success", "attempted": 1, "failed": 0, "partial_failure": 0, "sources": [{"source": "RSS Feeds", "status": "success"}]}}
    require_fetch({**good_fetch, "fetched": 0}, [], budget)
    rejected(lambda: require_fetch(good_fetch, [], budget))
    rejected(lambda: require_fetch({**good_fetch, "fetched": 21}, [{"id": str(i)} for i in range(21)], budget))

    model_requests = []
    response_streams = []
    failing = None
    score = 8

    class FixtureStream(httpx.AsyncByteStream):
        def __init__(self, frames, failure):
            self.frames = frames
            self.failure = failure
            self.closed = False

        async def __aiter__(self):
            if self.failure == "oversized-stream":
                yield b":" + b"x" * MAX_MODEL_RESPONSE_BYTES + b"\n\n"
            if self.failure == "slow-first-chunk":
                await asyncio.sleep(0.3)
            for i, frame in enumerate(self.frames):
                if i == 2 and self.failure == "stalled-stream":
                    await asyncio.sleep(0.3)
                if i == 2 and self.failure == "read-error":
                    raise httpx.ReadError("private body and endpoint")
                if i == 2 and self.failure == "cancelled":
                    raise asyncio.CancelledError()
                # Split inside UTF-8 characters and SSE delimiters, not only at events.
                for offset in range(0, len(frame), 7):
                    yield frame[offset:offset + 7]

        async def aclose(self):
            self.closed = True

    def sse(value):
        return ("data: " + json.dumps(value, ensure_ascii=False) + "\n\n").encode("utf-8")

    async def response(request):
        nonlocal failing
        model_requests.append(request)
        headers = {"x-request-id": "req_fixture0123456789", "cf-ray": "0123456789abcdef-SJC", "x-private-header": "private secret"}
        if isinstance(failing, int):
            return httpx.Response(failing, json={"error": "private response must not escape"}, headers=headers)
        if failing == "timeout":
            raise httpx.ReadTimeout("private endpoint must not escape")
        if failing == "connection":
            raise httpx.ConnectError("private endpoint must not escape")
        if failing == "slow-headers":
            await asyncio.sleep(0.3)
        body = json.loads(request.content)
        assert body["stream"] is True and body["stream_options"] == {"include_usage": True}
        if failing == "temperature-once" and "temperature" in body:
            return httpx.Response(400, json={"error": {"message": "temperature is not supported"}}, headers=headers)
        prompt = body["messages"][0]["content"]
        if 'score' in prompt and 'reason' in prompt:
            result = {"score": score, "reason": "离线评分测试样例。", "summary": "离线模型测试样例。", "tags": ["AI"]}
        else:
            result = {"title": "离线样例：模型更新", "blocks": [{"id": "summary", "type": "section", "title": "摘要", "content": "这是一条离线测试资讯，不是真实新闻。模型能力与上线情况应以原文为准。", "source_refs": []}]}
        if failing == "non-stream-response":
            return httpx.Response(200, json={"private": "not an SSE response"}, headers=headers)
        base = {"id": "fixture", "object": "chat.completion.chunk", "created": 1, "model": "fixture"}
        content = json.dumps(result, ensure_ascii=False)
        if failing == "bad-json":
            content = '{"summary":"unfinished'
        if failing == "non-object-json":
            content = '[]'
        if failing == "empty-result":
            content = ''
        chunk = {**base, "choices": [{"index": 0, "delta": {"role": "assistant", "content": content}, "finish_reason": None}]}
        reason = failing if failing in ("length", "content_filter", "tool_calls") else "stop"
        finish = {**base, "choices": [{"index": 0, "delta": {}, "finish_reason": reason}]}
        frames = [b": ping\n\n", sse(chunk), sse(finish)]
        if failing != "no-usage":
            frames.append(sse({**base, "choices": [], "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}}))
        frames.append(b"data: [DONE]\n\n")
        if failing == "no-finish":
            frames = frames[:2]
        if failing in ("sse-error", "midstream-error"):
            error_frame = sse({"error": {"message": "private upstream body", "type": "server_error", "code": "fixture"}})
            frames = [error_frame] if failing == "sse-error" else frames[:2] + [error_frame]
        if failing == "unsafe-ids":
            headers.update({"x-request-id": "sk-private-credential", "cf-ray": "https://private.example/secret"})
        stream = FixtureStream(frames, failing)
        response_streams.append(stream)
        return httpx.Response(200, headers={**headers, "content-type": "text/event-stream"}, stream=stream)

    async def fetched(_self, _since):
        return FetchResult(items=[ContentItem(id="rss-fixture", source_type="rss", title="离线样例", url="https://example.com/ai", content="离线模型新闻样例。", published_at=datetime.now(timezone.utc), profile="ai-news", metadata={"feed_name": "Fixture"})], successful=3)

    def no_network(*_args, **_kwargs):
        raise AssertionError("unexpected real network")

    with tempfile.TemporaryDirectory(prefix="biau-horizon-check-") as tmp, patch.object(socket, "getaddrinfo", no_network), patch.object(socket.socket, "connect", no_network), patch.object(RSSScraper, "fetch", fetched), patch.object(httpx, "AsyncHTTPTransport", lambda **_kwargs: httpx.MockTransport(response)), patch.dict('os.environ', {"HORIZON_GENERATION_APPROVED": "true", "HORIZON_API_KEY": "fixture-only", "HORIZON_BASE_URL": "https://fixture.example/v1", "HORIZON_MODEL": read_json(HERE / "config.json")["ai"]["model"]}):
        args = SimpleNamespace(horizon_path=str(root), operation="generate", edition_id="2026-11-05-morning", schedule=None, created_at=None, env_file=None, output=str(Path(tmp) / "bundle.json"))
        async def cli_result(expected):
            output, summary = Path(tmp) / 'actions-output', Path(tmp) / 'actions-summary'
            output.write_text('', encoding='utf-8')
            summary.write_text('', encoding='utf-8')
            argv = ['run.py', 'generate', '--horizon-path', str(root), '--edition-id', args.edition_id, '--output', args.output, '--github-actions']
            loop = asyncio.get_running_loop()
            with patch.dict('os.environ', {'GITHUB_OUTPUT': str(output), 'GITHUB_STEP_SUMMARY': str(summary)}), patch.object(sys, 'argv', argv), contextlib.redirect_stdout(io.StringIO()) as captured:
                # Reuse the loop created before network blocking; Windows loop setup uses socketpair.
                with patch.object(asyncio, 'run', lambda coro: asyncio.run_coroutine_threadsafe(coro, loop).result()):
                    code = await asyncio.to_thread(main)
            value = json.loads(captured.getvalue())
            assert code == (1 if expected == 'failed' else 0), value
            assert value['outcome'] == expected
            assert output.read_text(encoding='utf-8') == f'outcome={expected}\n'
            assert json.loads(summary.read_text(encoding='utf-8').split('```json\n')[1].split('\n```')[0]) == value
            assert 'fixture-only' not in summary.read_text(encoding='utf-8')
            return value

        result = await cli_result('generated')
        assert result["ok"] and result["published"] is False and result["items"] == 1
        assert result["reportedUsage"] == {"prompt_tokens": 200, "completion_tokens": 100, "total_tokens": 300}
        bundle = read_json(args.output)
        assert bundle["runtime"]["requests"] == 2 and len(model_requests) == 2
        assert bundle["runtime"]["configurationHash"] == configuration_hash()
        assert bundle["checks"]["summaryStage"] == "enriched"
        assert bundle["checks"]["failed"] == 0 and "example.com/ai" in bundle["markdown"]
        assert bundle["runtime"]["usageCoverage"] == {"reportedRequests": 2, "unknownRequests": 0}
        assert all(a["finishReason"] == "stop" and a["outcome"] == "complete" for a in bundle["runtime"]["attempts"])
        assert all(a["requestId"] == "req_fixture0123456789" and a["edgeTraceId"] == "0123456789abcdef-SJC" for a in bundle["runtime"]["attempts"])
        assert all(a["headersSeconds"] <= a["firstChunkSeconds"] <= a["elapsedSeconds"] for a in bundle["runtime"]["attempts"])
        assert all(stream.closed for stream in response_streams)

        # Complete collection with no items is a normal skip; no scoring or bundle.
        async def empty_fetch(_self, _since):
            return FetchResult(items=[], successful=3)

        args.output = str(Path(tmp) / 'empty-must-not-exist.json')
        before = len(model_requests)
        with patch.object(RSSScraper, 'fetch', empty_fetch):
            result = await cli_result('skipped')
        assert result['ok'] and result['outcome'] == 'skipped' and result['reason'] == 'no-input'
        assert result['stage'] == 'fetch' and result['fetched'] == result['modelCalls'] == 0
        assert len(model_requests) == before and not Path(args.output).exists()

        # A valid below-threshold score uses one request, never enriches or publishes.
        score = 2
        result = await cli_result('skipped')
        assert result['ok'] and result['outcome'] == 'skipped' and result['reason'] == 'no-qualified-items'
        assert result['stage'] == 'filter' and result['scored'] == result['fetched'] == 1 and result['selected'] == 0
        assert result['modelCalls'] == 1 and result['reportedUsage'] == {'prompt_tokens': 100, 'completion_tokens': 50, 'total_tokens': 150}
        assert result['usageCoverage'] == {'reportedRequests': 1, 'unknownRequests': 0}
        assert len(model_requests) == before + 1 and not Path(args.output).exists()
        score = 8

        # A malformed/contradictory native result is not a legitimate empty selection.
        original_filter = HorizonPipelineService.filter_items
        async def invalid_filter(self, *params, **kwargs):
            value = await original_filter(self, *params, **kwargs)
            value['kept'] = 0
            if malformed_artifact:
                Path(value['artifact']).write_text('{}', encoding='utf-8')
            return value

        for malformed_artifact in (False, True):
            before = len(model_requests)
            with patch.object(HorizonPipelineService, 'filter_items', invalid_filter):
                try:
                    await execute(args)
                except StageRejected as error:
                    assert error.diagnostics['failure']['category'] == 'incomplete-selection'
                else:
                    raise AssertionError('invalid selection was treated as a normal skip')
            assert len(model_requests) == before + 1 and not Path(args.output).exists()

        async def failed_empty_fetch(_self, _since):
            return FetchResult(items=[], successful=2, failures={'OpenAI News': 'HTTPStatusError: 503 private response'})

        async def oversized_fetch(self, since):
            item = (await fetched(self, since)).items[0]
            return FetchResult(items=[ContentItem.model_validate({**item.model_dump(), 'id': f'fixture-{i}', 'url': f'https://example.com/{i}'}) for i in range(21)], successful=3)

        for fetcher, code in ((failed_empty_fetch, 'incomplete-fetch'), (oversized_fetch, 'over-budget-input')):
            before = len(model_requests)
            with patch.object(RSSScraper, 'fetch', fetcher):
                result = await cli_result('failed')
                assert result['error'] == code and result['diagnostics']['modelCalls'] == 0
            assert len(model_requests) == before and not Path(args.output).exists()

        args.output = str(Path(tmp) / "budget-must-not-exist.json")
        args.request_limit = 1
        requests_before_failure = len(model_requests)
        try:
            await execute(args)
        except StageRejected as error:
            assert error.diagnostics["modelCalls"] == 1
            assert error.diagnostics["stage"] == "enrich"
            assert error.diagnostics["failure"]["category"] == "model-budget-exhausted"
        else:
            raise AssertionError("lower request cap was ignored")
        assert len(model_requests) == requests_before_failure + 1 and not Path(args.output).exists()
        args.request_limit = None

        async def partial_fetch(self, since):
            result = await fetched(self, since)
            result.failures['OpenAI News'] = 'HTTPStatusError: 503 private response must not escape'
            return result

        args.output = str(Path(tmp) / "must-not-exist.json")
        requests_before_failure = len(model_requests)
        # Explicit empty or partial Horizon settings cannot borrow a valid fast channel.
        for key in ("HORIZON_API_KEY", "HORIZON_BASE_URL", "HORIZON_MODEL"):
            with patch.dict('os.environ', {key: "", "BLOG_DRAFT_FAST_API_KEY": "fixture-fast", "BLOG_DRAFT_FAST_BASE_URL": "https://other.example/v1", "BLOG_DRAFT_FAST_MODEL": read_json(HERE / "config.json")["ai"]["model"]}), patch.object(RSSScraper, "fetch", no_network):
                try:
                    await execute(args)
                except ValueError as error:
                    assert str(error) == "model-channel-unconfigured-or-drifted"
                else:
                    raise AssertionError("empty Horizon setting borrowed a fast field")
            assert not Path(args.output).exists() and len(model_requests) == requests_before_failure

        with patch.object(RSSScraper, "fetch", partial_fetch):
            try:
                await execute(args)
            except StageRejected as error:
                assert error.diagnostics["modelCalls"] == 0
                assert error.diagnostics["failures"] == [{"source": "OpenAI News", "category": "HTTPStatusError", "httpStatus": 503}]
                assert 'private response' not in json.dumps(error.diagnostics)
            else:
                raise AssertionError("partial fetch did not stop")
        assert not Path(args.output).exists() and len(model_requests) == requests_before_failure

        # A failure at the transport boundary must escape native retry loops immediately.
        failing = 429
        async with guarded_client(budget, "https://fixture.example/v1") as meter:
            client = OpenAIClient(AIConfig(provider="openai", model="fixture", api_key_env="HORIZON_API_KEY", base_url="https://fixture.example/v1", max_tokens=2048))
            try:
                await client.complete(system="fixture", user="fixture")
            except AIProviderUnavailableError:
                pass
            else:
                raise AssertionError("429 did not stop")
            assert meter.requests == 1 and meter.stopped
            try:
                await client.complete(system="fixture", user="fixture")
            except AIProviderUnavailableError:
                pass
            assert meter.requests == 1

        # Native retry loops must preserve exact safe diagnostics without a draft.
        for failing in (401, 429, 503, 524, "connection", "timeout"):
            requests_before_failure = len(model_requests)
            try:
                await execute(args)
            except StageRejected as error:
                assert error.diagnostics["stage"] == "score"
                assert error.diagnostics["modelCalls"] == 1
                expected_category = "provider-edge-timeout" if failing == 524 else "provider-http-error" if isinstance(failing, int) else "request-timeout" if failing == "timeout" else "transport-error"
                assert error.diagnostics["failure"] == {"category": expected_category, "httpStatus": failing if isinstance(failing, int) else None}
                assert error.diagnostics["usageCoverage"] == {"reportedRequests": 0, "unknownRequests": 1}
                assert 'private' not in json.dumps(error.diagnostics)
            else:
                raise AssertionError("provider failure did not stop native pipeline")
            assert len(model_requests) == requests_before_failure + 1 and not Path(args.output).exists()

        # Completed JSON without a terminal chunk, 200 stream errors and malformed output
        # must stop the native pipeline after ONE request, never reach its repair loops.
        for failing, expected in [("no-finish", "incomplete-model-stream"), ("length", "incomplete-model-stream"),
                                  ("content_filter", "incomplete-model-stream"), ("tool_calls", "incomplete-model-stream"),
                                  ("sse-error", "provider-stream-error"), ("midstream-error", "provider-stream-error"),
                                  ("bad-json", "invalid-model-json"), ("non-object-json", "invalid-model-json"),
                                  ("empty-result", "invalid-model-result"), ("read-error", "transport-error"),
                                  ("non-stream-response", "unexpected-model-content-type"),
                                  ("oversized-stream", "model-response-too-large"),
                                  ("cancelled", "run-cancelled-or-deadline")]:
            before = len(model_requests)
            try:
                await execute(args)
            except StageRejected as error:
                assert error.diagnostics["failure"]["category"] == expected, (failing, error.diagnostics)
                assert error.diagnostics["modelCalls"] == 1
                assert error.diagnostics["attempts"][0]["httpStatus"] == 200
                assert 'private' not in json.dumps(error.diagnostics)
            else:
                raise AssertionError(f"{failing} did not stop")
            assert len(model_requests) == before + 1 and not Path(args.output).exists()
            assert all(stream.closed for stream in response_streams)

        # The deadline must include waiting for headers, the first chunk and later chunks.
        for failing in ("slow-headers", "slow-first-chunk", "stalled-stream"):
            before = len(model_requests)
            try:
                async with guarded_client({**budget, "requestTimeoutSeconds": 0.05}, "https://fixture.example/v1"):
                    client = OpenAIClient(AIConfig(provider="openai", model="fixture", api_key_env="HORIZON_API_KEY", base_url="https://fixture.example/v1", max_tokens=2048))
                    await client.complete(system="fixture", user="fixture")
            except StageRejected as error:
                assert error.diagnostics["failure"]["category"] == "request-timeout", error.diagnostics
                assert error.diagnostics["modelCalls"] == 1
            else:
                raise AssertionError(f"{failing} escaped total deadline")
            assert len(model_requests) == before + 1 and all(stream.closed for stream in response_streams)

        for failing in ("no-usage", "unsafe-ids", "temperature-once"):
            args.output = str(Path(tmp) / f"{failing}.json")
            before = len(model_requests)
            result = await execute(args)
            assert result["ok"] and result["outcome"] == 'generated'
            runtime = read_json(args.output)["runtime"]
            # Scoring and enrichment each construct their own native provider client.
            expected_requests = 4 if failing == "temperature-once" else 2
            assert len(model_requests) == before + expected_requests == before + runtime["requests"]
            if failing == "no-usage":
                assert result['reportedUsage'] is None and result['usageCoverage']['unknownRequests'] == 2
                assert runtime["usageCoverage"] == {"reportedRequests": 0, "unknownRequests": 2}
                assert all(a["usage"] is None for a in runtime["attempts"])
            if failing == "unsafe-ids":
                assert all(a["requestId"] is None and a["edgeTraceId"] is None for a in runtime["attempts"])
            if failing == "temperature-once":
                assert runtime["attempts"][0]["outcome"] == "parameter-rejected"
            assert 'private' not in json.dumps(runtime)
            assert all(stream.closed for stream in response_streams)

    print(json.dumps({"ok": True, "nativePipeline": "passed", "realNetworkRequests": 0, "modelCalls": 0, "configurationHash": configuration_hash()}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--horizon-path", required=True)
    args = parser.parse_args()
    asyncio.run(check(Path(args.horizon_path).resolve()))
