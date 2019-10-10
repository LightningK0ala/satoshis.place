const micro = require('micro')

module.exports = micro(async (req, res) => {
  return 'Visit https://satoshis.place'
})