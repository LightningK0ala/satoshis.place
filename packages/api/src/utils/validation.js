const pick = require('just-pick')
const config = require('../config')
const log = require('loglevel')
const phrtime = require('pretty-hrtime')

// Validates if a string is a valid hex value for colors i.e. #333333
const isHexColor = color => /^#[0-9A-F]{6}$/i.test(color)

module.exports = {
  isPixelArrayInvalid: (data, settings) => {
    let hasError = false
    let nTime = process.hrtime()
    log.info('Validating')

    try {
      // Return invalid request if data is not set or is not an array
      if (!Array.isArray(data) || data.length === 0) {
        return 'Invalid Request'
      }

      if (data.length > (config.BOARD_LENGTH * config.BOARD_LENGTH)) {
        return 'Array too large'
      }

      if (data.length > settings.orderPixelsLimit) {
        return 'Maximum amount of pixels to be painted per order is ' + settings.orderPixelsLimit
      }

      // Loop through array
      for (let index = 0; index < data.length; index++) {
        // log.info('Validating index', index)
        const { coordinates, color } = pick(data[index], ['coordinates', 'color'])
        // Validate coordinates
        if (!Array.isArray(coordinates) || coordinates.length === 0) {
          hasError = 'Missing coordinates'
          break
        }
        // Validate color
        if (typeof color !== 'string' || !isHexColor(color)) {
          hasError = 'Missing or invalid color ' + color
          break
        }

        // Check if color is in swatch
        if (!(config.COLOR_SWATCH.includes(color)))
        {
          hasError = 'Color not in swatch ' + color + " = "
          break 
        }
        // Validate coordinates
        if (coordinates.x > config.BOARD_LENGTH || coordinates.y > config.BOARD_LENGTH) {
          hasError = 'Coordinates out of bounds'
          break
        }
      }
      log.info('Validating OK', phrtime(process.hrtime(nTime)))
      return hasError
    } catch (e) {
      log.error(
        'Exception caught in validation',
        phrtime(process.hrtime(nTime)),
        e
      )
      return 'Invalid Request (e)'
    }
  }
}
