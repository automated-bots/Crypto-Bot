/**
 * Candle helper class
 */
class Candle {
  /**
   * Create an index candle
   * @param {number} O - Open
   * @param {number} H - High
   * @param {number} L - Low
   * @param {number} C - Close
   * @param {number} time - Datetime
   */
  static createIndex (O, H, L, C, time) {
    return {
      time,
      open: O,
      high: H,
      low: L,
      close: C
    }
  }

  /**
   * Create a stock candle
   * @param {number} O - Open
   * @param {number} H - High
   * @param {number} L - Low
   * @param {number} C - Close
   * @param {number} time - Datetime
   * @param {number} volume
   * @param {number} trades
   */
  static createStock (O, H, L, C, time, volume, trades) {
    return {
      time,
      open: O,
      high: H,
      low: L,
      close: C,
      volume,
      trades
    }
  }
}

module.exports = Candle
