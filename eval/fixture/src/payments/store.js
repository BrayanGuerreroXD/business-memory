const { nextPaymentId } = require('./ids')

const payments = new Map()

function createPayment({ orderId, amountCents, idempotencyKey }) {
  const id = nextPaymentId()
  const payment = {
    id,
    orderId,
    amountCents,
    idempotencyKey,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  payments.set(id, payment)
  return payment
}

function findStalePendingPayments(olderThanDays) {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
  const stale = []
  for (const payment of payments.values()) {
    if (payment.status === 'pending' && new Date(payment.createdAt).getTime() < cutoff) {
      stale.push(payment)
    }
  }
  return stale
}

module.exports = { payments, createPayment, findStalePendingPayments }
