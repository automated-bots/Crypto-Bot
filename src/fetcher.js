const axios = require('axios')
const fs = require('fs')
const Candle = require('./candle')

/**
 * History fetcher to get/load historical data
 */
class Fetcher {
  constructor (exchangeCfg) {
    this.exchangeCfg = exchangeCfg
    this.cachedFile = 'cachedData.json'
    // Alpha Vantage API HTTP Client
    this.api = axios.create({
      baseURL: 'https://www.alphavantage.co',
      timeout: 10000
    })
  }

  /**
   * Get historical information from Alpha Vantage API
   */
  getData () {
    if (fs.existsSync('./' + this.cachedFile) &&
      this.exchangeCfg.useCache) {
      console.log('Info: Use cached file.')
      const data = fs.readFileSync('./' + this.cachedFile, 'utf8')
      if (data) {
        return Promise.resolve(JSON.parse(data))
      } else {
        throw new Error('Empty data in history file.')
      }
    } else {
      return this.api.get('/query', {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: this.exchangeCfg.symbol,
          interval: this.exchangeCfg.intraday_interval,
          apikey: this.exchangeCfg.apiKey
        }
      })
        .then(response => response.data['Time Series (' + this.exchangeCfg.intraday_interval + ')'])
        .then(timeseries => this.processAlphaVantageSeries(timeseries))
        .catch(error => Promise.reject(error))
    }
  }

  /**
   * Helper function for processing Alpha Vantage time-series
   * @param {Array} timeseries - Time-series candle data
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
    if (series && this.exchangeCfg.useCache) {
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
