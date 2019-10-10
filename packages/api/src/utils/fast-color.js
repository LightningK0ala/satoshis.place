/**
 * Slightly modified color utilities to convert rgb <-> hex as fast as possible
 * from https://gist.github.com/lrvick/2080648
 */

module.exports = {
  // convert 0..255 R,G,B values to a hexidecimal color string
  RGBToHex: (r, g, b) => {
    var bin = r << 16 | g << 8 | b
    return (function (h) {
      return new Array(7 - h.length).join('0') + h
    })('#' + bin.toString(16).toUpperCase())
  },
  // convert a hexidecimal color string to 0..255 R,G,B
  hexToRGB: hex => {
    // Clip the #
    hex = hex.substring(1)
    // Convert to hex value
    hex = parseInt(hex, 16)
    var r = hex >> 16
    var g = hex >> 8 & 0xFF
    var b = hex & 0xFF
    return [r, g, b]
  }
}
