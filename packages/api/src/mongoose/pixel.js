const mongoose = require('mongoose')

const PixelSchema = new mongoose.Schema(
  {
    pixels: String,
  },
  {
    timestamps: true
  }
)

// Don't define the model twice... :/
let PixelModel
try {
  PixelModel = mongoose.model('Pixel')
} catch (e) {
  PixelModel = mongoose.model('Pixel', PixelSchema)
}

module.exports = {
  PixelSchema,
  PixelModel
}
