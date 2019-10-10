const ServerService = require('./services/ServerService')
const { SettingsModel } = require('./mongoose/settings')
const AppService = require('./services/AppService')
const { connectToMongo } = require('./utils/mongoose')
const log = require('loglevel')

// Log level
log.setDefaultLevel(process.env.LOG_LEVEL || 'debug')

// Run Server
const port = process.env.PORT || 3000
ServerService.listen(port, async () => {
  // Connect to mongodb
  await connectToMongo()
  // Setup AppService
  await AppService.init(ServerService)
  // Ready!
  log.info(`Listening on *:${port} 🙉`)
  /**
  |--------------------------------------------------
  | For Debugging: Reset board and settings
  |--------------------------------------------------
  */
  // AppService.initEmptyPixels()
  // const settings = new SettingsModel()
  // await settings.save()
})
