const AlertLevels = require('./alertLevelsEnum')
const PPO = require('./indicators/ppo')
const Util = require('./util')
const csv = require('fast-csv')
const fs = require('fs')

class DataProcessor {
  /**
   * @param {Dict} volatilityAlerts Volatility alert thresholds
   * @param {Dict} indicatorsConfig Market data technical indicators config
   */
  constructor (volatilityAlerts, indicatorsConfig) {
    this.volatilityAlerts = volatilityAlerts
    this.ppo = new PPO(indicatorsConfig.PPO.short, indicatorsConfig.PPO.long, indicatorsConfig.PPO.signal)
    // We could keep a history in form of a buffer (multiple data points),
    // or just save what we need for now: previous PPO histogram
    this.previousPPO = null
    this.resetResult()

    // tmp!
    this.csvData = []
  }

  /**
   * Process the intraday (5 min) candle data,
   * only process the last day volatility data points
   * @param {Array} volatilityData Volatility index data series (^VIX)
   */
  processVolatility (volatilityData) {
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
      this.result.volatility.alert = true
      this.result.volatility.level = AlertLevels.EXTREME_HIGH_LEVEL
      this.result.volatility.percentage = highestPrice
    } else if (highestPrice >= this.volatilityAlerts.high_threshold) {
      this.result.volatility.alert = true
      this.result.volatility.level = AlertLevels.HIGH_LEVEL
      this.result.volatility.percentage = highestPrice
    }

    if (lowestPrice < this.volatilityAlerts.extreme_low_threshold) {
      if (!this.result.volatility.alert) {
        this.result.volatility.alert = true
        this.result.volatility.level = AlertLevels.EXTREME_LOW_LEVEL
        this.result.volatility.percentage = lowestPrice
      } else {
        // Within the same day both a high threshold and low threshold was reached?
        this.result.volatility.dual_alert.alert = true
        this.result.volatility.dual_alert.level = AlertLevels.EXTREME_LOW_LEVEL
        this.result.volatility.dual_alert.percentage = lowestPrice
      }
    } else if (lowestPrice < this.volatilityAlerts.low_threshold) {
      if (!this.result.volatility.alert) {
        this.result.volatility.alert = true
        this.result.volatility.level = AlertLevels.LOW_LEVEL
        this.result.volatility.percentage = lowestPrice
      } else {
        // Within the same day both a high threshold and low threshold was reached?
        this.result.volatility.dual_alert.alert = true
        this.result.volatility.dual_alert.level = AlertLevels.LOW_LEVEL
        this.result.volatility.dual_alert.percentage = lowestPrice
      }
    }

    this.result.volatility.latest_close_price = latestPoint.close
    this.result.volatility.latest_time = new Date(latestPoint.time)
    this.result.volatility.all_points = (todayPoints.length === maxDataPoints)
  }

  /**
   * Process the S&P 500 (^GSPC) index, using weekly data
   * (DO we want to process partially weekly data, if the week is not yet over?)
   *
   * @param {Array} sp500Data ^GSPC index data
   */
  processStockMarket (sp500Data) {
    // Process PPO indicator using S&P 500 data points
    let tick
    // TODO: Wait x amount of time before the MACD is 'stable' due to moving average calculations
    for (tick of sp500Data) {
      // Update indicator
      this.ppo.update(tick.close)

      // Check for MACD crosses
      const ppo = this.ppo.getResult()
      this.csvData.push({
        date: Util.dateToString(new Date(tick.time)),
        close: tick.close,
        ppo: ppo.ppo,
        signal: ppo.signal,
        hist: ppo.hist
      })
      if (this.previousPPO !== null) {
        // Fill-in the PPO (MACD) results
        const bullish = Math.sign(this.previousPPO.hist) === -1 &&
        (Math.sign(ppo.hist) === 1 || Math.sign(ppo.hist) === 0)
        if (bullish) {
          this.result.crosses.push({
            type: 'bullish',
            close: tick.close,
            ppo: ppo.ppo,
            signal: ppo.signal,
            time: new Date(tick.time)
          })
        }
        const bearish = (Math.sign(this.previousPPO.hist) === 0 || Math.sign(this.previousPPO.hist) === 1) &&
        (Math.sign(ppo.hist) === -1)
        if (bearish) {
          this.result.crosses.push({
            type: 'bearish',
            close: tick.close,
            ppo: ppo.ppo,
            signal: ppo.signal,
            time: new Date(tick.time)
          })
        }
      }
      this.previousPPO = ppo
    }

    // Dump verbose data to CSV file
    const ws = fs.createWriteStream('debug.csv')
    csv.write(this.csvData, { headers: true }).pipe(ws)
  }

  /**
   * Return the processed data result structure
   */
  getResult () {
    return this.result
  }

  resetResult () {
    this.result = {
      volatility: {
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
      },
      crosses: []
    }
  }
}

module.exports = DataProcessor
