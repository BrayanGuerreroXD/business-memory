// Minimal stand-in for the real payment gateway client.
function chargeGateway({ amountCents, idempotencyKey }) {
  if (!idempotencyKey) throw new Error('idempotencyKey is required')
  return { ok: true, amountCents, idempotencyKey }
}

module.exports = { chargeGateway }
