---
id: feature-210-payment-retry-endpoint
type: feature
title: 210 payment retry endpoint
tags:
  - payments
source: null
status: active
superseded_by: null
links:
  - rule-duplicate-payment-prevention
refs: []
created: 2026-09-13
---

Added the endpoint that lets a customer retry a specific failed payment. It
reuses the stored key from the original attempt so a retried charge can
never duplicate it. See rule-duplicate-payment-prevention.
