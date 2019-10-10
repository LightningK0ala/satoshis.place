const mongoose = require('mongoose')
const { PixelSchema } = require('./pixel')

let OrderSchema = new mongoose.Schema(
  {
    paymentRequest: String,
    sessionId: String,
    pixels: String,
    pixelsCount: Number,
    settled: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
)

// Don't define the model twice... :/
let OrderModel
try {
  OrderModel = mongoose.model('Order')
} catch (e) {
  OrderModel = mongoose.model('Order', OrderSchema)
}

module.exports = {
  OrderSchema,
  OrderModel
}
