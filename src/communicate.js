const AlertLevels = require('./alertLevelsEnum')

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
   * @param {Object} result - Result from process class
   */
  send (result) {
    let message = '*Stock Alert* -- VIX ticker changed alert level: '
    if (result.alert) {
      if (this.previousAlertLevel !== result.level) {
        // Inform the user regarding the change in alert level
        message += this.alertToString(result.level)

        if (result.level !== AlertLevels.NO_ALERT) {
          message += '\n\n'
          const date = new Date(result.latest_time)
          const dateString = date.getFullYear() + '-' +
            this.appendLeadingZeroes(date.getMonth() + 1) + '-' +
            this.appendLeadingZeroes(date.getDate()) + ' ' +
            this.appendLeadingZeroes(date.getHours()) + ':' +
            this.appendLeadingZeroes(date.getMinutes())
          message += `CBOE Volatility Index (VIX): *${result.percentage}%*. Latest close: ${result.latest_close_price}. Latest date: ${dateString}.`
          if (result.all_points) {
            message += ' _Market is closed now._'
          }
        }
        this.sendTelegramMessage(message)

        // Process dual-alert (if applicable)
        if (result.dual_alert.alert) {
          let dualMessage = '*Stock Alert* -- VIX ticker changed twice the alert level within a day: '
          dualMessage += this.alertToString(result.dual_alert.level) + '!\n'
          dualMessage += `CBOE Volatility Index (^VIX): *${result.dual_alert.percentage}%*`
          this.sendTelegramMessage(dualMessage)
        }
        // Set current level as previous
        this.previousAlertLevel = result.level
      }
    }
  }

  /**
   * Helper method for sending the message to Telegram bot
   */
  sendTelegramMessage (message) {
    this.bot.sendMessage(this.settings.telegram_chat_id, message, this.sendMessageOptions)
  }

  /**
   * Convert alert number to string
   * @param {number} level - Alert level (alert levels enum)
   */
  alertToString (level) {
    switch (level) {
      case AlertLevels.NO_ALERT:
        return 'Situation returned to normal level (no alert).'
      case AlertLevels.EXTREME_LOW_LEVEL:
        return `Extreme low limit threshold (${this.settings.alerts.extreme_low_threshold}%) of VIX has been reached.`
      case AlertLevels.LOW_LEVEL:
        return `Low limit threshold (${this.settings.alerts.low_threshold}%) of VIX has been reached.`
      case AlertLevels.HIGH_LEVEL:
        return `High limit threshold (${this.settings.alerts.high_threshold}%) of VIX has been reached.`
      case AlertLevels.EXTREME_HIGH_LEVEL:
        return `Extreme high limit threshold (${this.settings.alerts.extreme_high_threshold}%) of VIX has been reached.`
      default:
        return 'Error: Unknown alert level?'
    }
  }

  appendLeadingZeroes (n) {
    if (n <= 9) {
      return '0' + n
    }
    return n
  }
}

module.exports = Communicate
