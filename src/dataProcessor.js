const PPO = require('./indicators/ppo')
const Util = require('./util')
const csv = require('fast-csv')
const fs = require('fs')

// Dump CSV debug data (true/false)
const DEBUG = true

class DataProcessor {
  /**
   * @param {Number} warmupPeriod Warming-up period for crypto market data
   * @param {Number} dataPeriod Crypto market data data period used to be analysed
   * @param {Dict} indicatorsConfig Crypto market data technical indicators config
   */
  constructor (warmupPeriod, dataPeriod, indicatorsConfig) {
    this.warmupPeriod = warmupPeriod
    this.dataPeriod = dataPeriod
    this.indicatorsConfig = indicatorsConfig
  }

  /**
   * Process the crypto market data, using weekly data.
   * It's creating a PPO (%) indicator, then checking on MACD crosses from the histogram (PPO - Signal Line)
   *
   * @param {Array} sp500Data Crypto data
   * @returns Result structure
   */
  processCryptoMarket (sp500Data) {
    const result = { crosses: [] }
    const csvData = []
    // Create technical indicator (Percentage Price Oscillator: PPO)
    const ppo = new PPO(this.indicatorsConfig.PPO.short, this.indicatorsConfig.PPO.long, this.indicatorsConfig.PPO.signal)

    // Strip down the data series to just what is needed for warming-up fase + data period
    let nrOfDataPoints = this.warmupPeriod + this.dataPeriod
    let firstIndexUsed = (sp500Data.length - 1) - (this.dataPeriod - 1)
    if (sp500Data.length < nrOfDataPoints) {
      console.error('ERROR: Not enough data received from API')
      nrOfDataPoints = sp500Data.length
    }
    if (firstIndexUsed < 0) {
      console.error('ERROR: Index of first used data point out-of-range.')
      firstIndexUsed = 0
    }
    const lastDataPoints = sp500Data.slice(sp500Data.length - nrOfDataPoints, sp500Data.length)
    const startTimestamp = sp500Data[firstIndexUsed].time

    // Process PPO indicator using S&P 500 data points
    // We could create a buffer of history of PPO,
    // or just save what we need for now: previous PPO histogram
    let previousPPO = null
    for (const tick of lastDataPoints) {
      // Update indicator based on close price
      ppo.update(tick.close)
      // Get latest values
      const currentPPO = ppo.getResult()
      if (DEBUG) {
        csvData.push({
          date: Util.dateToString(new Date(tick.time)),
          close: tick.close,
          ppo: currentPPO.ppo,
          signal: currentPPO.signal,
          hist: currentPPO.hist
        })
      }

      // Only check data after warming-up period
      if (tick.time > startTimestamp) {
        // Check for MACD crosses
        if (previousPPO !== null) {
          // Fill-in the PPO (MACD) results
          const bullish = Math.sign(previousPPO.hist) === -1 &&
            (Math.sign(currentPPO.hist) === 1 || Math.sign(currentPPO.hist) === 0)
          if (bullish) {
            result.crosses.push({
              type: 'bullish',
              close: tick.close,
              high: tick.high,
              low: tick.low,
              ppo: currentPPO.ppo,
              signal: currentPPO.signal,
              hist: currentPPO.hist,
              prevHist: previousPPO.hist,
              time: new Date(tick.time)
            })
          }
          const bearish = (Math.sign(previousPPO.hist) === 0 || Math.sign(previousPPO.hist) === 1) &&
            (Math.sign(currentPPO.hist) === -1)
          if (bearish) {
            result.crosses.push({
              type: 'bearish',
              close: tick.close,
              high: tick.high,
              low: tick.low,
              ppo: currentPPO.ppo,
              signal: currentPPO.signal,
              hist: currentPPO.hist,
              prevHist: previousPPO.hist,
              time: new Date(tick.time)
            })
          }
        }
      }
      // Always set previous PPO in case of next tick
      previousPPO = currentPPO
    }

    // Dump verbose data to CSV file
    if (DEBUG) {
      const ws = fs.createWriteStream('debug2.csv')
      csv.write(csvData, { headers: true }).pipe(ws)
    }
    return result
  }
}

module.exports = DataProcessor
