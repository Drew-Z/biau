"""Item isolation and local recovery using Horizon's native service and RunStore."""
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import time


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def adapter_hash():
    return hashlib.sha256(b"".join((Path(__file__).parent / name).read_bytes().replace(b"\r\n", b"\n")
                                   for name in ("run.py", "item_runs.py"))).hexdigest()


class ItemRuns:
    """Checkpoints contain source items/results, never channel config or credentials.

    The caller holds an exclusive filesystem lock for the whole execution. Native
    atomic writes own persistence; per-item runs survive aggregate stage invalidation.
    """
    def __init__(self, service, edition, configuration_hash, budget, *, channel, fetched=None, raw=None):
        self.service = service
        self.store = service.run_store
        self.run_id = "edition"
        self.budget = budget
        self.meter = None
        self.store.create_run(self.run_id)
        if fetched is not None:
            self.raw = raw
            self.store.save_items(self.run_id, "raw", raw)
            self.state = {"version": 2, "adapterHash": adapter_hash(), "configurationHash": configuration_hash, "channel": channel,
                          "edition": edition, "inputHash": fingerprint(raw), "startedAt": datetime.now(timezone.utc).isoformat(),
                          "requestLimit": budget["maxModelRequests"], "records": {"score": {}, "enrich": {}},
                          "consecutiveFailures": 0, "itemFailures": 0, "meter": None,
                          "fetched": {key: fetched[key] for key in ("fetch_status", "fetch_report", "fetched")},
                          "windowStart": fetched["meta"]["since"]}
            self.save()
        else:
            self.state = self.store.read_json(self.run_id, "adapter.json")
            self.raw = self.store.load_items(self.run_id, "raw")
            state = self.state
            now = datetime.now(timezone.utc)
            window_end = datetime.fromisoformat(state["windowStart"]) + timedelta(hours=24)
            if (state["version"] != 2 or state.get("channel") != channel or state["adapterHash"] != adapter_hash()
                    or state["configurationHash"] != configuration_hash or state["edition"] != edition
                    or state["inputHash"] != fingerprint(self.raw)
                    or not timedelta(0) <= now - window_end <= timedelta(hours=budget["checkpointMaxAgeHours"])):
                raise ValueError("checkpoint-drift-or-expired")
            # Tightening a cap is allowed. An omitted flag must not refresh the original cap.
            if type(state["requestLimit"]) is not int or state["requestLimit"] < 1:
                raise ValueError("checkpoint-budget-invalid")
            budget["maxModelRequests"] = min(budget["maxModelRequests"], state["requestLimit"])
            state["requestLimit"] = budget["maxModelRequests"]
            ledger = state["meter"]
            if ledger and (type(ledger["requests"]) is not int or ledger["requests"] != len(ledger["attempts"])
                           or [a["number"] for a in ledger["attempts"]] != list(range(1, ledger["requests"] + 1))):
                raise ValueError("checkpoint-budget-invalid")
            for stage, records in state["records"].items():
                for entry in records.values():
                    if entry["status"] == "success":
                        self.saved_item(stage, entry)

    def save(self):
        if self.meter is not None:
            meter = self.meter
            self.state["meter"] = {"requests": meter.requests, "attempts": meter.attempts,
                                   "stopped": meter.stopped, "failure": meter.failure}
        self.store.write_json(self.run_id, "adapter.json", self.state)

    def attach(self, meter):
        self.meter = meter
        saved = self.state["meter"]
        if saved:
            meter.requests, meter.attempts = saved["requests"], saved["attempts"]
            meter.stopped, meter.failure = saved["stopped"], saved["failure"]
        elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(self.state["startedAt"])).total_seconds()
        meter.started = time.monotonic() - elapsed
        meter.persist = self.save
        meter.omissions = self.omissions
        if elapsed < 0 or elapsed >= self.budget["deadlineSeconds"]:
            meter.stop("model-budget-exhausted")
        if meter.stopped:
            raise ValueError("checkpoint-stopped")
        self.save()

    def saved_item(self, stage, entry):
        items = self.store.load_items(entry["runId"], "scored" if stage == "score" else "enriched")
        if len(items) != 1 or fingerprint(items[0]) != entry["outputHash"]:
            raise ValueError("checkpoint-artifact-drift")
        return items[0]

    def failed(self, entry, failure):
        entry.update(status="failed", failure=failure)
        self.state["itemFailures"] += 1
        self.state["consecutiveFailures"] += 1
        if (self.state["consecutiveFailures"] >= self.budget["maxConsecutiveItemFailures"]
                or self.state["itemFailures"] >= self.budget["maxItemFailures"]):
            self.meter.stop("item-failure-threshold")
        self.save()
        if self.meter.stopped:
            raise ValueError("item-failure-threshold")

    async def process(self, stage, items, common, validate, throttle=0):
        from src.ai.errors import AIProviderUnavailableError
        import asyncio
        meter = self.meter
        meter.stage = stage
        records = self.state["records"][stage]
        successful = []
        for item in items:
            item_id = item["id"]
            entry = records.get(item_id)
            if entry:
                if entry["inputHash"] != fingerprint(item):
                    raise ValueError("checkpoint-input-drift")
                if entry["status"] == "success":
                    successful.append(self.saved_item(stage, entry))
                elif entry["status"] == "pending":
                    # Abrupt termination may have happened after upstream billing. Never resend.
                    self.failed(entry, {"category": "interrupted-item", "httpStatus": None})
                elif entry["status"] != "failed":
                    raise ValueError("checkpoint-record-invalid")
                continue
            if meter.requests and throttle:
                await asyncio.sleep(throttle)
            child_id = f"{stage}-{hashlib.sha256(item_id.encode()).hexdigest()}"
            self.store.create_run(child_id)
            self.store.save_items(child_id, "raw" if stage == "score" else "filtered", [item])
            entry = {"runId": child_id, "inputHash": fingerprint(item), "status": "pending"}
            records[item_id] = entry
            meter.item, meter.item_failure = item_id, None
            self.save()
            try:
                method = self.service.score_items if stage == "score" else self.service.enrich_items
                result = await method(child_id, **common)
                output = self.store.load_items(child_id, "scored" if stage == "score" else "enriched") if result.get("artifact") else []
                if not validate(item, result, output):
                    meter.fail("invalid-item-output")
                    raise AIProviderUnavailableError("item-output-incomplete")
                entry.update(status="success", outputHash=fingerprint(output[0]))
                self.state["consecutiveFailures"] = 0
                successful.append(output[0])
                self.save()
            except AIProviderUnavailableError:
                if meter.stopped or not meter.item_failure:
                    raise
                self.failed(entry, meter.item_failure)
            finally:
                meter.item, meter.item_failure = None, None
        return successful

    def omissions(self):
        return [{"stage": stage, "id": item_id, **entry["failure"]}
                for stage, records in self.state["records"].items()
                for item_id, entry in records.items() if entry["status"] == "failed"]
