const { payments } = require('./store')
const { chargeGateway } = require('./gateway')

// Retries a failed payment by re-submitting it to the gateway with the same
// idempotency key as the original attempt.
function retryPayment(paymentId) {
  const payment = payments.get(paymentId)
  if (!payment) throw new Error(`no such payment: ${paymentId}`)

  const result = chargeGateway({
    amountCents: payment.amountCents,
    idempotencyKey: payment.idempotencyKey,
  })

  payment.status = result.ok ? 'settled' : 'failed'
  return payment
}

module.exports = { retryPayment }
