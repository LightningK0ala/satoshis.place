/**
|--------------------------------------------------
| Used for application-wide event communication
|--------------------------------------------------
*/
const EventEmitter = require("events");
const log = require("loglevel");
const WebsocketService = require("./WebsocketService");
const config = require("../config");
const { PixelModel } = require("../mongoose/pixel");
const { OrderModel } = require("../mongoose/order");
const { SettingsModel } = require("../mongoose/settings");
const { isPixelArrayInvalid } = require("../utils/validation");
const { db } = require("../utils/mongoose");
const {
  updateAGBRArray,
  updateRGBAArray,
  createBlankRGBAPixelsArray,
  createRGBAFromOrder,
  writePngFile,
  updateNonOpaqueRGBAArray,
} = require("../utils/image");
const LightningService = require("./LightningService");
const {
  encodeAGBRArrayToBmpBase64,
  decodeBase64ToAGBRArray,
  addBmpDataUri,
} = require("../utils/bmp");
const {
  encodeRGBAArrayToPngBase64,
  decodePngBase64ToRGBAArray,
  addPngDataUri,
} = require("../utils/png");
const phrtime = require("pretty-hrtime");
const got = require("got");

/**
 * Event Keys
 */
const EVENTS = {
  /**
  |--------------------------------------------------
  | Events that interact with WebsocketService
  |--------------------------------------------------
  */

  // Receive -------------------------------------------------------------------

  // Orders received from the client
  NEW_ORDER: "NEW_ORDER",
  // Request to get board configurations
  GET_SETTINGS: "GET_SETTINGS",

  // Emit ----------------------------------------------------------------------

  // Result of order creation emitted to client
  NEW_ORDER_RESULT: "NEW_ORDER_RESULT",
  // Order is settled after successful payment
  ORDER_SETTLED: "ORDER_SETTLED",
  // Result of board configuration request
  GET_SETTINGS_RESULT: "GET_SETTINGS_RESULT",
  // Sending out stats to all connected clients at regular intervals
  STATS_UPDATED: "STATS_UPDATED",

  /**
  |--------------------------------------------------
  | Events that interact with LightningService
  |--------------------------------------------------
  */

  // Receive -------------------------------------------------------------------

  // Lightning node received a payment.
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  // Invoice creation result.
  NEW_INVOICE_RESULT: "NEW_INVOICE_RESULT",
  // Get latest pixel state
  GET_LATEST_PIXELS: "GET_LATEST_PIXELS",

  // Emit ----------------------------------------------------------------------

  // Lightning node invoices
  NEW_INVOICE: "NEW_INVOICE",
  // Result of request to get latest pixel state
  GET_LATEST_PIXELS_RESULT: "GET_LATEST_PIXELS_RESULT",
};

/**
 * AppService class
 * Handles the majority of the application logic, brokering communication
 * between the websocket and the lnd service.
 */
class AppService extends EventEmitter {
  constructor(props) {
    super(props);
    // Define class properties
    this.event = EVENTS;
    // Initialize the listeners
    // we might have to move this away from the constructor?
    // this.initListeners()
  }

  async init(ServerService) {
    try {
      // Init services we used in application (prevents circular dependency)
      LightningService.init(this);
      // Setup WebSockets
      WebsocketService.init(ServerService, this);
      // Init listeners
      this.on(EVENTS.PAYMENT_RECEIVED, this.onPaymentReceived);
      this.on(EVENTS.NEW_ORDER, this.onNewOrder);
      this.on(EVENTS.NEW_INVOICE_RESULT, this.onNewInvoiceResult);
      this.on(EVENTS.GET_LATEST_PIXELS, this.onGetLatestPixels);
      this.on(EVENTS.GET_SETTINGS, this.onGetSettings);

      // Grab the invoiceExpiry from settings, this is a number in seconds
      const { invoiceExpiry } = await SettingsModel.findOne({}).lean();
      /**
      |--------------------------------------------------
      | CRON Job to clean unsettled orders
      |--------------------------------------------------
      */
      // Setup a type of cronjob to clear unsettled orders everyday.
      // NOTE: This will reset on each deployment and will also execute for
      // every instance deployed
      log.info("Running clear unsettled orders once at startup");
      this.removeUnsettledOrders(invoiceExpiry);
      log.info("Started interval to clear unsettled orders");
      setInterval(
        () => this.removeUnsettledOrders(invoiceExpiry),
        // Every hour
        3600000
      );
      /**
      |--------------------------------------------------
      | CRON Job to updateStats stats every second
      |--------------------------------------------------
      */
      log.info("Started interval to update stats");
      setInterval(() => this.updateStats(), 1000);
    } catch (e) {
      log.error("Something went wrong in AppService init", e);
    }
  }
  /*
   * Clean orders which haven't been settled and are older than x2 the invoice
   * expiry
   */
  async removeUnsettledOrders(expiryDate) {
    log.info("Cleaning unsettled orders...");
    const t = new Date();
    t.setSeconds(t.getSeconds() - expiryDate);
    const orders = await db()
      .collection("orders")
      .remove({ settled: false, createdAt: { $lt: t } });
    log.info("Cleaned", orders.result.n, "unsettled orders.");
    log.info("Cleaning unsettled orders OK");
  }

  disconnectListeners() {
    this.removeAllListeners();
  }

  /**
  |--------------------------------------------------
  | Event method handlers
  |--------------------------------------------------
  */

  /**
   * Retrieved board configuration from db
   */
  async onGetSettings(_, sid) {
    const result = await SettingsModel.findOne({})
      .select("-createdAt -updatedAt -_id -__v")
      .lean();
    // Attach static configs to settings
    result.colors = config.COLOR_SWATCH;
    result.boardLength = config.BOARD_LENGTH;
    this.emit(EVENTS.GET_SETTINGS_RESULT, { data: result }, sid);
  }

  /**
   * Retrieve stats for the application
   * tx/day, px/day...
   */
  async updateStats() {
    // Create a date that is set to 24 hours ago
    const t = new Date();
    t.setSeconds(t.getSeconds() - 86400);

    const cursor = db()
      .collection("orders")
      .aggregate([
        {
          $match: {
            settled: true,
            updatedAt: { $gt: t },
          },
        },
        {
          $group: {
            _id: 1,
            pixelsCount: { $sum: "$pixelsCount" },
            count: { $sum: 1 },
          },
        },
      ]);
    // Execute the query
    const documents = await cursor.toArray();

    // Emit stats_updated when aggregate query result is present
    if (documents[0]) {
      const result = {
        pixelsPerDay: documents[0].pixelsCount,
        transactionsPerDay: documents[0].count,
        // TODO - usersOnline, need to figure this out from the socket part.
        // usersOnline: 0
      };
      this.emit(EVENTS.STATS_UPDATED, { data: result });
    }
  }

  /**
   * Handles updating the order to settled when a payment is received
   * as well as executing the update to the pixels
   * @param paymentRequest The payment request that was paid
   */
  async onPaymentReceived(paymentRequest) {
    log.info("Payment received", paymentRequest);
    try {
      // Look for order with the corresponding payment request
      const order = await OrderModel.findOne({ paymentRequest }).lean();
      // Check if order is not settled, since we might have multiple instances
      // of the api running, they will all receive the payment received event
      // in which case the pixel update would happen multiple times. Using this
      // check we hopefully prevent this from happening.
      if (!order.settled) {
        await db()
          .collection("orders")
          .updateOne(
            { paymentRequest },
            {
              $set: {
                settled: true,
                updatedAt: new Date(),
              },
            }
          );

        // Execute pixel change
        const base64 = await this.updatePixels(order.pixels);
        // Emit the pixels updated event with the full list of updated pixels
        // NOTES ON OPTIMIZATIONS:
        // - Rate limit / buffer the update event by to at most X number of seconds
        // (every second?). We want to prevent bursts of payments to trigger too
        // many db queries. We only want the latest Pixels state so wherever
        // possible we should minimize the number of queries.
        log.info("AppService emitting ORDER_SETTLED");
        // Notify client that his payment has been received
        this.emit(EVENTS.ORDER_SETTLED, {
          data: {
            image: addPngDataUri(base64),
            paymentRequest: paymentRequest,
            sessionId: order.sessionId,
            pixelsPaintedCount: order.pixelsCount,
          },
        });
      } else {
        log.info("Skipping processing payment, order is settled");
      }
    } catch (e) {
      log.error("onPaymentReceived failed", e);
    }
  }

  /**
   * New orders received from client are handled here
   * @param data Payload from new order
   * @param sid The client socket session id
   */
  async onNewOrder(data, sid) {
    log.info("New order received");
    // Get the settings from db
    const settings = await SettingsModel.findOne().lean();
    // Validate data and emit error if it exists
    const hasError = isPixelArrayInvalid(data, settings);
    if (hasError) {
      log.info("Found error in new order", hasError);
      this.emit(EVENTS.NEW_ORDER_RESULT, { error: hasError }, sid);
    } else {
      log.info("Requesting a new invoice from the Lightning Service");
      /**
      |--------------------------------------------------
      | Simulating payments
      |--------------------------------------------------
      */
      if (process.env.SIMULATE_PAYMENTS === "yes") {
        log.info("Simulating payment");
        const simulatedPaymentRequest = (Math.random() * 1000).toString();
        this.emit(
          EVENTS.NEW_INVOICE_RESULT,
          { data, paymentRequest: simulatedPaymentRequest },
          sid
        );
        // DEBUG
        // Simulate the payment received for this payment request
        if (process.env.SIMULATE_PAYMENTS === "yes") {
          setTimeout(
            () => this.emit(EVENTS.PAYMENT_RECEIVED, simulatedPaymentRequest),
            1000
          );
        }
        return;
      }
      /**
      |--------------------------------------------------
      | Real payments
      |--------------------------------------------------
      */
      const paymentRequest = await LightningService.newInvoice(
        data.length,
        settings
      );
      log.info("Requesting a new invoice from the Lightning Service OK");
      if (paymentRequest) {
        this.emit(EVENTS.NEW_INVOICE_RESULT, { data, paymentRequest }, sid);
      } else {
        log.error("Requesting a new invoice from the Lightning Service FAIL");
      }
    }
  }

  /**
   * Handles result of new invoices being issued
   * @param paymentRequest Payment Request for the new invoice
   * @param sid The client socket session id
   */
  async onNewInvoiceResult({ data, paymentRequest }, sid) {
    log.info("Creating new order");
    // Convert order data into base64 png image
    const rgbaOrder = createRGBAFromOrder(data, config.BOARD_LENGTH);
    const orderImage = encodeRGBAArrayToPngBase64(
      rgbaOrder,
      config.BOARD_LENGTH
    );
    let nTime = process.hrtime();
    await db().collection("orders").insertOne(
      {
        paymentRequest,
        pixels: orderImage,
        pixelsCount: data.length,
        settled: false,
        sessionId: sid,
        createdAt: new Date(),
      },
      null
    );
    log.info(`Creation new order OK`, phrtime(process.hrtime(nTime)));

    // Emit the order result event with the payment request
    this.emit(EVENTS.NEW_ORDER_RESULT, { data: { paymentRequest } }, sid);
  }

  // /**
  //  * Converts an index of an image in a continuous array to an (x,y) coordinate
  //  * @param index Index in the continuous array
  //  */
  // indexToGetXY (index) {
  //   const x = index % config.BOARD_LENGTH
  //   return { x, y: (index - x) / config.BOARD_LENGTH }
  // }

  // /**
  //  * Translates an image in a continuous array to an array of pixel objects
  //  * @param array The continuous array of an image
  //  */
  // translatePixels (array) {
  //   let result = []
  //   for (var i = 0; i < array.length; i++) {
  //     const xyCoords = this.indexToGetXY(i)
  //     result.push({
  //       coordinates: [xyCoords.x, xyCoords.y],
  //       color: array[i]
  //     })
  //   }
  //   return result
  // }

  /**
   * Gets latest state of pixels
   * @param data Data that might be sent by client (unused)
   * @param sid Client socket id session
   */
  async onGetLatestPixels(data, sid) {
    log.info("Getting latest pixels");
    // Get pixels base64 representation from db
    const result = await PixelModel.findOne().select("pixels -_id").lean();
    log.info("Getting latest pixels OK");
    // Emit the order result event with the payment request
    this.emit(
      EVENTS.GET_LATEST_PIXELS_RESULT,
      {
        data: `data:image/bmp;base64,${result.pixels}`,
      },
      sid
    );
  }

  /**
  |--------------------------------------------------
  | Utility methods
  |--------------------------------------------------
  */

  /**
   * Updates pixels in database
   * @param {Array} orderPixels Array of pixels to update
   */
  async updatePixels(orderPixels) {
    log.info(`Updating pixels`);
    log.info(`Reading pixels from db`);
    let nTime = process.hrtime();
    // Grab pixel data from db
    const result = await db().collection("pixels").findOne({});
    log.info(`Reading pixels from db OK`, phrtime(process.hrtime(nTime)));
    log.info(`Decoding base64 to pixel array`);
    nTime = process.hrtime();
    // Convert the base image to a a pixel array representation
    let basePixelArray = decodePngBase64ToRGBAArray(result.pixels);
    // Convert the pixels from order
    let orderPixelArray = decodePngBase64ToRGBAArray(orderPixels);
    log.info(
      `Decoding base64 to pixel array OK`,
      phrtime(process.hrtime(nTime))
    );
    log.info(`Looping through pixel array`);
    nTime = process.hrtime();
    // Update pixels
    const pixelArray = updateNonOpaqueRGBAArray(
      orderPixelArray,
      basePixelArray
    );
    log.info(`Looping through pixel array OK`, phrtime(process.hrtime(nTime)));
    nTime = process.hrtime();
    log.info(`Encoding pixel array...`);
    // Encode back into base64
    const base64 = encodeRGBAArrayToPngBase64(pixelArray, config.BOARD_LENGTH);
    log.info(
      `Encoding pixel array OK, total time was`,
      phrtime(process.hrtime(nTime))
    );
    log.info(`Writing to db`);
    nTime = process.hrtime();
    // Update db
    await db()
      .collection("pixels")
      .updateOne({}, { $set: { pixels: base64 } });
    log.info(`Writing to db OK`, phrtime(process.hrtime(nTime)));
    log.info(`Updating pixels OK`);
    return base64;
  }
  /**
   * Clears the pixels collection.
   * Builds an array with Pixel elements for a square board with BOARD_LENGTH
   * as the length. The color will be set to the DEFAULT_COLOR in config.
   * Automatically saves the generated records.
   * @param {Number} _boardLength The board length to reinitialize the pixels
   */
  async initEmptyPixels(_boardLength) {
    log.info("Reinitializing Pixel Collection");
    // Clear the pixel collection
    await PixelModel.remove();
    const blankState = new PixelModel({
      pixels: await encodeRGBAArrayToPngBase64(
        createBlankRGBAPixelsArray(_boardLength || config.BOARD_LENGTH),
        _boardLength || config.BOARD_LENGTH
      ),
    });
    await blankState.save();
    log.info("Reinitializing Pixel Collection OK");
  }
}

module.exports = new AppService();
