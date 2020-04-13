const AlertLevels = require('./alertLevelsEnum')

class Process {
  constructor (settings, data) {
    this.settings = settings
    this.data = data
    this.result = {
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
  }

  /**
   * Process the intraday (5 min) candle data,
   * only process the latest day data points
   */
  processData () {
    // NYSE Marker opening hours: 9:30 - 16:00 = 6.5 hours open = 390 min.
    // Max data points = 390 min. / 5 .min interval = 78
    const maxDataPoints = 78

    const latestPoint = this.data[this.data.length - 1]
    const startOfLastDayEpoch = new Date(new Date(latestPoint.time).toDateString()).getTime()
    const today = this.data.filter(data => data.time >= startOfLastDayEpoch)

    // Calculate highest & lowest prices
    const highPrices = today.map(data => data.high) // Use high price for highest calc
    const highestPrice = Math.max(...highPrices)
    const lowPrices = today.map(data => data.low) // Use low price for lowest calc
    const lowestPrice = Math.min(...lowPrices)

    if (highestPrice >= this.settings.alerts.extreme_high_threshold) {
      this.result.alert = true
      this.result.level = AlertLevels.EXTREME_HIGH_LEVEL
      this.result.percentage = highestPrice
    } else if (highestPrice >= this.settings.alerts.high_threshold) {
      this.result.alert = true
      this.result.level = AlertLevels.HIGH_LEVEL
      this.result.percentage = highestPrice
    }

    if (lowestPrice < this.settings.alerts.extreme_low_threshold) {
      if (!this.result.alert) {
        this.result.alert = true
        this.result.level = AlertLevels.EXTREME_LOW_LEVEL
        this.result.percentage = lowestPrice
      } else {
        // Within the same day both a high threshold and low threshold was reached?
        this.result.dual_alert.alert = true
        this.result.dual_alert.level = AlertLevels.EXTREME_LOW_LEVEL
        this.result.dual_alert.percentage = lowestPrice
      }
    } else if (lowestPrice < this.settings.alerts.low_threshold) {
      if (!this.result.alert) {
        this.result.alert = true
        this.result.level = AlertLevels.LOW_LEVEL
        this.result.percentage = lowestPrice
      } else {
        // Within the same day both a high threshold and low threshold was reached?
        this.result.dual_alert.alert = true
        this.result.dual_alert.level = AlertLevels.LOW_LEVEL
        this.result.dual_alert.percentage = lowestPrice
      }
    }

    this.result.latest_close_price = latestPoint.close
    this.result.latest_time = latestPoint.time
    this.result.all_points = (today.length === maxDataPoints)
  }

  /**
   * Return the processed data result structure
   */
  getResult () {
    return this.result
  }
}

module.exports = Process
