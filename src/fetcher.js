const axios = require('axios')
const fs = require('fs')
const Candle = require('./candle')

/**
 * History fetcher to get/load historical data
 */
class Fetcher {
  constructor (exchangeSettings) {
    this.exchangeSettings = exchangeSettings
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
    let cacheFile = 'cachedData.json'
    if (exchangeParams.function === 'TIME_SERIES_WEEKLY') {
      cacheFile = 'cachedDataWeekly.json'
    }

    if (fs.existsSync('./' + cacheFile) &&
      this.exchangeSettings.use_cache) {
      const data = fs.readFileSync('./' + cacheFile, 'utf8')
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
          dataKey = 'Weekly Time Series'
          break
        default:
          throw new Error('Invalid exchange function parameter.')
      }
      return this.api.get('/query', {
        params: params
      })
        .then(response => response.data[dataKey])
        .then(timeseries => this.processAlphaVantageSeries(timeseries, cacheFile))
        .catch(error => Promise.reject(error))
    }
  }

  /**
   * Helper function for processing Alpha Vantage index time-series
   * @param {Array} timeseries Time-series candle data
   * @param {String} cacheFile Filename store data to (if cache enabled)
   */
  processAlphaVantageSeries (timeseries, cacheFile) {
    if (typeof (timeseries) === 'undefined' || timeseries === null || timeseries.length <= 0) {
      return Promise.reject(new Error('Empty data from Alpha Vantage API'))
    }
    const series = Object.keys(timeseries).reverse().map(timestamp =>
      Candle.createIndex(
        parseFloat(timeseries[timestamp]['1. open']), // Open
        parseFloat(timeseries[timestamp]['2. high']), // High
        parseFloat(timeseries[timestamp]['3. low']), // Low
        parseFloat(timeseries[timestamp]['4. close']), // Close
        new Date(timestamp).getTime()) // Timestamp in ms since Epoch
    )
    if (series && this.exchangeSettings.use_cache) {
      fs.writeFile('./' + cacheFile, JSON.stringify(series, null, 2), 'utf-8', (err) => {
        if (err) throw err
      })
    }
    return Promise.resolve(series)
  }
}

module.exports = Fetcher
