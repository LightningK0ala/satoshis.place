const mongoose = require('mongoose')

let RateLimitSchema = new mongoose.Schema(
  {
    ip: String,
    requests: Number,
    windowStart: Date
  }
)

// Don't define the model twice... :/
let RateLimitModel
try {
  RateLimitModel = mongoose.model('RateLimit')
} catch (e) {
  RateLimitModel = mongoose.model('RateLimit', RateLimitSchema)
}

module.exports = {
  RateLimitSchema,
  RateLimitModel
}
