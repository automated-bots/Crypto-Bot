const AlertLevels = require('./alertLevelsEnum')
const PPO = require('./indicators/ppo')

class DataProcessor {
  constructor (settings, indicatorsConfig) {
    this.settings = settings
    this.ppo = new PPO(indicatorsConfig.PPO.short, indicatorsConfig.PPO.long, indicatorsConfig.PPO.signal)
    // We could keep a history in form of a buffer (multiple data points),
    // or just save what we need for now: previous PPO histogram
    this.previousPPO = null
    this.resetResult()
  }

  /**
   * Process the intraday (5 min) candle data,
   * only process the last day data points
   * @param {*} vixData ^VIX index data series
   */
  process (vixData) {
    // NYSE Marker opening hours: 9:30 - 16:00 = 6.5 hours open = 390 min.
    // Max data points = 390 min. / 5 .min interval = 78
    const maxDataPoints = 78

    const latestVIXPoint = vixData[vixData.length - 1]
    const startOfLastDayEpoch = new Date(new Date(latestVIXPoint.time).toDateString()).getTime()
    const todayPoints = vixData.filter(data => data.time >= startOfLastDayEpoch)

    // Process PPO indicator using S&P 500 data points
    let ppoCrossedBull = false
    let ppoCrossedBear = false
    let tick
    // TODO: use S&P data points instead of todays Vix data
    for (tick of todayPoints) {
      // Update indicator
      this.ppo.update(tick.close)

      // Check for MACD crosses
      const ppo = this.ppo.getResult()
      if (this.previousPPO !== null) {
        if (!ppoCrossedBull) {
          ppoCrossedBull = Math.sign(this.previousPPO.hist) === -1 &&
            (Math.sign(ppo.hist) === 1 || Math.sign(ppo.hist) === 0)
        }
        if (!ppoCrossedBear) {
          ppoCrossedBear = (Math.sign(this.previousPPO.hist) === 0 || Math.sign(this.previousPPO.hist) === 1) &&
            (Math.sign(ppo.hist) === -1)
        }
      }
      this.previousPPO = ppo
    }

    // Calculate highest & lowest prices from VIX index
    const highPrices = todayPoints.map(data => data.high) // Use high price for highest calc
    const highestPrice = Math.max(...highPrices)
    const lowPrices = todayPoints.map(data => data.low) // Use low price for lowest calc
    const lowestPrice = Math.min(...lowPrices)

    // Fill-in the PPO (MACD) results
    this.result.ppo.bull = ppoCrossedBull
    this.result.ppo.bear = ppoCrossedBear

    // Fill-in the VIX results
    if (highestPrice >= this.settings.alerts.VIX.extreme_high_threshold) {
      this.result.vix.alert = true
      this.result.vix.level = AlertLevels.EXTREME_HIGH_LEVEL
      this.result.vix.percentage = highestPrice
    } else if (highestPrice >= this.settings.alerts.VIX.high_threshold) {
      this.result.vix.alert = true
      this.result.vix.level = AlertLevels.HIGH_LEVEL
      this.result.vix.percentage = highestPrice
    }

    if (lowestPrice < this.settings.alerts.VIX.extreme_low_threshold) {
      if (!this.result.vix.alert) {
        this.result.vix.alert = true
        this.result.vix.level = AlertLevels.EXTREME_LOW_LEVEL
        this.result.vix.percentage = lowestPrice
      } else {
        // Within the same day both a high threshold and low threshold was reached?
        this.result.vix.dual_alert.alert = true
        this.result.vix.dual_alert.level = AlertLevels.EXTREME_LOW_LEVEL
        this.result.vix.dual_alert.percentage = lowestPrice
      }
    } else if (lowestPrice < this.settings.alerts.VIX.low_threshold) {
      if (!this.result.vix.alert) {
        this.result.vix.alert = true
        this.result.vix.level = AlertLevels.LOW_LEVEL
        this.result.vix.percentage = lowestPrice
      } else {
        // Within the same day both a high threshold and low threshold was reached?
        this.result.vix.dual_alert.alert = true
        this.result.vix.dual_alert.level = AlertLevels.LOW_LEVEL
        this.result.vix.dual_alert.percentage = lowestPrice
      }
    }

    this.result.vix.latest_close_price = latestVIXPoint.close
    this.result.vix.latest_time = latestVIXPoint.time
    this.result.vix.all_points = (todayPoints.length === maxDataPoints)
  }

  /**
   * Return the processed data result structure
   */
  getResult () {
    return this.result
  }

  resetResult () {
    this.result = {
      vix: {
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
      ppo: {
        bull: false,
        bear: false
      }
    }
  }
}

module.exports = DataProcessor
