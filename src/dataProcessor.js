const PPO = require('./indicators/ppo')
const Util = require('./util')
const csv = require('fast-csv')
const fs = require('fs')

// Dump CSV debug data (true/false)
const DEBUG = false

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
   * @param {Array} data Market data timeserie values and symbol data
   * @returns Array of crosses
   */
  processCryptoMarket (data) {
    const crosses = []
    const csvData = []
    // Create technical indicator (Percentage Price Oscillator: PPO)
    const ppo = new PPO(this.indicatorsConfig.PPO.short, this.indicatorsConfig.PPO.long, this.indicatorsConfig.PPO.signal)

    const values = data.values
    // Strip down the data series to just what is needed for warming-up fase + data period
    let nrOfDataPoints = this.warmupPeriod + this.dataPeriod
    let firstIndexUsed = (values.length - 1) - (this.dataPeriod - 1)
    if (values.length < nrOfDataPoints) {
      console.error('ERROR: Not enough data received from API for symbol: ' + data.symbol + '. Expected: ' + nrOfDataPoints + ' (' + this.warmupPeriod + '+' + this.dataPeriod + ') - Actual: ' + values.length)
      nrOfDataPoints = values.length
    }
    if (firstIndexUsed < 0) {
      console.error('ERROR: Index of first used data point out-of-range for symbol: ' + data.symbol + '.')
      firstIndexUsed = 0
    }
    const lastDataPoints = values.slice(values.length - nrOfDataPoints, values.length)
    const startTimestamp = values[firstIndexUsed].time

    // Process PPO indicator using timeserie points
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
            crosses.push({
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
            crosses.push({
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
      const filename = 'debug_' + data.symbol.replace(/\//g, '_')
      const ws = fs.createWriteStream(filename + '.csv')
      csv.write(csvData, { headers: true }).pipe(ws)
    }
    return crosses
  }
}

module.exports = DataProcessor
