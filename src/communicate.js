const AlertLevels = require('./alertLevelsEnum')
const Util = require('./util')

class Communicate {
  constructor (settings, bot) {
    this.settings = settings
    this.bot = bot
    this.previousAlertLevel = AlertLevels.NO_ALERT
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
    message += this.vixAlertToString(result.vix.level)
    console.log(result)

    if (result.vix.alert && result.vix.level !== AlertLevels.NO_ALERT) {
      if (this.previousAlertLevel !== result.vix.level) {
        message += '\n\n'
        const dateString = Util.dateToString(result.vix.latest_time)
        message += `CBOE Volatility Index (VIX): *${result.vix.percentage}%*. Latest close: ${result.vix.latest_close_price}. Latest date: ${dateString}.`
        if (result.vix.all_points) {
          message += ' _Market is closed now._'
        }
        this.sendTelegramMessage(message)

        // Process dual-alert (if applicable)
        if (result.vix.dual_alert.alert) {
          let dualMessage = '*Stock Alert* -- VIX ticker changed twice the alert level within a day: '
          dualMessage += this.vixAlertToString(result.vix.dual_alert.level) + '!\n'
          dualMessage += `CBOE Volatility Index (^VIX): *${result.vix.dual_alert.percentage}%*`
          this.sendTelegramMessage(dualMessage)
        }
        // Set current level as previous
        this.previousAlertLevel = result.vix.level
      }
    } else {
      // Back to normal: curently no alert and still a change in alert level (with respect to previous alert level)
      if (this.previousAlertLevel !== result.vix.level) {
        this.sendTelegramMessage(message)
      }
    }
  }

  /**
   * Helper method for sending the message to Telegram bot
   */
  sendTelegramMessage (message) {
    this.bot.sendMessage(this.settings.telegram_chat_id, message, this.sendMessageOptions).catch(error => {
      console.log('ERROR: Could not send Telegram message: "' + message + '", due to error: ' + error.message)
    })
  }

  /**
   * Convert ^VIX alert number to string
   * @param {number} level - Alert level (alert levels enum)
   */
  vixAlertToString (level) {
    switch (level) {
      case AlertLevels.NO_ALERT:
        return `^VIX returned to normal levels (>= ${this.settings.alerts.VIX.low_threshold}% and < ${this.settings.alerts.VIX.high_threshold}%). No alert.`
      case AlertLevels.EXTREME_LOW_LEVEL:
        return `Extreme low limit threshold (${this.settings.alerts.VIX.extreme_low_threshold}%) of ^VIX has been reached.`
      case AlertLevels.LOW_LEVEL:
        return `Low limit threshold (${this.settings.alerts.VIX.low_threshold}%) of ^VIX has been reached.`
      case AlertLevels.HIGH_LEVEL:
        return `High limit threshold (${this.settings.alerts.VIX.high_threshold}%) of ^VIX has been reached.`
      case AlertLevels.EXTREME_HIGH_LEVEL:
        return `Extreme high limit threshold (${this.settings.alerts.VIX.extreme_high_threshold}%) of ^VIX has been reached.`
      default:
        return 'Error: Unknown alert level?'
    }
  }
}

module.exports = Communicate
