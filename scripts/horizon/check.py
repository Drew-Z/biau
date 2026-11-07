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
from uuid import uuid4

from run import HERE, MAX_MODEL_RESPONSE_BYTES, SCHEDULES, RequestBudget, StageRejected, configuration_hash, execute as execute_run, guarded_client, main, read_json, require_fetch, require_scored, resolve_channel, resolve_edition, system_proxy, verify_upstream


async def execute(args):
    # Every independent fixture is a new run; recovery fixtures call execute_run explicitly.
    return await execute_run(SimpleNamespace(**{**vars(args), "checkpoint": str(Path(args.output).parent / uuid4().hex)}))


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
    assert 'collect' in workflow['on']['workflow_dispatch']['inputs']['operation']['options']
    assert steps['collect']['if'] == "github.event_name == 'workflow_dispatch' && inputs.operation == 'collect'"
    assert set(steps['collect']['env']) == {'EDITION_ID'} and 'run.py collect' in steps['collect']['run']
    assert steps['slot']['if'] == "github.event_name == 'schedule' || inputs.operation == 'generate'"
    assert '--github-actions' in steps['generate']['run']
    assert '--request-limit' in steps['generate']['run']
    assert steps['generate']['env']['REQUEST_LIMIT'] == '${{ inputs.request_limit }}'
    assert steps['generate']['env']['HORIZON_CHANNEL'] == "${{ vars.HORIZON_CHANNEL || '2' }}"
    assert steps['generate']['env']['HORIZON_API_KEY2'] == '${{ secrets.HORIZON_API_KEY2 }}'
    assert steps['generate']['env']['HORIZON_BASE_URL2'] == '${{ secrets.HORIZON_BASE_URL2 }}'
    assert steps['generate']['env']['HORIZON_MODEL2'] == '${{ vars.HORIZON_MODEL2 }}'
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

    config = read_json(HERE / 'config.json')
    channels = {'HORIZON_BASE_URL': 'https://old.example/v1', 'HORIZON_API_KEY': 'old-only', 'HORIZON_MODEL': config['adapter']['channelModels']['1'],
                'HORIZON_BASE_URL2': 'https://new.example/v1', 'HORIZON_API_KEY2': 'new-only', 'HORIZON_MODEL2': config['ai']['model']}
    with patch.dict('os.environ', channels, clear=True):
        identity, endpoint, key_env = resolve_channel(config)
        assert identity['id'] == '2' and endpoint == channels['HORIZON_BASE_URL2'] and key_env == 'HORIZON_API_KEY2'
        assert 'new.example' not in json.dumps(identity) and 'new-only' not in json.dumps(identity)
        assert resolve_channel(config, '1')[1:] == (channels['HORIZON_BASE_URL'], 'HORIZON_API_KEY')
        for field in ('HORIZON_API_KEY2', 'HORIZON_BASE_URL2', 'HORIZON_MODEL2'):
            with patch.dict('os.environ', {field: ''}):
                rejected(lambda: resolve_channel(config))
                assert resolve_channel(config, '1')[0]['id'] == '1'
        with patch.dict('os.environ', {'HORIZON_CHANNEL': '1'}):
            assert resolve_channel(config)[0]['id'] == '1'
            assert resolve_channel(config, '2')[0]['id'] == '2'
        for invalid in ('', '3', 'fast'):
            with patch.dict('os.environ', {'HORIZON_CHANNEL': invalid}):
                rejected(lambda: resolve_channel(config))
    fast = {key.replace('HORIZON_', 'BLOG_DRAFT_FAST_'): value for key, value in channels.items() if not key.endswith('2')}
    fast['BLOG_DRAFT_FAST_MODEL'] = config['ai']['model']
    with patch.dict('os.environ', fast, clear=True):
        assert resolve_channel(config)[0]['id'] == 'fast'
        rejected(lambda: resolve_channel(config, '1'))
    with patch('urllib.request.getproxies', return_value={'https': '127.0.0.1:9876'}), patch('urllib.request.proxy_bypass', return_value=False):
        assert system_proxy('https://fixture.example/v1') == 'http://127.0.0.1:9876'
    with patch('urllib.request.getproxies', return_value={}), patch('urllib.request.proxy_bypass', return_value=False):
        rejected(lambda: system_proxy('https://fixture.example/v1'))
    with patch('urllib.request.proxy_bypass', return_value=True):
        assert system_proxy('https://fixture.example/v1') is None

    model_requests = []
    response_streams = []
    failing = None
    failure_plan = []
    rate_fault = 'unknown'
    score = 8
    fetch_count = 1

    class FixtureStream(httpx.AsyncByteStream):
        def __init__(self, frames, failure):
            self.frames = frames
            self.failure = failure
            self.closed = False

        async def __aiter__(self):
            if self.failure == "slow-rate-body":
                await asyncio.sleep(1.1)
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
        fault = failure_plan.pop(0) if failure_plan else failing
        model_requests.append(request)
        headers = {"x-request-id": "req_fixture0123456789", "cf-ray": "0123456789abcdef-SJC", "x-private-header": "private secret"}
        if fault == 429 and rate_fault != 'unknown':
            if rate_fault == 'slow-rate-body':
                stream = FixtureStream([b'{}'], rate_fault)
                response_streams.append(stream)
                return httpx.Response(429, stream=stream, headers=headers)
            return httpx.Response(429, json={'error': {'code': rate_fault, 'message': 'private response must not escape'}}, headers={**headers, 'retry-after': '30' if rate_fault != 'private-value' else 'private-value'})
        if isinstance(fault, int):
            return httpx.Response(fault, json={"error": "private response must not escape"}, headers=headers)
        if fault == "timeout":
            raise httpx.ReadTimeout("private endpoint must not escape")
        if fault == "connection":
            raise httpx.ConnectError("private endpoint must not escape")
        if fault == "slow-headers":
            await asyncio.sleep(0.3)
        body = json.loads(request.content)
        assert body["stream"] is True and body["stream_options"] == {"include_usage": True}
        if fault == "temperature-once" and "temperature" in body:
            return httpx.Response(400, json={"error": {"message": "temperature is not supported"}}, headers=headers)
        prompt = body["messages"][0]["content"]
        if 'score' in prompt and 'reason' in prompt:
            result = {"score": score, "reason": "离线评分测试样例。", "summary": "离线模型测试样例。", "tags": ["AI"]}
        else:
            result = {"title": "离线样例：模型更新", "blocks": [{"id": "summary", "type": "section", "title": "摘要", "content": "这是一条离线测试资讯，不是真实新闻。模型能力与上线情况应以原文为准。", "source_refs": []}]}
        if fault == "invalid-schema":
            result = {"unexpected": "valid JSON without required fields"}
        if fault == "non-stream-response":
            return httpx.Response(200, json={"private": "not an SSE response"}, headers=headers)
        base = {"id": "fixture", "object": "chat.completion.chunk", "created": 1, "model": "fixture"}
        content = json.dumps(result, ensure_ascii=False)
        if fault == "bad-json":
            content = '{"summary":"unfinished'
        if fault == "non-object-json":
            content = '[]'
        if fault == "empty-result":
            content = ''
        if fault in ("fenced-json", "fenced-no-language"):
            content = '```' + ('json' if fault == 'fenced-json' else '') + '\n' + content + '\n```'
        if fault == "fenced-bad-json":
            content = '```json\n{"summary":"unfinished\n```'
        if fault == "fenced-array":
            content = '```json\n[]\n```'
        if fault == "prose-json":
            content = 'Here is the result:\n```json\n' + content + '\n```'
        if fault == "unclosed-fence":
            content = '```json\n' + content
        chunk = {**base, "choices": [{"index": 0, "delta": {"role": "assistant", "content": content}, "finish_reason": None}]}
        reason = fault if fault in ("length", "content_filter", "tool_calls") else "stop"
        finish = {**base, "choices": [{"index": 0, "delta": {}, "finish_reason": reason}]}
        frames = [b": ping\n\n", sse(chunk), sse(finish)]
        if fault != "no-usage":
            frames.append(sse({**base, "choices": [], "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}}))
        frames.append(b"data: [DONE]\n\n")
        if fault == "no-finish":
            frames = frames[:2]
        if fault in ("sse-error", "midstream-error", "insufficient_quota", "rate_limit_exceeded", "invalid_api_key", "permission_denied"):
            error_frame = sse({"error": {"message": "private upstream body", "type": "server_error", "code": fault}})
            frames = frames[:2] + [error_frame] if fault == "midstream-error" else [error_frame]
        if fault == "unsafe-ids":
            headers.update({"x-request-id": "sk-private-credential", "cf-ray": "https://private.example/secret"})
        stream = FixtureStream(frames, fault)
        response_streams.append(stream)
        return httpx.Response(200, headers={**headers, "content-type": "text/event-stream"}, stream=stream)

    async def fetched(_self, _since):
        return FetchResult(items=[ContentItem(id=f"rss-fixture-{i}", source_type="rss", title=f"离线样例 {i}", url=f"https://example.com/ai/{i}", content="离线模型新闻样例。", published_at=datetime.now(timezone.utc), profile="ai-news", metadata={"feed_name": "MIT Technology Review AI"}) for i in range(fetch_count)], successful=7)

    def no_network(*_args, **_kwargs):
        raise AssertionError("unexpected real network")

    # Observe item-stage pacing without sleeping in this offline suite. Transport
    # timeout fixtures retain real asyncio.sleep calls.
    from item_runs import ItemRuns
    original_process = ItemRuns.process
    throttle_calls = []
    async def process_without_wait(self, stage, items, common, validate, throttle=0):
        throttle_calls.append((stage, throttle))
        return await original_process(self, stage, items, common, validate, 0)

    with tempfile.TemporaryDirectory(prefix="biau-horizon-check-") as tmp, patch.object(socket, "getaddrinfo", no_network), patch.object(socket.socket, "connect", no_network), patch.object(RSSScraper, "fetch", fetched), patch.object(httpx, "AsyncHTTPTransport", lambda **_kwargs: httpx.MockTransport(response)), patch.object(ItemRuns, 'process', process_without_wait), patch.dict('os.environ', {"HORIZON_GENERATION_APPROVED": "true", "HORIZON_API_KEY": "fixture-only", "HORIZON_BASE_URL": "https://fixture.example/v1", "HORIZON_MODEL": read_json(HERE / "config.json")["adapter"]["channelModels"]["1"]}):
        args = SimpleNamespace(horizon_path=str(root), operation="generate", edition_id="2026-11-05-morning", schedule=None, created_at=None, env_file=None, output=str(Path(tmp) / "bundle.json"))
        # Collect works with no model credentials, preserves media attribution and never publishes.
        args.operation = 'collect'
        with patch.dict('os.environ', {'HORIZON_GENERATION_APPROVED': '', 'HORIZON_API_KEY': '', 'HORIZON_BASE_URL': '', 'HORIZON_MODEL': ''}), patch.object(OpenAIClient, 'complete', no_network):
            collected = await execute(args)
        assert collected['ok'] and collected['operation'] == 'collect' and collected['fetched'] == 1
        assert collected['modelCalls'] == 0 and not model_requests and not Path(args.output).exists()
        assert len(collected['sourceCounts']) == 7
        assert next(row for row in collected['sourceCounts'] if row['publisher'] == 'MIT Technology Review AI')['items'] == 1
        assert collected['sources'][0]['publisher'] == 'MIT Technology Review AI'
        assert collected['sources'][0]['contentChars'] == len('离线模型新闻样例。') and collected['sources'][0]['publishedAt']
        assert all(key not in collected['sources'][0] for key in ('content', 'body', 'processing'))
        assert collected['configurationHash'] == configuration_hash()
        args.operation = 'generate'
        # The native SDK must receive the selected group's key without overwriting channel 1.
        import os
        with patch.dict('os.environ', {'HORIZON_API_KEY2': 'fixture-channel-two', 'HORIZON_BASE_URL2': 'https://second.example/v1', 'HORIZON_MODEL2': config['ai']['model']}):
            args.output = str(Path(tmp) / 'channel-two.json')
            value = await execute(args)
            assert value['outcome'] == 'generated'
            assert all(request.url.host == 'second.example' and request.headers['authorization'] == 'Bearer fixture-channel-two' for request in model_requests[-2:])
            assert os.environ['HORIZON_API_KEY'] == 'fixture-only'
        model_requests.clear()
        args.output = str(Path(tmp) / 'bundle.json')
        async def cli_result(expected):
            output, summary = Path(tmp) / 'actions-output', Path(tmp) / 'actions-summary'
            output.write_text('', encoding='utf-8')
            summary.write_text('', encoding='utf-8')
            argv = ['run.py', 'generate', '--horizon-path', str(root), '--edition-id', args.edition_id, '--output', args.output, '--checkpoint', str(Path(tmp) / uuid4().hex), '--github-actions']
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
        assert throttle_calls[-2:] == [('score', config['ai']['throttle_sec']), ('enrich', config['ai']['throttle_sec'])]
        assert bundle["runtime"]["configurationHash"] == configuration_hash()
        assert bundle["checks"]["summaryStage"] == "enriched"
        assert bundle["checks"]["failed"] == 0 and "example.com/ai" in bundle["markdown"]
        assert bundle["sourceLinks"][0]["publisher"] == 'MIT Technology Review AI'
        assert bundle["runtime"]["usageCoverage"] == {"reportedRequests": 2, "unknownRequests": 0}
        assert all(a["finishReason"] == "stop" and a["outcome"] == "complete" for a in bundle["runtime"]["attempts"])
        assert all(a["requestId"] == "req_fixture0123456789" and a["edgeTraceId"] == "0123456789abcdef-SJC" for a in bundle["runtime"]["attempts"])
        assert all(a["headersSeconds"] <= a["firstChunkSeconds"] <= a["elapsedSeconds"] for a in bundle["runtime"]["attempts"])
        assert all(stream.closed for stream in response_streams)

        # Complete collection with no items is a normal skip; no scoring or bundle.
        async def empty_fetch(_self, _since):
            return FetchResult(items=[], successful=7)

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
            return FetchResult(items=[], successful=6, failures={'OpenAI News': 'HTTPStatusError: 503 private response'})

        async def oversized_fetch(self, since):
            item = (await fetched(self, since)).items[0]
            return FetchResult(items=[ContentItem.model_validate({**item.model_dump(), 'id': f'fixture-{i}', 'url': f'https://example.com/{i}'}) for i in range(21)], successful=7)

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
        for rate_fault, expected in [('rate_limit_exceeded', 'rate-limit'), ('insufficient_quota', 'quota'), ('private-value', 'unknown'), ('slow-rate-body', 'unknown')]:
            failing = 429
            try:
                async with guarded_client(budget, 'https://fixture.example/v1'):
                    client = OpenAIClient(AIConfig(provider='openai', model='fixture', api_key_env='HORIZON_API_KEY', base_url='https://fixture.example/v1', max_tokens=2048))
                    await client.complete(system='fixture', user='fixture')
            except StageRejected as error:
                attempt = error.diagnostics['attempts'][0]
                assert attempt['limitKind'] == expected and error.diagnostics['modelCalls'] == 1
                assert attempt['retryAfterSeconds'] == (None if rate_fault in ('private-value', 'slow-rate-body') else 30)
                assert error.diagnostics['failure'] == {'category': 'provider-http-error', 'httpStatus': 429}
                assert 'private' not in json.dumps(error.diagnostics)
            else:
                raise AssertionError('429 did not stop')
        rate_fault = 'unknown'
        for failing in (401, 402, 403, 404, 429, 503, 524, "connection", "timeout"):
            requests_before_failure = len(model_requests)
            try:
                async with guarded_client(budget, "https://fixture.example/v1"):
                    client = OpenAIClient(AIConfig(provider="openai", model="fixture", api_key_env="HORIZON_API_KEY", base_url="https://fixture.example/v1", max_tokens=2048))
                    await client.complete(system="fixture", user="fixture")
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
                                  ("fenced-bad-json", "invalid-model-json"), ("fenced-array", "invalid-model-json"),
                                  ("prose-json", "invalid-model-json"), ("unclosed-fence", "invalid-model-json"),
                                  ("empty-result", "invalid-model-result"), ("read-error", "transport-error"),
                                  ("non-stream-response", "unexpected-model-content-type"),
                                  ("oversized-stream", "model-response-too-large"),
                                  ("cancelled", "run-cancelled-or-deadline")]:
            before = len(model_requests)
            try:
                async with guarded_client(budget, "https://fixture.example/v1"):
                    client = OpenAIClient(AIConfig(provider="openai", model="fixture", api_key_env="HORIZON_API_KEY", base_url="https://fixture.example/v1", max_tokens=2048))
                    await client.complete(system="fixture", user="fixture")
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

        for failing in ("no-usage", "unsafe-ids", "temperature-once", "fenced-json", "fenced-no-language"):
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
            if failing in ("fenced-json", "fenced-no-language"):
                assert all(a['jsonFormat'] == 'fenced-object' for a in runtime['attempts'])
            assert 'private' not in json.dumps(runtime)
            assert all(stream.closed for stream in response_streams)

        # Exercise the actual native pipeline with a failure at each scoring position.
        failing = None
        fetch_count = 3
        for position in range(3):
            args.output = str(Path(tmp) / f'isolate-score-{position}.json')
            failure_plan[:] = [None] * position + [524] + [None] * (2 - position)
            before = len(model_requests)
            value = await execute(args)
            bundle = read_json(args.output)
            assert value['outcome'] == 'generated' and value['scored'] == value['items'] == 2
            assert value['scoreFailed'] == 1 and value['modelCalls'] == 5
            assert len(model_requests) == before + 5 and not failure_plan
            assert bundle['checks']['raw'] == 3 and bundle['checks']['scored'] == 2
            assert bundle['runtime']['omissions'] == [{'stage': 'score', 'id': f'rss-fixture-{position}', 'category': 'provider-edge-timeout', 'httpStatus': 524}]
            assert f'https://example.com/ai/{position}' not in bundle['markdown']
            assert all(item['id'] != f'rss-fixture-{position}' for item in bundle['runtime']['items'])

        # Enrichment errors also exclude the item, without borrowing its filtered summary.
        for position in range(3):
            args.output = str(Path(tmp) / f'isolate-enrich-{position}.json')
            failure_plan[:] = [None] * (3 + position) + [524] + [None] * (2 - position)
            before = len(model_requests)
            value = await execute(args)
            bundle = read_json(args.output)
            omitted = bundle['runtime']['omissions'][0]
            assert value['items'] == 2 and value['enrichmentFailed'] == 1 and value['modelCalls'] == 6
            assert len(model_requests) == before + 6 and omitted['stage'] == 'enrich'
            assert omitted['id'] not in {item['id'] for item in bundle['runtime']['items']}
            assert bundle['checks']['enrichmentStatus'] == 'partial'
            omitted_url = 'https://example.com/ai/' + omitted['id'].rsplit('-', 1)[1]
            assert omitted_url not in bundle['markdown']

        # Schema repair is intercepted before another potentially billed request.
        args.output = str(Path(tmp) / 'invalid-schema-isolated.json')
        failure_plan[:] = ['invalid-schema', None, None]
        before = len(model_requests)
        value = await execute(args)
        assert value['items'] == 2 and value['modelCalls'] == 5 and len(model_requests) == before + 5
        assert value['omissions'][0]['category'] == 'invalid-item-output'

        # Hard errors and consecutive/cumulative failure thresholds stop later items.
        for failures, count, category in [([None, code], 2, 'provider-http-error') for code in (401, 402, 403, 404, 429, 'insufficient_quota', 'rate_limit_exceeded', 'invalid_api_key', 'permission_denied')] + [
            ([524, 524], 2, 'item-failure-threshold'),
            ([524, None, 524, None, 524], 5, 'item-failure-threshold'),
        ]:
            fetch_count = 5
            args.output = str(Path(tmp) / f'stopped-{uuid4().hex}.json')
            args.checkpoint = str(Path(tmp) / uuid4().hex)
            failure_plan[:] = failures
            before = len(model_requests)
            try:
                await execute_run(args)
            except StageRejected as error:
                assert error.diagnostics['failure']['category'] == category, error.diagnostics
                assert error.diagnostics['modelCalls'] == count
            else:
                raise AssertionError('run-wide failure did not stop')
            assert len(model_requests) == before + count and not Path(args.output).exists()
            assert read_json(Path(args.checkpoint) / 'edition/adapter.json')['meter']['stopped'] is True
            args.resume = True
            try:
                await execute_run(args)
            except StageRejected:
                pass
            else:
                raise AssertionError('stopped checkpoint resumed requests')
            assert len(model_requests) == before + count
            args.resume = False

        # All failures / no completed summary keep the previous public edition.
        fetch_count = 1
        for failures in ([524], [None, 524]):
            args.output = str(Path(tmp) / f'empty-completion-{uuid4().hex}.json')
            failure_plan[:] = failures
            before = len(model_requests)
            value = await execute(args)
            assert value['outcome'] == 'skipped' and value['reason'] == 'no-complete-items'
            assert len(model_requests) == before + len(failures) and not Path(args.output).exists()

        # Simulate abrupt process loss after the second paid response but before recording
        # its item result. Resume must use frozen sources and never repeat either request.
        class ProcessLost(BaseException):
            pass

        original_score = HorizonPipelineService.score_items
        scored_calls = 0
        async def process_lost(self, *params, **kwargs):
            nonlocal scored_calls
            result = await original_score(self, *params, **kwargs)
            scored_calls += 1
            if scored_calls == 2:
                raise ProcessLost()
            return result

        fetch_count = 3
        args.output = str(Path(tmp) / 'resumed.json')
        args.checkpoint = str(Path(tmp) / 'recoverable')
        args.request_limit = 5
        before = len(model_requests)
        with patch.object(HorizonPipelineService, 'score_items', process_lost):
            try:
                await execute_run(args)
            except ProcessLost:
                pass
            else:
                raise AssertionError('fixture did not interrupt')
        assert len(model_requests) == before + 2
        args.resume = True
        args.request_limit = None  # Must inherit the five-request cap, not the default sixty.
        with patch.object(RSSScraper, 'fetch', no_network):
            value = await execute_run(args)
        assert value['outcome'] == 'generated' and value['modelCalls'] == 5 and value['items'] == 2
        assert len(model_requests) == before + 5 and value['omissions'][0]['category'] == 'interrupted-item'
        checkpoint = Path(args.checkpoint) / 'edition'
        saved = read_json(checkpoint / 'adapter.json')
        assert saved['requestLimit'] == 5 and saved['meter']['requests'] == 5

        # Repackaging a complete checkpoint does not call a model or re-fetch sources.
        args.output = str(Path(tmp) / 'repackaged.json')
        with patch.object(RSSScraper, 'fetch', no_network):
            value = await execute_run(args)
        assert value['modelCalls'] == 5 and len(model_requests) == before + 5
        args.output = str(Path(tmp) / 'drift-must-not-exist.json')
        # Same model and inputs cannot resume through a different endpoint or channel group.
        for changes in ({'HORIZON_BASE_URL': 'https://changed.example/v1'},
                        {'HORIZON_BASE_URL2': 'https://fixture.example/v1', 'HORIZON_API_KEY2': 'fixture-only', 'HORIZON_MODEL2': config['ai']['model']}):
            with patch.dict('os.environ', changes), patch.object(RSSScraper, 'fetch', no_network):
                try:
                    await execute_run(args)
                except ValueError as error:
                    assert str(error) == 'checkpoint-drift-or-expired'
                else:
                    raise AssertionError('checkpoint channel drift accepted')
            assert len(model_requests) == before + 5 and not Path(args.output).exists()
        raw_path = checkpoint / 'raw_items.json'
        saved_raw = raw_path.read_text(encoding='utf-8')
        raw = json.loads(saved_raw)
        raw[0]['content'] = 'Changed frozen source'
        raw_path.write_text(json.dumps(raw), encoding='utf-8')
        try:
            await execute_run(args)
        except ValueError as error:
            assert str(error) == 'checkpoint-drift-or-expired'
        else:
            raise AssertionError('changed inputs accepted')
        raw_path.write_text(saved_raw, encoding='utf-8')
        saved['configurationHash'] = '0' * 64
        (checkpoint / 'adapter.json').write_text(json.dumps(saved), encoding='utf-8')
        try:
            await execute_run(args)
        except ValueError as error:
            assert str(error) == 'checkpoint-drift-or-expired'
        else:
            raise AssertionError('changed configuration accepted')
        assert len(model_requests) == before + 5 and not Path(args.output).exists()
        args.resume = False

        # Recovery rejects changed successful artifacts and expired frozen windows.
        from item_runs import ItemRuns
        saved['configurationHash'] = configuration_hash()
        (checkpoint / 'adapter.json').write_text(json.dumps(saved), encoding='utf-8')
        args.resume = True
        success = next(entry for entry in saved['records']['score'].values() if entry['status'] == 'success')
        artifact_path = Path(args.checkpoint) / success['runId'] / 'scored_items.json'
        original_artifact = artifact_path.read_text(encoding='utf-8')
        broken = json.loads(original_artifact)
        broken[0]['processing']['analysis']['score'] = 0
        artifact_path.write_text(json.dumps(broken), encoding='utf-8')
        try:
            await execute_run(args)
        except ValueError as error:
            assert str(error) == 'checkpoint-artifact-drift'
        else:
            raise AssertionError('changed successful artifact accepted')
        artifact_path.write_text(original_artifact, encoding='utf-8')
        saved['windowStart'] = (datetime.now(timezone.utc) - timedelta(hours=37)).isoformat()
        (checkpoint / 'adapter.json').write_text(json.dumps(saved), encoding='utf-8')
        try:
            await execute_run(args)
        except ValueError as error:
            assert str(error) == 'checkpoint-drift-or-expired'
        else:
            raise AssertionError('expired checkpoint accepted')
        assert len(model_requests) == before + 5
        args.resume = False

        # A saved success cannot reset a reduced request cap on continuation.
        async def lost_after_success(self, stage, *params, **kwargs):
            value = await original_process(self, stage, *params, **kwargs)
            if stage == 'score':
                raise ProcessLost()
            return value

        fetch_count = 1
        args.output = str(Path(tmp) / 'resume-budget.json')
        args.checkpoint = str(Path(tmp) / 'resume-budget')
        args.request_limit = 1
        before = len(model_requests)
        with patch.object(ItemRuns, 'process', lost_after_success):
            try:
                await execute_run(args)
            except ProcessLost:
                pass
        assert len(model_requests) == before + 1
        args.resume, args.request_limit = True, None
        try:
            await execute_run(args)
        except StageRejected as error:
            assert error.diagnostics['failure']['category'] == 'model-budget-exhausted'
            assert error.diagnostics['modelCalls'] == 1
        else:
            raise AssertionError('resume reset budget')
        assert len(model_requests) == before + 1 and not Path(args.output).exists()

    print(json.dumps({"ok": True, "nativePipeline": "passed", "realNetworkRequests": 0, "modelCalls": 0, "configurationHash": configuration_hash()}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--horizon-path", required=True)
    args = parser.parse_args()
    asyncio.run(check(Path(args.horizon_path).resolve()))
