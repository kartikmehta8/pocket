"""Render a `purse_spend_summary` result as one line."""

import json
import sys

summary = json.load(sys.stdin)
print(
    "  spent {} {} over {} payments, source {}".format(
        summary["periodSpend"], summary["currency"], summary["paymentCount"], summary["source"]
    )
)
for anomaly in summary.get("anomalies", []):
    print("  anomaly    [{}] {}".format(anomaly["severity"], anomaly["description"]))
