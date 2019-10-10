/* global test expect describe beforeEach afterEach beforeAll jasmine */
const AppService = require('./AppService')
const { connectToMongo } = require('../utils/mongoose')
const { OrderModel } = require('../mongoose/order')
const ServerService = require('./ServerService')
const faker = require('faker')
// const log = require('loglevel')

jasmine.DEFAULT_TIMEOUT_INTERVAL = 50000

// log.setDefaultLevel('debug')

// For Debugging
// const log = require('loglevel')
// log.setDefaultLevel('info')

const SAMPLE_ORDER = [
  { coordinates: [0, 0], color: '#333333' },
  { coordinates: [1, 0], color: '#333334' }
]
const SAMPLE_BOARD_LENGTH = 10

/**
|--------------------------------------------------
| Setup
|--------------------------------------------------
*/

// Clear collections from db
beforeAll(async done => {
  // Connect to mongodb
  await connectToMongo()
  // Remove all Order records
  await OrderModel.remove()
  // Initialize board with clean pixels
  await AppService.initEmptyPixels(SAMPLE_BOARD_LENGTH)
  done()
})

// Make sure that listeners don't interfere with cross tests
beforeEach(() => { AppService.init(ServerService) })
afterEach(() => { AppService.disconnectListeners() })

/**
|--------------------------------------------------
| Tests
|--------------------------------------------------
*/
describe('AppService', () => {
  test('Invalid new order returns object with error', async done => {
    AppService.on(AppService.event.NEW_ORDER_RESULT, data => {
      expect(data.error).toBeTruthy()
      done()
    })
    AppService.emit(AppService.event.NEW_ORDER, [])
  })

  test(`GET_LATEST_PIXELS_RESULT event`, async done => {
    AppService.on(AppService.event.GET_LATEST_PIXELS_RESULT, async ({ data }) => {
      expect(data).toContain('base64')
      done()
    })
    AppService.emit(AppService.event.GET_LATEST_PIXELS)
  })

  test('Get board configuration', async done => {
    AppService.on(AppService.event.GET_SETTINGS_RESULT, ({ data }) => {
      expect(data.pricePerPixel).toBeTruthy()
      done()
    })
    AppService.emit(AppService.event.GET_SETTINGS)
  })

  test(`New invoice -> Payment received -> Pixels updated`, async done => {
    const SAMPLE_PAYMENT_REQUEST = faker.random.uuid()
    // Listen for the NEW_ORDER_RESULT event
    AppService.on(AppService.event.NEW_ORDER_RESULT, async ({ data }) => {
      AppService.on(AppService.event.ORDER_SETTLED, async ({ data }) => {
        // Verify order was added to db
        const order = await OrderModel.findOne({ paymentRequest })
        // Check order record has correct fields:
        // settled, paymentRequest and pixels
        expect(order.settled).toBe(true)
        done()
      })
      const { paymentRequest } = data
      // Check that the payment request is passed
      expect(paymentRequest).toBe(SAMPLE_PAYMENT_REQUEST)
      // Verify order was added to db
      const order = await OrderModel.findOne({ paymentRequest })
      // Check order record has correct fields:
      // settled, paymentRequest and pixels
      // expect(order.settled).toBe(false)
      expect(order.paymentRequest).toBe(paymentRequest)
      expect(order.pixels.length).toBe(SAMPLE_ORDER.length)
      // Simulate the payment received for this payment request
      AppService.emit(AppService.event.PAYMENT_RECEIVED, paymentRequest)
    })
    // Trigger the NEW_INVOICE_RESULT event
    AppService.emit(
      AppService.event.NEW_INVOICE_RESULT,
      { paymentRequest: SAMPLE_PAYMENT_REQUEST, data: SAMPLE_ORDER }
    )
  })
})
