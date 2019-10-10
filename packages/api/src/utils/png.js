const log = require('loglevel')
const phrtime = require('pretty-hrtime')
const png = require('fast-png')
const base64 = require('64')

module.exports = {
  addPngDataUri: base64 => `data:image/png;base64,${base64}`,
  /**
   * Encode PNG RGBA Array into Base64
   */
  encodeRGBAArrayToPngBase64: (rgbaArray, size) => {
    let nTime = process.hrtime()
    const encodedPng = png.encode({
      data: rgbaArray,
      width: size,
      height: size
    })
    log.debug(`- Encoded PNG`, phrtime(process.hrtime(nTime)))
    nTime = process.hrtime()
    const result = base64.encode(encodedPng).toString()
    log.debug(`- Encoded to base64`, phrtime(process.hrtime(nTime)))
    return result
  },
  /**
   * Decode PNG base64 into RGBA Array
   */
  decodePngBase64ToRGBAArray: (_base64) => {
    // Decode base64
    let nTime = process.hrtime()
    const imageBuffer = base64.decode(Buffer.from(_base64))
    log.debug(`- Decoded from base64`, phrtime(process.hrtime(nTime)))
    nTime = process.hrtime()
    const decodedPngImage = png.decode(imageBuffer)
    log.debug(`- Decoded png`, phrtime(process.hrtime(nTime)))
    nTime = process.hrtime()
    // Convert to UInt8Array
    const decodedArray = new Uint8Array(decodedPngImage.data)
    return decodedArray
  }
}
