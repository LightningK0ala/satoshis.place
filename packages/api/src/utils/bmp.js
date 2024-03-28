const log = require("loglevel");
const phrtime = require("pretty-hrtime");
const bmp = require("bmp-js");

module.exports = {
  addBmpDataUri: (base64) => `data:image/bmp;base64,${base64}`,
  /**
   * Encode BMP AGBR Array into Base64
   */
  encodeAGBRArrayToBmpBase64: (abgrArray, size) => {
    // Encode into BMP
    let nTime = process.hrtime();
    const BmpRawObj = bmp.encode({
      data: Buffer.from(abgrArray),
      width: size,
      height: size,
    });
    log.debug(`- Encoded BMP`, phrtime(process.hrtime(nTime)));
    nTime = process.hrtime();
    const result = Buffer.from(BmpRawObj.data).toString("base64");
    log.debug(`- Encoded to base64`, phrtime(process.hrtime(nTime)));
    return result;
  },
  /**
   * Decode BMP base64 into AGBR Array
   */
  decodeBase64ToAGBRArray: (_base64) => {
    // Decode base64
    let nTime = process.hrtime();
    const imageBuffer = Buffer.from(_base64, "base64");
    log.debug(`- Decoded from base64`, phrtime(process.hrtime(nTime)));
    nTime = process.hrtime();
    const decodedBmpImage = bmp.decode(Buffer.from(imageBuffer));
    log.debug(`- Decoded bmp`, phrtime(process.hrtime(nTime)));
    nTime = process.hrtime();
    // Convert to UInt8Array
    const decodedArray = new Uint8Array(decodedBmpImage.data);
    return decodedArray;
  },
};
