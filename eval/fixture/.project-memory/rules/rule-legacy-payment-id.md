---
id: rule-legacy-payment-id
type: rule
title: Legacy payment id
tags:
  - payments
  - ids
source: payments platform migration RFC, 2025-01-01
status: active
superseded_by: null
links: []
refs: []
created: 2026-09-13
---

Payment IDs are issued by the gateway as opaque UUIDs (`gw_<uuid>`).

The legacy locally-generated sequential scheme (`pay_<int>`) was retired on
2025-01-01, once the nightly reconciliation import was migrated to match on
the gateway UUID instead of the old sequential counter. No code path may
call the local generator or mint a `pay_` id.
