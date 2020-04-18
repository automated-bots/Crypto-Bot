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
    this.sendMessageOptions = { parse_mode: 'markdown', disable_web_page_preview: false }
    // Notify channel about Bot booting-up
    this.sendTelegramMessage('Starting-up Bot...')
  }

  /**
   * Send message to Telegram channel (only when needed)
   * @param {Object} result - result from processor class
   */
  send (result) {
    let message = '*Stock Alert* -- ^VIX ticker changed alert level: '
    // Inform the user regarding the change in alert level
    message += this.volatilityAlertToString(result.volatility.level)
    // console.log(result)

    if (result.volatility.alert && result.volatility.level !== AlertLevels.NO_ALERT) {
      if (this.prevVolatilityAlertLevel !== result.volatility.level) {
        message += '\n\n'
        const dateString = Util.dateToString(result.volatility.latest_time)
        message += `CBOE Volatility Index (VIX): *${result.volatility.percentage}%*. Latest close: ${result.volatility.latest_close_price}. Latest date: ${dateString}.`
        if (result.volatility.all_points) {
          message += ' _Market is closed now._'
        }
        this.sendTelegramMessage(message)

        // Process dual-alert (if applicable)
        if (result.volatility.dual_alert.alert) {
          let dualMessage = '*Stock Alert* -- VIX ticker changed twice the alert level within a day: '
          dualMessage += this.volatilityAlertToString(result.volatility.dual_alert.level) + '!\n'
          dualMessage += `CBOE Volatility Index (^VIX): *${result.volatility.dual_alert.percentage}%*`
          this.sendTelegramMessage(dualMessage)
        }
        // Set current level as previous
        this.prevVolatilityAlertLevel = result.volatility.level
      }
    } else {
      // Back to normal: curently no alert and still a change in alert level (with respect to previous alert level)
      if (this.prevVolatilityAlertLevel !== result.volatility.level) {
        this.sendTelegramMessage(message)
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
