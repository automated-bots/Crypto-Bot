const Indicator = require('./indicator')

/**
 * @class EMA
 * Exponential Moving Average Indicator
 */
class EMA extends Indicator {
  /**
   * Create EMA indicator
   * @param {Number} length - Window length for EMA
   */
  constructor (length) {
    super()
    this.length = length
    this.result = false
  }

  /**
   * Update the EMA calculation
   * EMA = Price(t) * k + EMA(y) * (1 – k)
   * Where t = today, y = yesterday, N = number of days in EMA, k = 2 / (N+1)
   * @param {Number} price - current price
   */
  update (price) {
    // First time there is no previous result (using the current price)
    if (this.result === false) {
      this.result = price
    }
    // weight factor
    const k = 2 / (this.length + 1)
    // yesterday
    const y = this.result
    // calculation
    this.result = price * k + y * (1 - k)
  }

  /**
   * Get the latest result
   * @return The EMA value
   */
  getResult () {
    return this.result
  }
}

module.exports = EMA
