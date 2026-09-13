---
id: dec-idempotency-at-application-layer
type: decision
title: Idempotency at application layer
tags:
  - payments
  - architecture
source: payments architecture review, 2025-05-30
status: active
superseded_by: null
links: []
refs: []
created: 2026-09-13
---

Deduplication for a re-submitted charge is enforced by our own
`idempotency_keys` table, not delegated to the gateway's built-in
idempotency header.

The gateway only holds a key for 24 hours. Our policy lets a customer come
back for up to 30 days after the first attempt, so gateway-side dedup alone
would let a late second attempt through as a separate charge.
