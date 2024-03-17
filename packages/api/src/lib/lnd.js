const got = require("got");

const mimeType = "application/json";

const MACAROON = process.env.LND_MACAROON;
const API_ENDPOINT = process.env.LND_API_ENDPOINT;

async function lndFetcher(path, postBody) {
  const url = `${API_ENDPOINT}${path}`;
  const method = postBody ? "POST" : "GET";
  const init = { method };
  let headers = {
    "Grpc-Metadata-Macaroon": MACAROON,
    Accept: mimeType,
  };
  if (postBody) {
    init.body = JSON.stringify(postBody);
    headers = { ...headers, "Content-Type": mimeType };
  }
  const result = await got(url, { ...init, headers });
  const data = await result.json().catch();
  if (!result.ok) {
    throw new Error(
      data ? data.message : result.statusText || `${path} 😱 ${result.status}`
    );
  }
  return data;
}

async function lndPoster(path, postBody) {
  const url = `${API_ENDPOINT}${path}`;
  const method = postBody ? "POST" : "GET";
  const init = { method };
  let headers = {
    "Grpc-Metadata-Macaroon": MACAROON,
    Accept: mimeType,
  };
  if (postBody) {
    init.body = JSON.stringify(postBody);
    headers = { ...headers, "Content-Type": mimeType };
  }
  const { body } = await got.post(url, { ...init, headers });
  return JSON.parse(body);
}

function lndCreateInvoice(payload) {
  return lndPoster("/v1/invoices", payload);
}

module.exports = {
  lndCreateInvoice,
};
