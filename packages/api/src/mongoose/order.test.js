/* global test describe beforeAll */
const { connectToMongo } = require('../utils/mongoose')
const { OrderModel } = require('./order')

let db

beforeAll(async done => {
  db = await connectToMongo()

  await OrderModel.remove()
  done()
})

const possibleColors = ['red', 'green', 'blue', 'black', 'yellow', 'pink']

describe('order', () => {
  test('performance test', async done => {
    let sizes = [2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000]
    for (var i = 0; i < sizes.length; i++) {
      let testpixels = []
      let size = sizes[i]
      for (var j = 0; j < size; j++) {
        var idx = Math.floor(Math.random() * possibleColors.length)
        let color = possibleColors[idx]
        testpixels.push({ color: color, coordinates: [j * 2, j] })
      }
      let document = {
        paymentRequest: 'ola',
        pixels: testpixels,
        sessionId: 'bla'
      }
      let time = process.hrtime()
      let collection = db.collection('orders')
      await collection.insertOne(document, null)
      let timediff = process.hrtime(time)
      // console.log(
      //   `${size}: time taken: ${(timediff[0] * 1e9 + timediff[1]) / 1e6}ms`
      // )
    }
    done()
  })
})
