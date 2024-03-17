const log = require("loglevel");
const WebSocket = require("ws");
const { lndCreateInvoice } = require("../lib/lnd");

/**
|--------------------------------------------------
| Constants and variables
|--------------------------------------------------
*/
let isAlive;

/**
 * Sets up websocket listeners for interaction with lightning charged.
 * Reusable so that on connection failure we can retry
 */
const setupListeners = (AppService) => {
  // TODO: Change this
  log.info("Connecting charge websocket");
  const endpoint = process.env.LND_API_ENDPOINT;
  const ws = new WebSocket(
    `wss://${endpoint.replace(
      /^[^:]+:\/\//,
      ""
    )}/v1/invoices/subscribe?method=GET`,
    {
      rejectUnauthorized: false,
      headers: {
        "Grpc-Metadata-Macaroon": process.env.LND_MACAROON,
      },
    }
  );
  ws.on("open", () => {
    ws.send(JSON.stringify({}));
    log.info("Connecting charge websocket OK");
    // Message listener callback
    ws.addEventListener("message", (msg) => {
      // Parse data
      const { result: data } = JSON.parse(msg.data);
      // Check if a payment has been made
      if (data && data.settled && data.payment_request) {
        log.info("Payment received 🤑");
        // Proxy through the payment event to AppService
        AppService.emit(
          AppService.event.PAYMENT_RECEIVED,
          data.payment_request
        );
      } else {
        log.info(
          `Message received from lightning charge but it's not a successful payment`,
          data.payment_request
        );
      }
    });
  });
  return ws;
};

/**
 * Connect websocket
 */
const connectSocket = (AppService) => {
  try {
    ws = setupListeners(AppService);
    setupPong(ws);
    ws.on("error", (error) => {
      log.error("An error with Charge Websocket occured", error);
    });
    ws.on("close", (info) => {
      log.error("Charge Websocket disconnected", info);
    });
    return ws;
  } catch (e) {
    log.error("Retrying to connect charged socket FAIL");
  }
};

/**
 * Websocket pong callback
 */
const setupPong = (ws) => {
  ws.on("pong", () => log.info("PONG", Date.now()));
};

/**
|--------------------------------------------------
| Main module export
|--------------------------------------------------
*/
module.exports = {
  /**
   * Returns the raw lnrpc instance
   * (NOT USED)
   * @function
   * @returns {*} lnrpc
   */
  lnrpc: () => lnrpc,

  /**
   * Initialize the lnd service. Creates the lightning charged connection
   * and sets up the listeners for payments.
   * @function
   * @param {*} io The socket io instance
   */
  init: async (AppService) => {
    try {
      // Setup listener for lightning charge events
      // Keep alive heartbeat is needed to keep http connection alive.
      // We do this by pinging the socket every 30s.
      setInterval(() => {
        log.info("PING", Date.now());
        try {
          ws.ping();
        } catch (e) {
          // If ping fails then something is very wrong. Terminate the current
          // ws connection and retry...
          log.info("FAILED TO PING", e);
          ws.terminate();
          log.info("Retrying to connect charged socket");
          try {
            ws = connectSocket(AppService);
          } catch (e) {
            log.error("Retring to connect charged socket FAIL");
          }
        }
      }, 30000);
      // Run the first connection
      let ws = connectSocket(AppService);
    } catch (e) {
      log.error("Failed to connect to charge websocket", e);
    }
  },
  /**
   * Generate a new invoice for a given amount
   * @function
   * @param {number} pixelCount The amount of pixels to be painted
   * @param {number} settings Board settings
   * @returns string The payment request
   */
  newInvoice: async (pixelCount, settings) => {
    try {
      const value = pixelCount * settings.pricePerPixel;
      const memo = `Payment for ${pixelCount} pixels at satoshis.place.`;
      const expiry = settings.invoiceExpiry;
      const { payment_request } = await lndCreateInvoice({
        value,
        memo,
        expiry,
      });
      log.info("Querying charge endpoint for invoice OK");
      log.info("Payment request created for invoice:", payment_request);
      return payment_request;
    } catch (e) {
      log.error(
        "Something went wrong whilst querying charge endpoint for invoice",
        e
      );
    }
  },
};
