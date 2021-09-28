const axios = require('axios')
const fs = require('fs')
const Candle = require('./candle')

/**
 * History fetcher to get/load historical data
 */
class Fetcher {
  constructor (exchangeSettings) {
    this.exchangeSettings = exchangeSettings
    // Twelve Data API
    this.api = axios.create({
      baseURL: 'https://api.twelvedata.com',
      timeout: 10000
    })
  }

  /**
   * Get historical information from Alpha Vantage API
   *
   * @param {Array} symbolPairs List of crypto symbols (max. 8 at a time, to avoid the rate limit)
   * @param {String} interval Interval period (eg. "1week")
   " @param {Number} outputSize Number of data points
   */
  async getData (symbolPairs, interval, outputSize) {
    const cacheFile = 'cachedData.json'

    if (fs.existsSync('./' + cacheFile) &&
      this.exchangeSettings.use_cache) {
      // Use the local cached fille, rather than the API call.
      // However, keep it mind, it doesn't really care about the actual symbolPairs requested
      const data = fs.readFileSync('./' + cacheFile, 'utf8')
      if (data) {
        return Promise.resolve(JSON.parse(data))
      } else {
        return Promise.reject(new Error('Empty data in history file.'))
      }
    } else {
      const params = {
        symbol: symbolPairs.join(),
        interval: interval,
        outputsize: outputSize,
        order: 'ASC',
        apikey: this.exchangeSettings.api_token
      }
      try {
        const response = await this.api.get('/time_series', { params: params })
        if (response.status !== 200) {
          return Promise.reject(new Error('Missing values key in response. HTTP status code: ' + response.status + ' with text : ' + response.statusText + '. Reponse:\n' + JSON.stringify(response.data)))
        }
        return this.postProcessingTimeseries(symbolPairs, response.data, cacheFile)
      } catch (error) {
        console.log(error)
        throw new Error(error)
      }
    }
  }

  /**
   * Helper function for processing crypto time-series
   * @param {Array} symbolPairs Crypto symbol pairs (eg. [ 'BTC/USD, ..])
   * @param {Array} data Data response body
   * @param {String} cacheFile Filename store data to (if cache enabled)
   * @return Array of objects: {symbol: '', name: '', values: [] }
   */
  postProcessingTimeseries (symbolPairs, data, cacheFile) {
    const listSeries = []
    if (typeof (data) === 'undefined' || data === null) {
      return Promise.reject(new Error('Still empty data received from API'))
    }

    for (const symbol of symbolPairs) {
      if (!Object.prototype.hasOwnProperty.call(data, symbol)) {
        return Promise.reject(new Error('Symbol ' + symbol + ' not found in data received from API. Data dump:\n' + JSON.stringify(data, null, 2)))
      }
      const baseName = (data[symbol].meta.currency_base).trim()
      const timeseries = data[symbol].values
      const values = timeseries.map(value =>
        Candle.createIndex(
          parseFloat(value.open), // Open
          parseFloat(value.high), // High
          parseFloat(value.low), // Low
          parseFloat(value.close), // Close
          new Date(value.datetime).getTime()) // Timestamp in ms since Epoch
      )
      listSeries.push({ symbol: symbol, name: baseName, values: values })
    }

    if (listSeries.length > 0 && this.exchangeSettings.use_cache) {
      fs.writeFile('./' + cacheFile, JSON.stringify(listSeries, null, 2), 'utf-8', (err) => {
        if (err) throw err
      })
    }
    return listSeries
  }
}

module.exports = Fetcher
