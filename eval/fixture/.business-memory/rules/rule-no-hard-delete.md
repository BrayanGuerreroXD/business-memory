---
id: rule-no-hard-delete
type: rule
title: No hard delete
tags:
  - payments
  - retention
  - audit
source: finance audit requirements, SOC2 control PM-14, 2025-11-03
status: active
superseded_by: null
links: []
refs: []
created: 2026-09-13
---

Payment records are never physically deleted from storage.

A payment that must be taken out of active view is marked `status: voided`
with a `voidedAt` timestamp; the row stays in the table for audit and
reconciliation. This applies to cleanup jobs and admin tooling exactly the
same as it applies to a customer-facing cancellation.
