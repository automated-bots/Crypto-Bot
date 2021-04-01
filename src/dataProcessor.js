const AlertLevels = require('./alertLevelsEnum')
const PPO = require('./indicators/ppo')
const Util = require('./util')
const csv = require('fast-csv')
const fs = require('fs')

// Dump CSV debug data (true/false)
const DEBUG = false

class DataProcessor {
  /**
   * @param {Dict} volatilityAlerts Volatility alert thresholds
   * @param {Number} warmupPeriod Warming-up period for market data
   * @param {Number} dataPeriod Market data data period used to be analysed
   * @param {Dict} indicatorsConfig Market data technical indicators config
   */
  constructor (volatilityAlerts, warmupPeriod, dataPeriod, indicatorsConfig) {
    this.volatilityAlerts = volatilityAlerts
    this.warmupPeriod = warmupPeriod
    this.dataPeriod = dataPeriod
    this.indicatorsConfig = indicatorsConfig
  }

  /**
   * Process the intraday (5 min) candle data,
   * only process the last day volatility data points
   * @param {Array} volatilityData Volatility index data series (^VIX)
   * @returns Results structure
   */
  processVolatility (volatilityData) {
    const result = {
      alert: false,
      level: AlertLevels.NO_ALERT,
      percentage: 0,
      latest_close_price: 0,
      latest_time: 0,
      all_points: false,
      dual_alert: {
        alert: false,
        level: AlertLevels.NO_ALERT,
        percentage: 0
      }
    }

    // NYSE Marker opening hours: 9:30 - 16:00 = 6.5 hours open = 390 min.
    // Max data points = 390 min. / 5 .min interval = 78
    const maxDataPoints = 78

    const latestPoint = volatilityData[volatilityData.length - 1]
    const startOfLastDayEpoch = new Date(new Date(latestPoint.time).toDateString()).getTime()
    const todayPoints = volatilityData.filter(data => data.time >= startOfLastDayEpoch)

    // Calculate highest & lowest prices from volatility index (^VIX)
    const highPrices = todayPoints.map(data => data.high) // Use high price for highest calc
    const highestPrice = Math.max(...highPrices)
    const lowPrices = todayPoints.map(data => data.low) // Use low price for lowest calc
    const lowestPrice = Math.min(...lowPrices)

    // Fill-in the volatility results
    if (highestPrice >= this.volatilityAlerts.extreme_high_threshold) {
      result.alert = true
      result.level = AlertLevels.EXTREME_HIGH_LEVEL
      result.percentage = highestPrice
    } else if (highestPrice >= this.volatilityAlerts.high_threshold) {
      result.alert = true
      result.level = AlertLevels.HIGH_LEVEL
      result.percentage = highestPrice
    }

    if (lowestPrice < this.volatilityAlerts.extreme_low_threshold) {
      if (!result.alert) {
        result.alert = true
        result.level = AlertLevels.EXTREME_LOW_LEVEL
        result.percentage = lowestPrice
      } else {
        // Within the same day both a high threshold and low threshold was reached?
        result.dual_alert.alert = true
        result.dual_alert.level = AlertLevels.EXTREME_LOW_LEVEL
        result.dual_alert.percentage = lowestPrice
      }
    } else if (lowestPrice < this.volatilityAlerts.low_threshold) {
      if (!result.alert) {
        result.alert = true
        result.level = AlertLevels.LOW_LEVEL
        result.percentage = lowestPrice
      } else {
        // Within the same day both a high threshold and low threshold was reached?
        result.dual_alert.alert = true
        result.dual_alert.level = AlertLevels.LOW_LEVEL
        result.dual_alert.percentage = lowestPrice
      }
    }

    result.latest_close_price = latestPoint.close
    result.latest_time = new Date(latestPoint.time)
    result.all_points = (todayPoints.length === maxDataPoints)
    return result
  }

  /**
   * Process the S&P 500 (^GSPC) index, using weekly data.
   *
   * @param {Array} sp500Data ^GSPC index data
   * @returns Result structure
   */
  processStockMarket (sp500Data) {
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
      const ws = fs.createWriteStream('debug.csv')
      csv.write(csvData, { headers: true }).pipe(ws)
    }
    return result
  }
}

module.exports = DataProcessor
