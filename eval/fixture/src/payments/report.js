const { payments } = require('./store')

function sumSettled() {
  let total = 0
  for (const payment of payments.values()) {
    if (payment.status === 'settled') total += payment.amountCents
  }
  return total
}

function sumPending() {
  let total = 0
  for (const payment of payments.values()) {
    if (payment.status === 'pending') total += payment.amountCents
  }
  return total
}

function sumVoided() {
  let total = 0
  for (const payment of payments.values()) {
    if (payment.status === 'voided') total += payment.amountCents
  }
  return total
}

module.exports = { sumSettled, sumPending, sumVoided }
