/** global performance */
import Browser from 'bowser';
import fetch from 'isomorphic-unfetch';
import random from 'just-random';
import remove from 'just-remove';
import get from 'just-safe-get';
import { toJS } from 'mobx';
import { applySnapshot, types } from 'mobx-state-tree';
import numeral from 'numeral';
import io from 'socket.io-client';
import color from 'tinycolor2';
import { modalContentTypes } from '../components/Modal';
import config from '../config';

// Load these only on the client-side
let Pixi = process.browser ? require('pixi.js') : {}
let Viewport = process.browser ? require('pixi-viewport') : {}

/**
|--------------------------------------------------
| Constants
|--------------------------------------------------
*/
const CURSOR_PENCIL_ICON = 'url(static/pencil.png) 0 20, auto'
const CURSOR_ERASER_ICON = 'url(static/eraser.png) 0 13, auto'
const ZOOM_IN_BY_PERCENT = 0.8
const ZOOM_OUT_BY_PERCENT = 0.5
const MESSAGE_DECAY_TIME = 5000 // Time until hud messages expire
const HUD_MESSAGE_COLOR_GENERAL_ORDER_SETTLED = '#e6d84e'
const HUD_MESSAGE_COLOR_OWN_ORDER_SETTLED = '#a3dc67'
const HUD_MESSAGE_COLOR_ERROR = '#d4361e'

// Switch between test / production API accordingly
const API_URI = process.env.API_URI || 'http://localhost:3001'

/**
|--------------------------------------------------
| Module scope variables
|--------------------------------------------------
*/
let store = null
let PixiApp,
  viewport,
  stage,
  renderer,
  baseBorderGraphic,
  baseBorderContainer,
  baseContainer,
  drawContainer,
  hoverContainer,
  socket,
  baseSprite,
  hoverGraphic,
  clientWidthHeight,
  domRef,
  lastDrawnPoint
let paintedPixels = {}
let paintedPixelsCount = 0
let paintedGraphics = {}
let colorSprites = []
let nextPixelX = 0
let nextPixelY = 0

/**
|--------------------------------------------------
| Geometric functions
|--------------------------------------------------
*/
const xSlope = (a, b) => {
  if (a.x === b.x) {
    return null
  }
  return (b.y - a.y) / (b.x - a.x)
}

const ySlope = (a, b) => {
  if (a.y === b.y) {
    return null
  }
  return (b.x - a.x) / (b.y - a.y)
}

const yIntercept = (point, slope) => {
  if (slope === null) {
    // Horizontal line
    return point.y
  }
  return point.x - slope * point.y
}

const xIntercept = (point, slope) => {
  if (slope === null) {
    // Vertical line
    return point.x
  }
  return point.y - slope * point.x
}

const EVENTS = {
  /**
  |--------------------------------------------------
  | Receiving
  |--------------------------------------------------
  */
  NEW_ORDER: 'NEW_ORDER',
  NEW_ORDER_RESULT: 'NEW_ORDER_RESULT',
  GET_LATEST_PIXELS: 'GET_LATEST_PIXELS',
  ORDER_SETTLED: 'ORDER_SETTLED',
  GET_SETTINGS_RESULT: 'GET_SETTINGS_RESULT',
  BROADCAST_STATS: 'BROADCAST_STATS',
  /**
  |--------------------------------------------------
  | Sending
  |--------------------------------------------------
  */
  GET_LATEST_PIXELS_RESULT: 'GET_LATEST_PIXELS_RESULT',
  GET_SETTINGS: 'GET_SETTINGS'
}

/**
 * For thick brushes
 * Sizes [0, 1, 2, ...] map to square length [1, 3, 5, 7]
 */
const getThickBrushCoordinates = (size = 0, originCoords, pixelSize) => {
  let result = []
  if (size === 0) {
    return [
      {
        coordsToDraw: denormalizeCoords(originCoords, pixelSize),
        coordsStr: getCoordinatesStr(originCoords)
      }
    ]
  }
  const startingPoint = { x: originCoords.x - size, y: originCoords.y - size }
  // Run through
  let y = 0
  let x = 0
  const squareLength = (size * 2) + 1
  while (y < squareLength) {
    const coords = { x: startingPoint.x + x, y: startingPoint.y + y }
    const coordsToDraw = denormalizeCoords(coords, pixelSize)
    const coordsStr = getCoordinatesStr(coords)
    result.push({ coordsToDraw, coordsStr })
    x++
    // Overflow and break when finished
    if (x === squareLength) {
      x = 0
      y++
    }
  }
  return result
}

/**
 * Parses an object of { '0, 1': #ABC, '0, 2': #ABC } into an array
 * like [{ coordinates: [0, 1], color: '#ABC' }, ...]
 * @param {Array} pixels The array of Pixel objects
 */
const pixelsToArray = pixels => {
  const result = []
  Object.keys(pixels).map(p => {
    const coordinates = p.split(',')
    result.push({ coordinates, color: pixels[p] })
  })
  return result
}

/**
 * Return a coordinate string to be used in the paintedPixels object
 */
const getCoordinatesStr = coords => `${coords.x},${coords.y}`

/**
 * Denormalize coordinates to pixel size
 */
const denormalizeCoords = (coords, pixelSize) => ({
  x: coords.x * pixelSize,
  y: coords.y * pixelSize
})

const isAlreadyPaintedWithCurrentColor = (coordsStr, color) =>
  paintedPixels[coordsStr] &&
  color !== paintedPixels[coordsStr]

/**
 * Handles painting a pixel on the draw container.
 * This is the bit where the user paints over existing pixels to make a
 * drawing he will submit.
 * NOTE: This is not done as part of a mobx action because of performance delays
 */
const paintPixel = (coordsToDraw, coordsStr, color, size, isPreviewModeOn) => {
  // Check if a pixel has already been drawn in this location
  // if the colors don't match destroy the graphic
  // MAYBE THIS CAN RE-USE erasePixel IF A skipCount IS ADDED?
  if (isAlreadyPaintedWithCurrentColor(coordsStr, color)) {
    paintedGraphics[coordsStr].destroy()
    delete paintedGraphics[coordsStr]
  }
  // Create new graphics instance
  const graphics = new Pixi.Graphics()
  // Set color and draw rectangle
  graphics.beginFill(`0x${color}`)
  graphics.drawRect(
    coordsToDraw.x,
    coordsToDraw.y,
    size,
    size
  )
  graphics.endFill()
  // Keep a record of the pixels we've painted
  paintedPixels[coordsStr] = `#${color}`
  paintedGraphics[coordsStr] = graphics
  // Add to draw container
  drawContainer.addChild(graphics)
  // Only this is observable
  paintedPixelsCount = Object.keys(paintedPixels).length
  // Darken the base sprite
  if (isPreviewModeOn) {
    baseSprite.tint = 0x333333
  }
}

/**
 * CURSOR MODES
 */
export const CURSOR_MODES = {
  DRAW: 'DRAW',
  DRAG: 'DRAG',
  ERASE: 'ERASE'
}

/**
 * HudMessage Model
 */
const HudMessage = types.model({
  message: types.string,
  color: types.string
})

/**
 * Settings Model
 */
const Settings = types.model({
  invoiceExpiry: types.number,
  orderPixelsLimit: types.number,
  pricePerPixel: types.number,
  colors: types.array(types.string),
  boardLength: types.number
})

/**
 * Settings Model
 */
const Stats = types.model({
  pixelsPerDay: types.union(types.number, types.string),
  transactionsPerDay: types.union(types.number, types.string)
  // usersOnline: types.number
})

/**
 * Main Store Model
 */
const Store = types
  /**
   * Model Properties
   */
  .model({
    isInitialized: types.boolean,
    mouseDown: types.boolean,
    cursorMode: types.enumeration('CursorMode', Object.keys(CURSOR_MODES)),
    pixelSize: types.number,
    paintColor: types.maybe(types.string),
    paintedPixelsCount: types.number,
    isModalOpen: types.boolean,
    cursorCoordinates: types.string,
    paymentRequests: types.array(types.string),
    currentPaymentRequest: types.maybe(types.string),
    bitcoinPrice: types.maybe(types.number),
    hudMessages: types.array(HudMessage),
    errorMessage: types.maybe(types.string),
    isFirstLoadComplete: types.boolean,
    isPreviewModeOn: types.boolean,
    activeModalType: types.maybe(types.string),
    settings: Settings,
    stats: Stats,
    brushSize: types.number
  })
  /**
   * Views
   */
  .views(self => ({
    /**
     * Calculates the drawing price in dollars
     */
    get priceInDollars () {
      return self.priceInSatoshis && self.bitcoinPrice
        ? numeral(self.priceInSatoshis)
          .multiply(self.bitcoinPrice)
          .divide(100000000)
          .format('$0.00000')
        : null
    },
    /**
     * Calculates the drawing price in satoshis according to painted pixels
     * and pricePerPixel from settings
     */
    get priceInSatoshis () {
      const pricePerPixel = get(self, 'settings.pricePerPixel')
      return self.paintedPixelsCount * (pricePerPixel || 1)
    },
    get isDrawMode () {
      return self.cursorMode === CURSOR_MODES.DRAW
    },
    get isDragMode () {
      return self.cursorMode === CURSOR_MODES.DRAG
    },
    get isEraseMode () {
      return self.cursorMode === CURSOR_MODES.ERASE
    },
    /**
     * Access the module paintedPixels variable
     */
    get paintedPixels () {
      return paintedPixels
    },
    /**
     * Zoom by a certain amount
     */
    get zoomBy () {
      return self.boardLength * 0.4
    },
    /**
     * Calculate board length in pixels
     */
    get boardLength () {
      return self.settings.boardLength * self.pixelSize
    },
    /**
     * Calculate board area in pixels
     */
    get boardArea () {
      return self.boardLength * self.boardLength
    },
    /**
     * Build mock pixels array
     */
    get MOCK_PIXELS () {
      const arr = []
      const n = self.settings.boardLength * self.settings.boardLength
      if (process.browser) {
        const t0 = performance.now()
        // Statically generate 2 arrays
        for (let index = 0; index < n; index++) {
          arr.push({ color: 'ffffff' })
        }
        const t1 = performance.now()
        console.log('Built mock pixels in', t1 - t0, 'ms')
      }
      return arr
    }
  }))
  .actions(self => ({
    /**
     * Adds hud message
     */
    addErrorMessage: message => {
      self.errorMessage = message
      // Start a timer to remove from array
      setTimeout(() => self.errorMessage = null, MESSAGE_DECAY_TIME)
    },
    /**
     * Removes oldest hud message (first in array)
     */
    removeOldestErrorMessage: () => {
      self.errorMessages.shift()
    },
    /**
     * Adds hud message
     */
    addHudMessage: data => {
      self.hudMessages.push({ message: data.message, color: data.color })
      // Start a timer to remove from array
      setTimeout(() => self.removeOldestHudMessage(), MESSAGE_DECAY_TIME)
    },
    /**
     * Removes oldest hud message (first in array)
     */
    removeOldestHudMessage: () => {
      self.hudMessages.shift()
    },
    /**
     * Init price feed
     */
    initPriceFeed: () => {
      // Update the price feed once
      self.updatePriceFeed()
      // Setup price feed interval
      setInterval(
        self.updatePriceFeed,
        // Coinmarketcap feed updates every 5 minutes
        300000
      )
    },
    /**
     * Retrieves and updates bitcoin price from coinmarketcap feed
     */
    updatePriceFeed: () => {
      fetch('https://api.coinmarketcap.com/v2/ticker/1/?convert=USD')
        .then(r => r.json())
        .then(({ data }) => {
          const price = get(data, 'quotes.USD.price')
          console.log('Bitcoin price updated to', price, 'USD')
          self.setBitcoinPrice(price)
        })
    },
    getInvoiceExpiry: () => {
      return get(self, 'settings.invoiceExpiry') / 60
    },
    /**
     * Action to set the bitcoinPrice
     */
    setBitcoinPrice: value => {
      self.bitcoinPrice = value
    },
    setActiveModalType: type => { self.activeModalType = type },
    openModal: type => {
      // Remove all event listeners on document, i.e. keydown + wheel
      self.removeDocumentListeners()
      // This prevents a bug with modal being unscrollable when drag tool is
      if (self.cursorMode === CURSOR_MODES.DRAG) {
        viewport && viewport.pausePlugin('drag')
      }
      // selected
      self.activeModalType = type
      self.isModalOpen = true
    },
    /**
     * Close Modal
     */
    closeModal: () => {
      // Re-add all event listeners on document, i.e. keydown + wheel
      self.addDocumentListeners()
      self.isModalOpen = false
      // Clear the currentPaymentRequest we are tracking
      self.currentPaymentRequest = null
      // Check if the cursor mode is set to drag, we will enable the drag plugin
      // if so. This is because there is a bug with the plugin and the modal scroll
      if (self.cursorMode === CURSOR_MODES.DRAG) {
        // Enable drag if the plugin hasn't been initialize, otherwise resume it
        if (!viewport.plugins.drag) {
          viewport.drag({ wheel: false })
        } else {
          viewport.resumePlugin('drag')
        }
      }
    },
    /**
     * Open Info Modal
     */
    openInfoModal: () => {
      self.openModal(modalContentTypes.INFO)
    },
    /**
     * Open Payment Modal
     */
    openPaymentModal: () => {
      self.openModal(modalContentTypes.PAYMENT)
    },
    /**
     * Resize Canvas
     */
    resizeCanvas: (width, height) => {
      // Resize if we've initialized
      if (self.isInitialized) {
        renderer && renderer.resize(width, height)
        viewport && viewport.resize(width, height, self.boardLength, self.boardLength)
      }
    },
    /**
     * Scale Board
     * Zooms out until the board is within view.
     */
    scaleBoard: (clientWidth, clientHeight) => {
      console.log('Scale board?')
      const shortestSide =
        clientWidth < clientHeight ? clientWidth : clientHeight
      let bd = self.getBoardPosition()
      const padding = 0.2 * shortestSide
      if (bd.length >= shortestSide - padding) {
        // Zoom out until we're fully visible
        while (bd.length >= shortestSide - padding) {
          self.zoomOut()
          bd = self.getBoardPosition()
        }
      } else {
        // Zoom in until we're taking up as much space as possible
        while (bd.length <= shortestSide - padding) {
          self.zoomIn()
          bd = self.getBoardPosition()
        }
      }
    },
    /**
     * Center Viewport
     */
    centerViewport: () => {
      viewport && viewport.moveCenter(self.boardLength / 2, self.boardLength / 2)
    },
    /**
     * New order
     */
    newOrder: () => {
      // Convert paintedPixels object to array
      const paintedPixelsArray = pixelsToArray(paintedPixels)
      socket.emit(EVENTS.NEW_ORDER, paintedPixelsArray)
      self.currentPaymentRequest = null
      self.openPaymentModal()
    },
    /**
     * Set mouseDown prop to indicate that mouse is being pressed down
     */
    setMouseDown: () => {
      self.mouseDown = true
    },
    /**
     * Set mouseDown prop to indicate that mouse is being not pressed down
     */
    setMouseUp: () => {
      self.mouseDown = false
      lastDrawnPoint = {}
    },
    /**
     * Setup socket.io client
     */
    initSocket: () => {
      socket = io(API_URI)
      socket.on('error', e => {
        self.addErrorMessage(e)
      })
      socket.on('connect', a => {
        console.log('API Socket connection established with id', socket.id)
        // Register listeners
        socket.on(EVENTS.GET_LATEST_PIXELS_RESULT, self.onGetLatestPixelsResult)
        socket.on(EVENTS.NEW_ORDER_RESULT, self.onNewOrderResult)
        socket.on(EVENTS.ORDER_SETTLED, self.onOrderSettled)
        socket.on(EVENTS.GET_SETTINGS_RESULT, self.onGetSettingsResult)
        socket.on(EVENTS.BROADCAST_STATS, self.onBroadcastStats)
        // Diagnosis
        // socket.on('ping', () => console.log('Socket ping'))
        // socket.on('pong', () => console.log('Socket pong'))
      })
    },
    handleWheel: ({ deltaY }) => {
      if (deltaY < 0) {
        // Scrolling up
        self.zoomIn(0.08)
      }
      if (deltaY > 0) {
        // Scrolling down
        self.zoomOut(0.08)
      }
    },
    handleKeyDown: ({ key }) => {
      key === 'm' && self.setDragMode()
      key === 'd' && self.setDrawMode()
      key === 'e' && self.setEraseMode()
      key === 'i' && self.zoomIn()
      key === 'o' && self.zoomOut()
      key === 'c' && self.centerViewport()
      key === 'x' && self.setEraseMode()
      key === 'X' && self.clearDrawing()
      key === 'p' && self.togglePreviewMode()
      // Moving
      if (key === 'h' || key === 'ArrowLeft') self.moveLeft()
      if (key === 'j' || key === 'ArrowDown') self.moveDown()
      if (key === 'k' || key === 'ArrowUp') self.moveUp()
      if (key === 'l' || key === 'ArrowRight') self.moveRight()
    },
    removeDocumentListeners: () => {
      document.removeEventListener('wheel', self.handleWheel)
      document.removeEventListener('keydown', self.handleKeyDown)
    },
    addDocumentListeners: () => {
      document.addEventListener('wheel', self.handleWheel)
      document.addEventListener('keydown', self.handleKeyDown)
    },
    setDomRef: ref => { domRef = ref },
    setClientWidthHeight: cwh => { clientWidthHeight = cwh },
    /**
     * Stats updated
     */
    onBroadcastStats: ({ data, error }) => {
      self.stats = data
    },
    /**
     * Get the latest settings from API
     */
    getSettings: () => {
      socket.emit(EVENTS.GET_SETTINGS)
    }, 
    /**
     * Settings results
     * This is basically the starting point before loading major components and
     * listeners
     */
    onGetSettingsResult: ({ data, error }) => {
      delete data._id
      self.settings = data
      self.initPixi()
      console.log('Settings updated')
    },
    /**
     * Handles parsing and loading latest pixels from api to canvas
     */
    onNewOrderResult: ({ data, error }) => {
      if (error || !data.paymentRequest) {
        // TODO - Handle errors dammit! Like, show them to the user?
        console.error(
          'Error returned by NEW_ORDER_RESULT',
          error,
          'has payment request?',
          !!data.paymentRequest
        )
        return
      }
      // Set this payment request as the current one we are tracking for the
      // modal
      self.currentPaymentRequest = data.paymentRequest
      // Push paymentRequest onto an array so we can keep track of the ones
      // relevant to this user.
      self.paymentRequests.push(data.paymentRequest)
    },
    /**
     * Handles when a payment is received (any user)
     */
    onOrderSettled: ({ data, error }) => {
      console.log('A new order has been settled')
      if (error || !data.image || !data.paymentRequest) {
        // TODO - Handle errors dammit! Like, show them to the user?
        console.error(
          'Error returned by ORDER_SETTLED',
          error,
          'has image?',
          !!data.image,
          'has paymentRequest?',
          !!data.paymentRequest
        )
      }
      // Update the canvas
      self.updateCanvas(data.image, () => {
        // Flag to see if order belongs to this client
        const orderBelongsToClient = self.paymentRequests.includes(
          data.paymentRequest
        )
        // If the settled order is for a payment request generated by this client
        if (orderBelongsToClient) {
          // Remove it from the array
          self.setPaymentRequests(
            remove(toJS(self.paymentRequests), [data.paymentRequest])
          )
          // Close the modal and clear the current payment request if they match
          // the current active pr
          if (self.currentPaymentRequest === data.paymentRequest) {
            self.closeModal()
            self.setDragMode()
            self.clearDrawing()
            self.clearCurrentPaymentRequest()
          }
          // Trigger a web notification
          // Let's check if the browser supports notifications
          if (!("Notification" in window)) {
            if (Notification && Notification.permission === "granted") {
              new Notification('Success!', {
                body: 'Your painting was submitted.',
                icon: '/static/icon.png'
              }) 
            }
          }
        }
        // Add a HUD message
        self.addHudMessage({
          message: `User "${data.sessionId.substr(0, 5)}"${
            orderBelongsToClient ? ' (you)' : ''
          } painted ${data.pixelsPaintedCount} pixel${data.pixelsPaintedCount > 1 ? 's' : ''}.`,
          color: orderBelongsToClient
            ? HUD_MESSAGE_COLOR_OWN_ORDER_SETTLED
            : HUD_MESSAGE_COLOR_GENERAL_ORDER_SETTLED
        })
      })
    },
    setPaymentRequests: data => {
      self.paymentRequests = data
    },
    clearCurrentPaymentRequest: () => {
      self.currentPaymentRequest = null
    },
    /**
     * Handles parsing and loading latest pixels from api to canvas
     */
    onGetLatestPixelsResult: ({ data, error }) => {
      // TODO handle this
      if (error) {
        return
      }
      self.updateCanvas(data)
    },
    /**
     * Initialize the Pixi application, containers, viewport and relevant
     * listeners
     * @param {String} domRef A reference to the DOM element where the canvas
     *                        will be loaded
     */
    initPixi: () => {
      // Setup listeners
      window.addEventListener('touchstart', self.setMouseDown)
      window.addEventListener('touchend', self.setMouseUp)
      window.addEventListener('mousedown', self.setMouseDown)
      window.addEventListener('mouseup', self.setMouseUp)
      // Prevent pixels from being smoothed
      Pixi.settings.SCALE_MODE = Pixi.SCALE_MODES.NEAREST
      // Skip the console message Pixi prints
      Pixi.utils.skipHello()
      // Setup Pixi Application
      PixiApp = new Pixi.Application({
        width: self.boardLength,
        height: self.boardLength
      })
      // Append it to the DOM
      domRef.appendChild(PixiApp.view)
      // Create a convenient reference to Pixi members
      stage = PixiApp.stage
      renderer = PixiApp.renderer
      renderer.backgroundColor = 0xFFFFFF
      // Set interactive so we can set cursor
      stage.interactive = true
      // Create viewport
      viewport = new Viewport({
        screenWidth: self.boardLength,
        screenHeight: self.boardLength
      })
      // Add viewport to stage
      stage.addChild(viewport)
      // Activate viewport plugins
      viewport
        .decelerate({ friction: 0.8 })
        .pinch()
      // Don't set viewport drag if modal is open otherwise it prevents modal
      // from scrolling, this might happen in the beginning when the modal is
      // open for tutorial.
      if (!self.isModalOpen) viewport.drag({ wheel: false })
      // Create a base container and a draw container
      baseBorderContainer = new Pixi.Container()
      baseContainer = new Pixi.Container()
      drawContainer = new Pixi.Container()
      hoverContainer = new Pixi.Container()
      // Add them to the stage
      viewport.addChild(baseContainer)
      viewport.addChild(baseBorderContainer)
      viewport.addChild(drawContainer)
      viewport.addChild(hoverContainer)
      // Init base border graphic
      self.initBaseBorderGraphic()
      // Init hover graphic
      self.initHoverGraphic()
      // Set default to drag mode
      self.setDragMode()
      // Get the latest pixels
      socket.emit(EVENTS.GET_LATEST_PIXELS)
      // Flag to indicate we're done
      self.isInitialized = true
      // Resize canvas and center viewport
      self.resizeCanvas(
         clientWidthHeight.width,
         clientWidthHeight.height
      )
      // Center the viewport
      self.centerViewport()
      // Initialize price feed
      self.initPriceFeed()
      // Initialize js document event listeners
      self.addDocumentListeners()
      // Hack to track the paintedPixelsCount from variable to store
      setInterval(
        () => {
          self.setPaintedPixelsCount(paintedPixelsCount)
        },
        10
      )
    },
    initBaseBorderGraphic: () => {
      // Create new graphics instance
      baseBorderGraphic = new Pixi.Graphics()
      // Set color and draw rectangle
      baseBorderGraphic.lineStyle(50, 0x666666, 1)
      // Make sure it is hidden by default
      // graphics.visible = false
      baseBorderGraphic.drawRect(-25, -25, self.boardLength + 50, self.boardLength + 50)
      baseBorderGraphic.endFill()
      // Add to draw container
      baseBorderContainer.addChild(baseBorderGraphic)
    },
    initHoverGraphic: () => {
      // Create new graphics instance
      hoverGraphic = new Pixi.Graphics()
      const coordsToDraw = self.calculateCoordinatesToDraw(0, 0)
      // Set color and draw rectangle
      hoverGraphic.lineStyle(0.5, 0x008000, 1)
      // Make sure it is hidden by default
      // graphics.visible = false
      hoverGraphic.drawRect(
        coordsToDraw.x,
        coordsToDraw.y,
        self.pixelSize,
        self.pixelSize
      )
      hoverGraphic.visible = false
      hoverGraphic.endFill()
      // Add to draw container
      hoverContainer.addChild(hoverGraphic)
    },
    /**
     * Removes the current base sprite and puts in a new one
     */
    updateCanvas: (imageUri, cb = () => {}) => {
      // Performance measurement
      const t0 = performance.now()
      // Set default no tint for the base sprite
      let tint = 0xFFFFFF
      // Get the tint of a current sprite (which might not exist yet) is tinted
      if (baseSprite) { tint = baseSprite.tint }
      // Make sure the loader is reset each time to clear any loaded image
      // Note you'll still get Texture cache warnings since we're always using
      // the same 'image' key but that should be fine.
      Pixi.loader.reset()
      Pixi.loader.add('image', imageUri)
      Pixi.loader.load(() => {
        // Turn graphics into sprite for better performance
        baseSprite = new Pixi.Sprite.fromImage(Pixi.loader.resources.image.url)
        baseSprite.width = self.boardLength
        baseSprite.height = self.boardLength
        // Persist the previous tint
        baseSprite.tint = tint
        // Add interaction handlers
        baseSprite.interactive = true
        // Register base sprite listeners
        self.registerBaseSpriteListeners(baseSprite)
        // Add sprite
        baseContainer.addChild(baseSprite)
        // Remove previous sprite f we have more than one now.
        baseContainer.children.length > 1 && baseContainer.removeChildAt(0)
        // Make sure first load flag is set
        self.setFirstLoadComplete()
        // Callback
        cb()
      })
    },
    setFirstLoadComplete: () => {
      self.isFirstLoadComplete = true
    },
    validateAndReturnCoords: (x, y) => {
      // Prevent when modal is open
      if (self.isModalOpen) { return false }
      // Calculate coordinates to draw
      const coordsToDraw = self.calculateCoordinatesToDraw(x, y)
      const normalizedCoords = self.normalizeCoords(coordsToDraw)
      const coordsStr = getCoordinatesStr(normalizedCoords)
      // Skip if not hitting board
      if (!self.isHittingBoard(x, y)) { return false }
      return { coordsToDraw, normalizedCoords, coordsStr }
    },
    registerBaseSpriteListeners: baseSprite => {
      baseSprite.on('pointerdown', e => {
        const c = self.validateAndReturnCoords(e.data.global.x, e.data.global.y)
        // Check validation result
        if (!c) return
        // Drawing
        if (self.isDrawMode) {
          const coordsToDrawArray = getThickBrushCoordinates(self.brushSize, c.normalizedCoords, self.pixelSize)
          coordsToDrawArray.map(
            _c => {
              paintPixel(
                _c.coordsToDraw,
                _c.coordsStr,
                self.paintColor,
                self.pixelSize,
                self.isPreviewModeOn
              )
            }
          )
          lastDrawnPoint = c
        }
        // Erasing
        self.isEraseMode && self.erasePixel(coordsToDraw, coordsStr)
      })
      baseSprite.on('pointermove', e => {
        // Update cursor coordinates for footer indicator
        self.updateCursorCoordinates(e)
        let c = self.validateAndReturnCoords(e.data.global.x, e.data.global.y)
        // Check validation result
        if (!c) return
        if (self.isDrawMode || self.isEraseMode) { self.hoverPixel(c.coordsToDraw) }
        if (self.isDrawMode && self.mouseDown) {
          // Paint it
          const coordsToDrawArray = getThickBrushCoordinates(self.brushSize, c.normalizedCoords, self.pixelSize)
          coordsToDrawArray.map(
            _c => {
              paintPixel(
                _c.coordsToDraw,
                _c.coordsStr,
                self.paintColor,
                self.pixelSize,
                self.isPreviewModeOn
              )
            }
          )
          // Sanity check
          if (lastDrawnPoint.normalizedCoords) {
            // Check if we need to compensate for slow pointermove event tracking
            const xDiff = c.normalizedCoords.x - lastDrawnPoint.normalizedCoords.x
            const yDiff = c.normalizedCoords.y - lastDrawnPoint.normalizedCoords.y
            const xDiffAbs = Math.abs(xDiff)
            const yDiffAbs = Math.abs(yDiff)
            // Process for any diffs above 1 pixel
            if (xDiffAbs > 1 || yDiffAbs > 1) {
              // Calculate the slope of the line
              if (xDiffAbs > yDiffAbs) {
                // X Axis
                const m = xSlope(lastDrawnPoint.normalizedCoords, c.normalizedCoords)
                const b = xIntercept(lastDrawnPoint.normalizedCoords, m)
                for (let dx = 0; dx <= xDiffAbs; dx++) {
                  let x = lastDrawnPoint.normalizedCoords.x + (xDiff > 0 ? dx : -dx)
                  let y = m * x + b
                  y = Math.floor(y)
                  const coordsToDrawArray = getThickBrushCoordinates(self.brushSize, { x, y }, self.pixelSize)
                  coordsToDrawArray.map(
                    _c => {
                      paintPixel(
                        _c.coordsToDraw,
                        _c.coordsStr,
                        self.paintColor,
                        self.pixelSize,
                        self.isPreviewModeOn
                      )
                    }
                  )
                }
              } else {
                // Y Axis
                const m = ySlope(lastDrawnPoint.normalizedCoords, c.normalizedCoords)
                const b = yIntercept(lastDrawnPoint.normalizedCoords, m)
                for (let dy = 0; dy <= yDiffAbs; dy++) {
                  let y = lastDrawnPoint.normalizedCoords.y + (yDiff > 0 ? dy : -dy)
                  let x = m * y + b
                  x = Math.floor(x)
                  const coordsToDrawArray = getThickBrushCoordinates(self.brushSize, { x, y }, self.pixelSize)
                  coordsToDrawArray.map(
                    _c => {
                      paintPixel(
                        _c.coordsToDraw,
                        _c.coordsStr,
                        self.paintColor,
                        self.pixelSize,
                        self.isPreviewModeOn
                      )
                    }
                  )
                }
              }
            }
          }
          // Save off the current position as the last drawn
          lastDrawnPoint = c
        }
        self.isEraseMode && self.mouseDown && self.erasePixel(c.coordsToDraw, c.coordsStr)
      })
      baseSprite.on('pointerout', e => {
        hoverGraphic.visible = false
        lastDrawnPoint = {}
      })
    },
    /**
     * Takes in a pair of coordinates and determines whether they are within
     * the bounds of the board
     */
    isHittingBoard: (x, y) => {
      const bd = self.getBoardPosition()
      return (
        x >= bd.x && y >= bd.y && x <= bd.x + bd.length && y <= bd.y + bd.length
      )
    },
    hoverPixel: coordsToDraw => {
      // Create new graphics instance
      hoverGraphic.visible = true
      hoverGraphic.position.set(coordsToDraw.x, coordsToDraw.y)
    },
    updateCursorCoordinates: e => {
      if (self.isModalOpen) return
      let x = e.data.global.x
      let y = e.data.global.y
      // Don't show coordinates if not hitting board
      if (!self.isHittingBoard(x, y)) {
        return
      }
      // Calculate coordinates to draw
      const coordsToDraw = self.calculateCoordinatesToDraw(x, y)
      const normalizedCoords = self.normalizeCoords(coordsToDraw)
      // Update the cursor coordinates for the footer display
      self.cursorCoordinates = `x: ${normalizedCoords.x} y: ${normalizedCoords.y}`
    },
    erasePixel: (coordsToDraw, coordsStr) => {
      if (paintedPixels[coordsStr]) {
        paintedGraphics[coordsStr].destroy()
        delete paintedGraphics[coordsStr]
        delete paintedPixels[coordsStr]
        self.setPaintedPixelsCount(Object.keys(paintedPixels).length)
      }
    },
    /**
     * Has painted up to the maximum permitted
     * The offset is so that when we're dragging, we can notify if the cursor
     * is being dragged
     */
    hasPaintedMaximum: () =>
      Object.keys(paintedPixels).length >=
      get(self, 'settings.orderPixelsLimit'),
    setPaintedPixelsCount: count => {
      self.paintedPixelsCount = count
      paintedPixelsCount = count
    },
    /**
     * Normalize coordinates to pixel size
     */
    normalizeCoords: coords => ({
      x: coords.x / self.pixelSize,
      y: coords.y / self.pixelSize
    }),
    /**
     * Calculates coordinate to draw according to zoom, pan and clamps
     * measurements to pixel size
     */
    calculateCoordinatesToDraw: (x, y) => {
      return {
        x:
          Math.floor(
            (viewport.hitArea.x + x * 1 / viewport.transform.scale.x) /
              self.pixelSize
          ) * self.pixelSize,
        y:
          Math.floor(
            (viewport.hitArea.y + y * 1 / viewport.transform.scale.y) /
              self.pixelSize
          ) * self.pixelSize
      }
    },
    /**
     * Determine board position and dimensions
     */
    getBoardPosition: () => {
      const boardXStart = -viewport.hitArea.x * viewport.transform.scale.x
      const boardYStart = -viewport.hitArea.y * viewport.transform.scale.y
      const boardLength = self.boardLength * viewport.transform.scale.x
      return {
        x: boardXStart,
        y: boardYStart,
        // We assume it's a square
        length: boardLength
      }
    },
    /**
     * Increments brush size 0 - 1 - 2 then wrap around
     */
    toggleBrushSize: () => {
      if (self.brushSize < 2) {
        self.brushSize = self.brushSize + 1
      } else {
        self.brushSize = 0
      }
    },
    /**
     * Sets the active color that will be drawn
     */
    setPaintColor: c => {
      self.paintColor = color(c).toHex()
      self.setDrawMode()
    },
    /**
     * Zoom in the viewport
     */
    zoomIn: pctOverride =>
      viewport.transform.scale.x < 7 &&
      viewport.zoomPercent(
        pctOverride || ZOOM_IN_BY_PERCENT,
        true
      ),
    /**
     * Zoom out the viewport
     */
    zoomOut: pctOverride =>

      viewport.transform.scale.x > 0.05 &&
      viewport.zoomPercent(
        -pctOverride || -ZOOM_OUT_BY_PERCENT,
        true
      ),
    /**
     * Clear drawing
     */
    clearDrawing: () => {
      drawContainer.removeChildren()
      paintedPixels = {}
      self.setPaintedPixelsCount(0)
      // Clear tint from base sprite
      baseSprite.tint = 0xffffff
    },
    togglePreviewMode: () => {
      if (!self.isPreviewModeOn) {
        baseSprite.tint = 0x333333
        self.isPreviewModeOn = true
      } else {
        baseSprite.tint = 0xffffff
        self.isPreviewModeOn = false
      }
    },
    /**
     * Decide how much to move by when using arrows (factor of 10)
     */
    moveBy: length => length / 10,
    /**
     * Move left
     */
    moveLeft: () => {
      const { x, y } = viewport.hitArea
      viewport.moveCorner(x - self.moveBy(viewport.hitArea.width), y)
    },
    /**
     * Move right
     */
    moveRight: () => {
      const { x, y } = viewport.hitArea
      viewport.moveCorner(x + self.moveBy(viewport.hitArea.width), y)
    },
    /**
     * Move down
     */
    moveDown: () => {
      const { x, y } = viewport.hitArea
      viewport.moveCorner(x, y + self.moveBy(viewport.hitArea.height))
    },
    /**
     * Move up
     */
    moveUp: () => {
      const { x, y } = viewport.hitArea
      viewport.moveCorner(x, y - self.moveBy(viewport.hitArea.height))
    },
    /**
     * Set draw mode
     */
    setDrawMode: () => {
      // Set paint color for the first time
      if (!self.paintColor) {
        self.setPaintColor(random(self.settings.colors.toJS()))
      }
      self.cursorMode = CURSOR_MODES.DRAW
      // Set cursor image, unless in safari
      if (!Browser.safari) {
        stage.cursor = CURSOR_PENCIL_ICON
      }
      hoverGraphic.visible = true
      viewport.pausePlugin('drag')
      viewport.pausePlugin('pinch')
    },
    /**
     * Set draw mode
     */
    setEraseMode: () => {
      self.cursorMode = CURSOR_MODES.ERASE
      stage.cursor = CURSOR_ERASER_ICON
      hoverGraphic.visible = true
      viewport.pausePlugin('drag')
    },
    /**
     * Set drag mode
     */
    setDragMode: () => {
      self.cursorMode = CURSOR_MODES.DRAG
      stage.cursor = 'move'
      hoverGraphic.visible = false
      viewport.resumePlugin('drag')
      viewport.resumePlugin('pinch')
    }
  }))

export function initStore (isServer, snapshot = null) {
  if (isServer || store === null) {
    store = Store.create({
      isInitialized: false,
      mouseDown: false,
      cursorMode: CURSOR_MODES.DRAG,
      pixelSize: 5,
      paintColor: null,
      lastUpdate: Date.now(),
      paintedPixelsCount: 0,
      isModalOpen: false,
      cursorCoordinates: '',
      paymentRequests: [],
      currentPaymentRequest: null,
      bitcoinPrice: null,
     stats: {
        pixelsPerDay: '-',
        transactionsPerDay: '-'
        // usersOnline: 10
      },
      // Lets have some sensible settings as defaults, these shouldn't matter
      // as long as the API is working properly.
      settings: {
        invoiceExpiry: 600,
        orderPixelsLimit: 10000,
        pricePerPixel: 1,
        boardLength: 1000,
        colors: config.COLOR_SWATCH
      },
      hudMessages: [
        // {
        //   message: 'Hello',
        //   color: HUD_MESSAGE_COLOR_GENERAL_ORDER_SETTLED
        // },

        // {
        //   message: 'World',
        //   color: HUD_MESSAGE_COLOR_OWN_ORDER_SETTLED
        // }
      ],
      isFirstLoadComplete: false,
      isPreviewModeOn: true,
      brushSize: 0
    })
  }

  if (snapshot) {
    applySnapshot(store, snapshot)
  }

  return store
}
