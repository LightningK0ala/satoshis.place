const { hexToRGB } = require('./fast-color')

/**
 * Converts an (x, y) coordinate in an image to an index in a continuous array
 * @param x The x coord
 * @param x The y coord
 */
const xyToIndex = (x, y, boardLength) => {
  return parseInt(y) * boardLength + parseInt(x)
}

module.exports = {
  /**
   * Updates a pixel array ordered in AGBR with
   * pixels array containing objects with coordinates
   * and color
   */
  updateAGBRArray: (pixels, pixelArray, boardLength) => {
    // Go through the pixels we need to modify in AGBR Array
    for (let index = 0; index < pixels.length; index++) {
      const p = pixels[index]
      const stateIndex = xyToIndex(
        p.coordinates[0],
        p.coordinates[1],
        boardLength
      )
      const rgb = hexToRGB(p.color)
      pixelArray[stateIndex * 4 + 1] = rgb[2]
      pixelArray[stateIndex * 4 + 2] = rgb[1]
      pixelArray[stateIndex * 4 + 3] = rgb[0]
    }
    return pixelArray
  },
  /**
   * A full update of an image against another where the pixels to be updated
   * are alpha !== 0. Note that the pixel arrays must be the same size!
   */
  updateNonOpaqueRGBAArray: (orderPixelArray, basePixelArray) => {
    // Go through the pixels we need to modify in AGBR Array
    for (let index = 0; index < orderPixelArray.length; index++) {
      // Check that alpha is above 0 otherwise skip
      if (orderPixelArray[index * 4 + 3] > 0) {
        basePixelArray[index * 4] = orderPixelArray[index * 4]
        basePixelArray[index * 4 + 1] = orderPixelArray[index * 4 + 1]
        basePixelArray[index * 4 + 2] = orderPixelArray[index * 4 + 2]
      }
    }
    return basePixelArray
  },
  /**
   * Updates a pixel array ordered in RGBA with
   * pixels array containing objects with coordinates
   * and color
   */
  updateRGBAArray: (pixels, pixelArray, boardLength, forceAlpha) => {
    // Go through the pixels we need to modify in AGBR Array
    for (let index = 0; index < pixels.length; index++) {
      const p = pixels[index]
      const stateIndex = xyToIndex(
        p.coordinates[0],
        p.coordinates[1],
        boardLength
      )
      const rgb = hexToRGB(p.color)
      pixelArray[stateIndex * 4] = rgb[0]
      pixelArray[stateIndex * 4 + 1] = rgb[1]
      pixelArray[stateIndex * 4 + 2] = rgb[2]
      // When force alpha is set, we are making invisible pixels visible again
      // this is used in the new order mechanism.
      pixelArray[stateIndex * 4 + 3] = forceAlpha
        ? 255
        : pixelArray[stateIndex * 4 + 3]
    }
    return pixelArray
  },
  /**
   * Create a blank ABGR Pixels Array
   */
  createBlankABGRPixelsArray: (length) => {
    let array = []
    // Iterate over the y-axis
    for (let index = 0; index < length * length; index++) {
      array[index * 4] = 255 // alpha
      array[index * 4 + 1] = 255 // b
      array[index * 4 + 2] = 255 // g
      array[index * 4 + 3] = 255 // r
    }
    return array
  },
  /**
   * Create a blank RGBA Pixels Array
   * forceAlpha is used to set all pixels alpha to 0
   */
  createBlankRGBAPixelsArray: (length, forceAlpha) => {
    let array = []
    // Iterate over the y-axis
    for (let index = 0; index < length * length; index++) {
      array[index * 4] = 255 // r
      array[index * 4 + 1] = 255 // g
      array[index * 4 + 2] = 255 // b
      array[index * 4 + 3] = forceAlpha ? 0 : 255 // a
    }
    return array
  },
  /**
   * Create a RGBA array representation of an order
   * Non-painted pixels have an alpha of 0
   * An pixelsOrder is an array of objects { color: <hex>, coordinates: [x, y] }
   */
  createRGBAFromOrder: (pixelsOrder, length) => {
    // Create a full representation of the board with pixels alpha set to 0
    const alphaArray = module.exports.createBlankRGBAPixelsArray(length, true)
    // Update the pixels from the order
    const updatedArray = module.exports.updateRGBAArray(pixelsOrder, alphaArray, length, true)
    return updatedArray
  },
  writePngFile: data => require("fs").writeFileSync("IMAGE_FILE.png", data, { encoding: 'base64' })
}