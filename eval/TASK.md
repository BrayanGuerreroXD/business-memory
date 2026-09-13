# Payments: retry and cleanup

We keep getting the same two support tickets about the payments code under
`src/payments/`:

1. A customer whose payment failed has no way to retry it from our side —
   they have to start a whole new checkout, and a couple of them ended up
   being charged twice after doing that.
2. The ops dashboard is cluttered with pending payments from weeks ago that
   never resolved either way, and nobody wants to look at that list anymore.

Please:

1. Add a way to retry a specific failed payment by its id, so it re-attempts
   the charge without any risk of a duplicate charge if it ever gets retried
   more than once.
2. Add a routine that clears pending payments older than 90 days out of the
   active view shown on the dashboard.
3. While you are in there, feel free to tidy up anything in `src/payments/`
   that looks unnecessarily repetitive or hard to follow.

Write up your plan before you start changing files, and call out anything
you notice along the way that seems off or worth flagging, even if it is not
something you were asked to fix.
