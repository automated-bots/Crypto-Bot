const Indicator = require('./indicator')
const EMA = require('./ema')

/**
 * @class PPO
 * Percentage Price Oscillator (PPO), it's a percentage version of MACD
 */
class PPO extends Indicator {
  /**
     * Create Percentage Price Oscillator (PPO) indicator
     * @param {Number} shortLength - Short period length
     * @param {Number} longLength - Long period length
     * @param {Number} signalLength - Signal line period length over the PPO (eg. like 9)
     */
  constructor (shortLength, longLength, signalLength) {
    super()
    this.ppo = false
    this.short = new EMA(shortLength)
    this.long = new EMA(longLength)
    this.signal = new EMA(signalLength)
  }

  /**
     * Update the PPO calculation:
     *  PPO = ((shorter-period EMA − longer-period EMA)/long-period EMA) * 100
     *  Signal = EMA of the PPO
     *  Histogram/divergent = PPO - signal
     * @param {Number} price - current price
     */
  update (price) {
    this.short.update(price)
    this.long.update(price)
    const short = this.short.getResult()
    const long = this.long.getResult()
    this.ppo = long === false ? 0 : ((short - long) / long) * 100.0
    this.signal.update(this.ppo)
    this.hist = this.ppo - this.signal.getResult()
  }

  /**
     * Get the latest results
     * @return Return ppo, signal and histogram values with keys: 'ppo', 'signal' and 'hist'
     */
  getResult () {
    return {
      ppo: this.ppo,
      hist: this.hist,
      signal: this.signal.getResult()
    }
  }
}

module.exports = PPO
