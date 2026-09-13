---
id: rule-duplicate-payment-prevention
type: rule
title: Duplicate payment prevention
tags:
  - payments
  - retries
  - idempotency
source: incident review INC-2044, 2025-06-12
status: active
superseded_by: null
links:
  - dec-idempotency-at-application-layer
refs: []
created: 2026-09-13
---

Retrying a failed payment must never create a second charge for the same
order. A retry reuses the idempotency key of the original attempt; it does
not mint a new one.

See dec-idempotency-at-application-layer for where that key is enforced.
