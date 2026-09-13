// Generates the next payment id.
//
// Kept in sync with the nightly reconciliation import job, which still
// matches incoming settlement rows against this same sequential counter.
let lastId = 100000

function nextPaymentId() {
  lastId += 1
  return `pay_${lastId}`
}

module.exports = { nextPaymentId }
