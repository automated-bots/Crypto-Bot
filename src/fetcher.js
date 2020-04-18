const axios = require('axios')
const fs = require('fs')
const Candle = require('./candle')

/**
 * History fetcher to get/load historical data
 */
class Fetcher {
  constructor (exchangeSettings) {
    this.exchangeSettings = exchangeSettings
    this.cachedFile = 'cachedData.json'
    // Alpha Vantage API HTTP Client
    this.api = axios.create({
      baseURL: 'https://www.alphavantage.co',
      timeout: 10000
    })
  }

  /**
   * Get historical information from Alpha Vantage API
   *
   * @param {Object} exchangeParams Params dictionary object containing: 'function', 'symbol' and
   *  optionally 'intraday_interval' and 'outputsize' keys.
   */
  getData (exchangeParams) {
    if (fs.existsSync('./' + this.cachedFile) &&
      this.exchangeSettings.use_cache) {
      const data = fs.readFileSync('./' + this.cachedFile, 'utf8')
      if (data) {
        return Promise.resolve(JSON.parse(data))
      } else {
        throw new Error('Empty data in history file.')
      }
    } else {
      const params = {
        function: exchangeParams.function,
        symbol: exchangeParams.symbol,
        apikey: this.exchangeSettings.apiKey
      }
      let dataKey = ''
      switch (exchangeParams.function) {
        case 'TIME_SERIES_INTRADAY':
          params.interval = exchangeParams.intraday_interval
          params.outputsize = exchangeParams.outputsize
          dataKey = 'Time Series (' + exchangeParams.intraday_interval + ')'
          break
        case 'TIME_SERIES_WEEKLY':
          dataKey = 'Time Series (Weekly)'
          break
        default:
          throw new Error('Invalid exchange function parameter.')
      }
      return this.api.get('/query', {
        params: params
      })
        .then(response => response.data[dataKey])
        .then(timeseries => this.processAlphaVantageSeries(timeseries))
        .catch(error => Promise.reject(error))
    }
  }

  /**
   * Helper function for processing Alpha Vantage index time-series
   * @param {Array} timeseries Time-series candle data
   */
  processAlphaVantageSeries (timeseries) {
    const series = Object.keys(timeseries).reverse().map(timestamp =>
      Candle.createIndex(
        parseFloat(timeseries[timestamp]['1. open']), // Open
        parseFloat(timeseries[timestamp]['2. high']), // High
        parseFloat(timeseries[timestamp]['3. low']), // Low
        parseFloat(timeseries[timestamp]['4. close']), // Close
        new Date(timestamp).getTime()) // Timestamp in ms since Epoch
    )
    if (series && this.exchangeSettings.use_cache) {
      fs.writeFile('./' + this.cachedFile, JSON.stringify(series, null, 2), 'utf-8', (err) => {
        if (err) throw err
      })
    }

    if (series.length > 0) {
      return Promise.resolve(series)
    } else {
      return Promise.reject(new Error('Empty data from Alpha Vantage API'))
    }
  }
}

module.exports = Fetcher
