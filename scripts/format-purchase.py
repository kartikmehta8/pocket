"""Render one `purse_pay_for_resource` result as a few readable lines.

Every outcome gets the same treatment. A refusal is not an error to be dumped
as raw JSON — it is the product working, and it should read as clearly as a
success does.
"""

import json
import sys


def summarise(payload):
    """Yield the lines describing one purchase outcome."""
    status = payload.get("status")

    if status == "paid":
        payment = payload["payment"]
        body = payload.get("result", {})
        inner = body.get("result", body)
        yield "  PAID       {} {}".format(payment["amount"], payment["asset"])
        yield "  data       {}".format(json.dumps(inner)[:96])
        yield "  tx         {}".format(payment["txHash"])
        yield "  explorer   {}".format(payment["explorerUrl"])
        return

    if status == "free":
        yield "  FREE       the seller charged nothing"
        return

    if status == "blocked":
        decision = payload.get("decision", {})
        violations = decision.get("violations") or []
        reasons = decision.get("approvalReasons") or []
        headroom = decision.get("headroom", {})

        if violations:
            yield "  BLOCKED    {}".format(violations[0]["code"])
            yield "  reason     {}".format(violations[0]["message"])
        elif reasons:
            # Not a refusal: policy wants a person to release it, and nothing
            # was signed while it waits.
            yield "  HELD       awaiting human approval"
            yield "  reason     {}".format(reasons[0])
        else:
            yield "  BLOCKED    no reason given"

        yield "  headroom   task {} / daily {}".format(
            headroom.get("taskRemaining"), headroom.get("dailyRemaining")
        )
        return

    if status == "failed":
        yield "  FAILED     {}".format(payload.get("code", "UNKNOWN"))
        yield "  reason     {}".format(payload.get("message", ""))
        return

    error = payload.get("error")
    if error:
        yield "  ERROR      {}".format(error.get("code", "UNKNOWN"))
        yield "  reason     {}".format(error.get("message", ""))
        return

    yield "  " + json.dumps(payload)[:300]


for line in summarise(json.load(sys.stdin)):
    print(line)
