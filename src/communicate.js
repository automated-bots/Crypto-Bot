const AlertLevels = require('./alertLevelsEnum')
const Util = require('./util')

class Communicate {
  /**
   * @param {Dict} volatilityAlerts Volatility alert thresholds
   * @param {Object} bot Telegram Bot Object
   * @param {Number} botChatID Chat ID number
   */
  constructor (volatilityAlerts, bot, botChatID) {
    this.volatilityAlerts = volatilityAlerts
    this.bot = bot
    this.botChatID = botChatID
    // Don't spam the channel, save the previous alert to compare for changes
    this.prevVolatilityAlertLevel = AlertLevels.NO_ALERT
    // Don't spam the channel, save the last MACD cross send-out
    this.prevLastCrossTime = 0
    this.sendMessageOptions = { parse_mode: 'markdown', disable_web_page_preview: false }
    // Notify channel about Bot booting-up
    this.sendTelegramMessage('Starting-up Bot...')
  }

  /**
   * Send message to Telegram channel about volatility (only when needed)
   * @param {Object} result Volatility result structure
   */
  sendVolatilityUpdate (result) {
    let message = '❗*Stock Alert*❗ -- ^VIX ticker changed alert level: '
    // Inform the user regarding the change in alert level
    message += this.volatilityAlertToString(result.level)

    if (result.alert && result.level !== AlertLevels.NO_ALERT) {
      if (this.prevVolatilityAlertLevel !== result.level) {
        message += '\n\n'
        const dateString = Util.dateToString(result.latest_time)
        message += `CBOE Volatility Index (VIX): *${result.percentage}%*. Latest close: ${result.latest_close_price}. Latest date: ${dateString}.`
        if (result.all_points) {
          message += ' _Market is closed now._'
        }
        this.sendTelegramMessage(message)

        // Process dual-alert (if applicable)
        if (result.dual_alert.alert) {
          let dualMessage = '❗*Stock Alert*❗ -- VIX ticker changed twice the alert level within a day: '
          dualMessage += this.volatilityAlertToString(result.dual_alert.level) + '!\n'
          dualMessage += `CBOE Volatility Index (^VIX): *${result.dual_alert.percentage}%*`
          this.sendTelegramMessage(dualMessage)
        }
        // Set current level as previous
        this.prevVolatilityAlertLevel = result.level
      }
    } else {
      // Back to normal: curently no alert and still a change in alert level (with respect to previous alert level)
      if (this.prevVolatilityAlertLevel !== result.level) {
        this.sendTelegramMessage(message)
      }
    }
  }

  /**
   * Send message to Telegram channel about stock market (only when needed)
   * @param {Object} result Stock market result structure
   */
  sendStockMarketUpdate (result) {
    for (const cross of result.crosses) {
      // Only send messages that are newer that the previous send onces (don't spam)
      const currentTime = cross.time.getTime()
      if (currentTime > this.prevLastCrossTime) {
        let message = '❗*Stock Alert*❗ -- S&P 500 index (^GSPC) changed in market trend: '
        const dateString = Util.dateToString(cross.time, true)
        const histogram = cross.hist.toFixed(4)
        const prevHistogram = cross.prevHist.toFixed(4)
        const high = cross.high.toFixed(1)
        const low = cross.low.toFixed(1)
        const close = cross.close.toFixed(1)
        switch (cross.type) {
          case 'bearish':
            message += `towards a bearish trend 🌧. Histogram: ${histogram}% (before: ${prevHistogram}%). High: ${high} Low: ${low} Close: ${close}. Date: ${dateString}`
            break
          case 'bullish':
            message += `towards a bullish trend 🔆! Histogram: ${histogram}% (before: ${prevHistogram}%). High: ${high} Low: ${low} Close: ${close}. Date: ${dateString}`
            break
        }
        this.sendTelegramMessage(message)
        this.prevLastCrossTime = currentTime
      }
    }
  }

  /**
   * Helper method for sending the message to Telegram bot
   */
  sendTelegramMessage (message) {
    this.bot.sendMessage(this.botChatID, message, this.sendMessageOptions).catch(error => {
      console.log('ERROR: Could not send Telegram message: "' + message + '", due to error: ' + error.message)
    })
  }

  /**
   * Convert volatility alert number to string
   * @param {number} level - Alert level (alert levels enum)
   */
  volatilityAlertToString (level) {
    switch (level) {
      case AlertLevels.NO_ALERT:
        return `^VIX returned to normal levels (>= ${this.volatilityAlerts.low_threshold}% and < ${this.volatilityAlerts.high_threshold}%). No alert.`
      case AlertLevels.EXTREME_LOW_LEVEL:
        return `Extreme low limit threshold (${this.volatilityAlerts.extreme_low_threshold}%) of ^VIX has been reached.`
      case AlertLevels.LOW_LEVEL:
        return `Low limit threshold (${this.volatilityAlerts.low_threshold}%) of ^VIX has been reached.`
      case AlertLevels.HIGH_LEVEL:
        return `High limit threshold (${this.volatilityAlerts.high_threshold}%) of ^VIX has been reached.`
      case AlertLevels.EXTREME_HIGH_LEVEL:
        return `Extreme high limit threshold (${this.volatilityAlerts.extreme_high_threshold}%) of ^VIX has been reached.`
      default:
        return 'Error: Unknown alert level?'
    }
  }
}

module.exports = Communicate
