/* global test expect */
const listen = require('test-listen')
const request = require('request-promise')
const ServerService = require('./ServerService')

test('my endpoint', async done => {
  const url = await listen(ServerService)
  const body = await request(url)
  expect(body).toBe('Visit https://satoshis.place')
  done()
})
