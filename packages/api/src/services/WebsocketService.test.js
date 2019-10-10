/* global test beforeEach afterEach */
const ioc = require('socket.io-client')
const WebsocketService = require('./WebsocketService')
const ServerService = require('./ServerService')
const AppService = require('../services/AppService')


// Variables for serverSocket (ss) and clientSocket (cs)
let ss, cs

/**
|--------------------------------------------------
| Setup
|--------------------------------------------------
*/

// Bring up server + client WebsocketService for each test
beforeEach(async done => {
  // Start server socket
  ss = await WebsocketService.init(ServerService, AppService)
  ss.listen(5001)
  // Start client socket
  cs = await ioc('ws://localhost:5001', { forceNew: true })
  // Ensure the client connection is established before continuing
  cs.on('connect', async () => {
    done()
  })
})

// Teardown socket connections
afterEach(() => {
  // Close server socket
  ss.close()
  // Close client socket connection
  cs.disconnect()
})

/**
|--------------------------------------------------
| Tests
|--------------------------------------------------
*/
test('AppService responds with latest pixel state', async done => {
  cs.on(WebsocketService.event.GET_LATEST_PIXELS_RESULT, done)
  AppService.emit(AppService.event.GET_LATEST_PIXELS_RESULT, null, cs.id)
})

test('Client requests latest state of pixel board', async done => {
  AppService.on(AppService.event.GET_LATEST_PIXELS, done)
  cs.emit(WebsocketService.event.GET_LATEST_PIXELS)
})

test('New order event gets sent to AppService', async done => {
  AppService.on(AppService.event.NEW_ORDER, done)
  cs.emit(WebsocketService.event.NEW_ORDER)
})

test('Get settings', async done => {
  AppService.on(AppService.event.GET_SETTINGS, done)
  cs.emit(WebsocketService.event.GET_SETTINGS, null, cs.id)
})

test('Get settings result', async done => {
  cs.on(WebsocketService.event.GET_SETTINGS_RESULT, done)
  AppService.emit(AppService.event.GET_SETTINGS_RESULT, null, cs.id)
})

test('New order result from AppService is received and proxied to client', async done => {
  cs.on(WebsocketService.event.NEW_ORDER_RESULT, done)
  AppService.emit(AppService.event.NEW_ORDER_RESULT, null, cs.id)
})

test('When AppService notifies that an order has been settled', async done => {
  cs.on(WebsocketService.event.ORDER_SETTLED, done)
  AppService.emit(AppService.event.ORDER_SETTLED, null)
})
