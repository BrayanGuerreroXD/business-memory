---
id: flow-payment-retry
type: flow
title: Payment retry
tags:
  - payments
  - retries
source: null
status: active
superseded_by: null
links:
  - rule-duplicate-payment-prevention
  - dec-idempotency-at-application-layer
refs: []
created: 2026-09-13
---

A customer-facing retry is triggered from the failed-payment banner. The
client calls the retry endpoint for a specific payment id. The server loads
the original payment, looks up its stored key, and resubmits to the gateway
using that same key.

On success the original payment row is updated in place; a new row is only
created if the resubmitted amount differs from the original attempt.
