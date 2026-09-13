---
id: dec-currency-is-minor-units
type: decision
title: Currency is minor units
tags:
  - payments
  - data-model
source: payments platform migration RFC, 2025-01-01
status: active
superseded_by: null
links: []
refs: []
created: 2026-09-13
---

All monetary amounts are stored and compared as integers in minor units
(cents). Floating point amounts must never be written to the payments
table.
