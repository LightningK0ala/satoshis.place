const request = require("request");
const requestPromise = require("request-promise");

const MACAROON = process.env.LND_MACAROON;
const API_ENDPOINT = process.env.LND_API_ENDPOINT;
const REQUEST_OPTS = {
  rejectUnauthorized: false,
  json: true,
  headers: {
    "Grpc-Metadata-macaroon": MACAROON,
  },
};

async function lndPoster(path, postBody) {
  return requestPromise({
    ...REQUEST_OPTS,
    url: `${API_ENDPOINT}${path}`,
    method: "POST",
    form: JSON.stringify(postBody),
  });
}

async function lndCreateInvoice(payload) {
  return lndPoster("/v1/invoices", payload);
}

async function lndSubscribeInvoices(cb) {
  request.get(
    { ...REQUEST_OPTS, url: `${API_ENDPOINT}/v1/invoices/subscribe` },
    cb
  );
}

module.exports = {
  lndCreateInvoice,
  lndSubscribeInvoices,
};
