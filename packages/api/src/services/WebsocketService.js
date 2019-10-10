/**
 * WebsocketService
 * Implements the websocket interface for communication between the clients
 * and the rest of the application through the AppService events.
 * This is kept purposely as a thin layer / proxy so that the bulk of the
 * application logic is handled by AppService.
 * Later on, things like authenticating and rate limiting can live here.
 */
const socket = require('socket.io')
const log = require('loglevel')
const { RateLimitModel } = require('../mongoose/rate-limit')
const { db } = require('../utils/mongoose')

const EVENTS = {

  /**
  |--------------------------------------------------
  | Receiving
  |--------------------------------------------------
  */
  // Client sends a new order
  NEW_ORDER: 'NEW_ORDER',
  NEW_ORDER_RESULT: 'NEW_ORDER_RESULT',
  // Client requests latest pixel state
  GET_LATEST_PIXELS: 'GET_LATEST_PIXELS',
  // Client requests config
  GET_SETTINGS: 'GET_SETTINGS',

  /**
  |--------------------------------------------------
  | Sending
  |--------------------------------------------------
  */
  // Client requests latest pixel state
  GET_LATEST_PIXELS_RESULT: 'GET_LATEST_PIXELS_RESULT',
  // An order has been settled (payment received)
  ORDER_SETTLED: 'ORDER_SETTLED',
  // Config request result
  GET_SETTINGS_RESULT: 'GET_SETTINGS_RESULT',
  // Broadcast stats that have been updated by the Appservice
  BROADCAST_STATS: 'BROADCAST_STATS'
}

module.exports = {
  /**
   * Initializes the socket.io service and sets up listeners
   * @param {*} server The express server instance
   * @returns Instance of socket io
   */
  init: async (server, AppService) => {
    const sio = socket(server, {
      pingInterval: 40000,
      pingTimeout: 25000,
      // Use this to limit the request size of the websocket requests.
      // This limits the requests roughly to a payload 250px x 250px.
      maxHttpBufferSize: 5e6
    })
    /**
    |--------------------------------------------------
    | AppService events
    |--------------------------------------------------
    */
    AppService.on(AppService.event.NEW_ORDER_RESULT, (data, sid) => {
      sio.to(sid).emit(EVENTS.NEW_ORDER_RESULT, data)
    })
    AppService.on(AppService.event.GET_LATEST_PIXELS_RESULT, (data, sid) => {
      sio.to(sid).emit(EVENTS.GET_LATEST_PIXELS_RESULT, data)
    })
    AppService.on(AppService.event.ORDER_SETTLED, (data) => {
      log.info('Websocket Emitting ORDER_SETTLED')
      sio.emit(EVENTS.ORDER_SETTLED, data)
    })
    AppService.on(AppService.event.GET_SETTINGS_RESULT, (data, sid) => {
      sio.to(sid).emit(EVENTS.GET_SETTINGS_RESULT, data)
    })
    AppService.on(AppService.event.STATS_UPDATED, (data) => {
      sio.emit(EVENTS.BROADCAST_STATS, data)
    })

    sio.on('connection', socket => {
      /**
      |--------------------------------------------------
      | Socket Middleware
      |--------------------------------------------------
      */
      socket.use(maintenanceGuard(socket))
      socket.use(rateLimit(socket))
      /**
      |--------------------------------------------------
      | Socket events
      |--------------------------------------------------
      */
      socket.on(EVENTS.NEW_ORDER, data => {
        AppService.emit(AppService.event.NEW_ORDER, data, socket.id)
      })
      socket.on(EVENTS.GET_LATEST_PIXELS, () => {
        AppService.emit(AppService.event.GET_LATEST_PIXELS, null, socket.id)
      })
      socket.on(EVENTS.GET_SETTINGS, () => {
        AppService.emit(AppService.event.GET_SETTINGS, null, socket.id)
      })
    })
    return sio
  },
  /*
   * Export the WebsocketService events
   */
  event: EVENTS
}

const maintenanceGuard = socket => {
  return async (packet, next) => {
    if (process.env.MAINTENANCE === 'yes') {
      next(new Error('Application undergoing maintenance, please try again later.'))
    } else {
      next()
    }
  }
}

/**
 * Verifies that all incoming requests are rate limited to
 * 10 requests per minute
 */
const rateLimit = socket => {
  const RATE_LIMIT_WINDOW = 60
  const RATE_LIMIT_REQUESTS = 20

  return async (packet, next) => {
    const { remoteAddress } = socket.request.connection
    log.info('User connected', socket.id, 'with IP:', remoteAddress)
    log.info('Checking rate limit...')
    if (process.env.SKIP_RATE_LIMIT === 'yes') {
      log.info('Skipping rate limit check')
      next()
    } else {
      // Look for an access log from this IP Address
      const al = await RateLimitModel.findOne({ ip: remoteAddress })
      if (!al) {
        log.info('No rate limit record found')
        const newRateLimit = new RateLimitModel({
          ip: remoteAddress,
          requests: 1,
          windowStart: new Date()
        })
        await newRateLimit.save()
        log.info('Created rate limit record for', remoteAddress)
        next()
      } else {
        // Calculate 15 minute rate limit time window
        const rateWindow = new Date()
        rateWindow.setSeconds(rateWindow.getSeconds() - RATE_LIMIT_WINDOW)
        if (al.windowStart < rateWindow) {
          // windowStart is older than 15 minutes, reset it & proceed
          log.info('Resetting user rate limit windowStart')
          al.requests = 1
          al.windowStart = new Date()
          await al.save()
          next()
        } else {
          // windowStart is NOT older, check number of requests
          if (al.requests < RATE_LIMIT_REQUESTS) {
            log.info('Incrementing user rate limit requests')
            al.requests++
            await al.save()
            next()
          } else {
            log.info('Rate limit exceeded for user', remoteAddress, 'BLOCKED')
            next(new Error('Rate limit exceeded'))
          }
        }
      }
    }
  }
}