class Process {
  constructor (settings, data) {
    this.settings = settings
    this.data = data
    this.levelEnum = Object.freeze({
      EXTREME_LOW_LEVEL: 1,
      LOW_LEVEL: 2,
      HIGH_LEVEL: 3,
      EXTREME_HIGH_LEVEL: 4
    })
    this.result = {
      alert: false,
      level: null,
      percentage: 0,
      lowest_close_price: 0,
      highest_close_price: 0,
      dual_alert: {
        alert: false,
        level: null,
        percentage: 0
      }
    }
  }

  /**
   * Process the intraday (15 min) candle data
   */
  processData() {
    // Calculate highest & lowest prices
    const highPrices = this.data.map(data => data.high) // Use high price for highest calc
    const highestPrice = Math.max(...highPrices)
    const lowPrices = this.data.map(data => data.low) // Use low price for lowest calc
    const lowestPrice = Math.min(...lowPrices)

    const closePrices = this.data.map(data => data.close)
    const lowestClosePrice = Math.min(...closePrices)
    const highestClosePrice = Math.max(...closePrices)

    if (highestPrice >= this.settings.alerts.extreme_high_threshold) {
      this.result.alert = true
      this.result.level = this.levelEnum.EXTREME_HIGH_LEVEL
      this.result.percentage = highestPrice
    } else if (highestPrice >= this.settings.alerts.high_threshold) {
      this.result.alert = true
      this.result.level = this.levelEnum.HIGH_LEVEL
      this.result.percentage = highestPrice
    }

    if (lowestPrice < this.settings.alerts.extreme_low_threshold) {
      if (!this.result.alert) {
        this.result.alert = true
        this.result.level = this.levelEnum.EXTREME_LOW_LEVEL
        this.result.percentage = lowestPrice
      } else {
        this.result.dual_alert.alert = true
        this.result.dual_alert.level = this.levelEnum.EXTREME_LOW_LEVEL
        this.result.dual_alert.percentage = lowestPrice  
      }
    } else if (lowestPrice < this.settings.alerts.low_threshold) {
      if (!this.result.alert) {
        this.result.alert = true
        this.result.level = this.levelEnum.LOW_LEVEL
        this.result.percentage = lowestPrice
      } else {
        this.result.dual_alert.alert = true
        this.result.dual_alert.level = this.levelEnum.LOW_LEVEL
        this.result.dual_alert.percentage = lowestPrice  
      }
    }

    this.result.lowest_close_price = lowestClosePrice
    this.result.highest_close_price = highestClosePrice
  }

  /**
   * Return the processed data result structure
   */
  getResult () {
    return this.result
  }
}

module.exports = Process
