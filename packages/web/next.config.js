const webpack = require('webpack')

module.exports = {
  exportPathMap: () => {
    return {
      '/': { page: '/' }
    }
  },
  webpack: (config, { dev }) => {
    config.plugins.push(new webpack.EnvironmentPlugin(process.env))
    return config
  }
}
