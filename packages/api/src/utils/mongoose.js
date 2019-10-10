const mongoose = require('mongoose')
const log = require('loglevel')

let db

module.exports = {
  connectToMongo: async () => {
    try {
      const m = await mongoose.connect(process.env.MONGO_DB_URI, {})
      db = m.connection.db
      return db
    } catch (e) {
      log.error('Mongodb connection failed', e)
    }
  },
  db: () => db
}
