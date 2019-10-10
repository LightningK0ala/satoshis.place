# API
It's possible to interact with the API directly using websockets (socket.io@^1.7.4).
Satoshi's Place API is available at [https://api.satoshis.place](https://api.satoshis.place).
If you're running this project locally, your api is at `http://localhost:3001`.

Here's a javascript snippet that shows you how to interact with it:

```
const io = require('socket.io-client')

const socket = io(API_URI)

// Listen for errors
socket.on('error', ({ message }) => {
  // Requests are rate limited by IP Address at 10 requests per second.
  // You might get an error returned here.
  console.log(message)
})

// Wait for connection to open before setting up event listeners
socket.on('connect', a => {
  console.log('API Socket connection established with id', socket.id)
  // Subscribe to events
  socket.on('GET_LATEST_PIXELS_RESULT', handleGetLatestPixelsResult)
  socket.on('NEW_ORDER_RESULT', handleNewOrderResult)
  socket.on('ORDER_SETTLED', handleOrderSettled)
  socket.on('GET_SETTINGS_RESULT', handleGetSettingsResult)
})

// Here's two examples on how you send a request, the response will be
// in the callbacks above.
socket.emit('GET_LATEST_PIXELS')
socket.emit('NEW_ORDER', pixelsArray)
```

There are 3 events that you can send and 4 you can listen to, we'll go over them now. All send + receive events, except for ORDER_SETTLED, are only between a single client and the server. You socket session ID is what allows the server to know who to respond to.

### Send Events

#### `GET_LATEST_PIXELS`
Request an image uri for the latest state of the board. No data needs to be sent. The response will be received in `GET_LATEST_PIXELS_RESULT`.

#### `GET_SETTINGS`
Request settings like invoice expiry, allowed colors etc. No data needs to be sent. The response will be received in `GET_SETTINGS_RESULT`.

#### `NEW_ORDER`
When you want to draw something, send a request with this event and an array of objects like:
```
[
  {
    coordinates: [0, 0],
    color: '#ffffff'
  },
  ...
]
```
where `coordinates` is the x, y position in the board (min: 0, max: 1000 for both values), and `color` is one of the allowed colors received in the settings, in web hex format. Each object represents a pixel, there's a limit to the number of pixels you can submit in each order, this is determined by the `orderPixelsLimit` value in settings.

### Receive Events

All receive events have a payload in the shape of `{ data: ..., error: ... }`, if `error` is set it will be a string with a message about an error that occured. The stuff you'll care about will be in `data`.

#### `GET_LATEST_PIXELS_RESULT`
Received after making a `GET_LATEST_PIXELS` request. Contains a base64 png image uri that represents the canvas in its current state.

#### `GET_SETTINGS_RESULT`
Received after making a `GET_SETTINGS` request. Example `data` object:
```
{
  boardLength: 1000,
  colors: ['#ffffff', '#e4e4e4', ...],
  invoiceExpiry: 600,
  orderPixelsLimit: 250000,
  pricePerPixel: 1
}
```
_Note: There are 16 colors available to use._

#### `NEW_ORDER_RESULT`
Received after making a successful order. Contains the generated lightning payment request which you will pay to finalize your drawing. Example `data`:
```
{
	data: 'lnbc110n1pdjpn47pp5up...'
}
```
#### `ORDER_SETTLED`
This event is used to notify all users that an update has occured on the board. `data` will look like this:
```
{
  image: 'data:image/png;base64,iVBOR...',
  paymentRequest: 'lnbc110n1pdjpn47pp5up...',
  pixelsPaintedCount: 29,
  sessionId: "ck0ehHuJ0Y2fLEMBAARS" // The session id of the user who just paid, this is used in lieu of a username to display in the satoshis.place hud.
}
```
	
#### `BROADCAST_STATS`
This event is used to notify all users of the latest statistics about the game. `data` will look like this:
```
{
  pixelsPerDay: 1636761,
  transactionsPerDay: 857
}
```

## Resources
- [Web-based Socket.io Debugger](http://amritb.github.io/socketio-client-tool/#url=aHR0cHM6Ly9hcGkuc2F0b3NoaXMucGxhY2U=&opt=&events=GET_LATEST_PIXELS_RESULT,GET_SETTINGS_RESULT,NEW_ORDER_RESULT,ORDER_SETTLED,BROADCAST_STATS)
