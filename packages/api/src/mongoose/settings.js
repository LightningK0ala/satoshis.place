const mongoose = require('mongoose')

const SettingsSchema = new mongoose.Schema(
  {
    pricePerPixel: { type: Number, default: 1 },
    invoiceExpiry: { type: Number, default: 600 },
    orderPixelsLimit: { type: Number, default: 250000 }
  },
  {
    timestamps: true
  }
)

// Don't define the model twice... :/
let SettingsModel
try {
  SettingsModel = mongoose.model('Settings')
} catch (e) {
  SettingsModel = mongoose.model('Settings', SettingsSchema)
}

module.exports = {
  SettingsSchema,
  SettingsModel
}
