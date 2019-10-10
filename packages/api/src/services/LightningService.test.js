/* global test expect beforeAll */
const LightningService = require('./LightningService')

/**
|--------------------------------------------------
| Setup
|--------------------------------------------------
*/
beforeAll(() => LightningService.init())

/**
|--------------------------------------------------
| Tests
|--------------------------------------------------
*/
test.skip('Create a new invoice', async done => {
  // Create a new invoice
  const paymentRequest = await LightningService.newInvoice(100, { pricePerPixel: 1, invoiceExpiry: 600 })
  // Verify the payment request was returned
  expect(paymentRequest).toContain(`lnt`)
  done()
})
