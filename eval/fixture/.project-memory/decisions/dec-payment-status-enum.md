---
id: dec-payment-status-enum
type: decision
title: Payment status enum
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

Payment status is a closed enum: pending, settled, voided, failed. Adding a
new state requires updating the reconciliation import and is a decision, not
an ad hoc string introduced in application code.
