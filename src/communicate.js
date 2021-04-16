const Util = require('./util')

class Communicate {
  /**
   * @param {Object} bot Telegram Bot Object
   * @param {Number} botChatID Chat ID number
   */
  constructor (bot, botChatID) {
    this.bot = bot
    this.botChatID = botChatID
    // Don't spam the channel, save the last MACD cross send-out
    this.prevLastCrossTime = 0
    this.sendMessageOptions = { parse_mode: 'markdown', disable_web_page_preview: true }
    // Notify channel about Bot booting-up (commented-out for now)
    this.sendTelegramMessage('Starting-up Bot... 🤓')
  }

  /**
   * Send message to Telegram channel about crypto market (only when needed).
   * It will send you a message whenever there is a MACD cross detected in the PPO histogram.
   *
   * @param {Object} result Crypto market result structure
   */
  sendCryptoMarketUpdate (result) {
    let messageSend = false
    for (const cross of result.crosses) {
      // Only send messages that are newer that the previous send onces (don't spam)
      const currentTime = cross.time.getTime()
      if (currentTime > this.prevLastCrossTime) {
        let message = '❗*Stock Alert*❗\nS&P 500 index (^GSPC) changed in market trend: '
        const dateString = Util.dateToString(cross.time, true)
        const histogram = cross.hist.toFixed(4)
        const prevHistogram = cross.prevHist.toFixed(4)
        const high = cross.high.toFixed(1)
        const low = cross.low.toFixed(1)
        const close = cross.close.toFixed(1)
        switch (cross.type) {
          case 'bearish':
            message += 'towards a bearish trend 🌧.'
            message += `\n\nHistogram: ${histogram}% (before: ${prevHistogram}%). High: ${high}. Low: ${low}. Close: ${close}. MACD cross date: ${dateString}.`
            message += '\n\n[Open ^GSPC Chart](https://finance.yahoo.com/chart/^GSPC)'
            break
          case 'bullish':
            message += 'towards a bullish trend 🔆!'
            message += `\n\nHistogram: ${histogram}% (before: ${prevHistogram}%). High: ${high}. Low: ${low}. Close: ${close}. MACD cross date: ${dateString}.`
            message += '\n\n[Open ^GSPC Chart](https://finance.yahoo.com/chart/^GSPC)'
            break
        }
        this.sendTelegramMessage(message)
        this.prevLastCrossTime = currentTime
        messageSend = true
      }
    }
    if (messageSend === false) {
      console.log('DEBUG: No GSPC crosses detected. Don\'t send a message update.')
    }
  }

  /**
   * Helper method for sending the message to Telegram bot
   */
  sendTelegramMessage (message) {
    console.log('INFO: Sending following message to Telegram channel: ' + message)

    this.bot.sendMessage(this.botChatID, message, this.sendMessageOptions).catch(error => {
      console.log('ERROR: Could not send Telegram message: "' + message + '", due to error: ' + error.message)
    })
  }
}

module.exports = Communicate
