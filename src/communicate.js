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
   * @param {Array} crosses Crosses in MACD
   * @param {String} symbolPair Crypto market symbol pair
   */
  sendCryptoMarketUpdate (crosses, symbolPair) {
    let messageSend = false
    for (const cross of crosses) {
      // Only send messages that are newer that the previous send onces (don't spam)
      const currentTime = cross.time.getTime()
      if (currentTime > this.prevLastCrossTime) {
        let message = '❗*Crypto Alert*❗\n ' + symbolPair + ' changed in market trend: '
        const dateString = Util.dateToString(cross.time, true)
        const symbolURI = symbolPair.replace(/\//g, '_') + 'T' // USDT
        const histogram = cross.hist.toFixed(4)
        const prevHistogram = cross.prevHist.toFixed(4)
        const high = cross.high.toFixed(1)
        const low = cross.low.toFixed(1)
        const close = cross.close.toFixed(1)
        switch (cross.type) {
          case 'bearish':
            message += 'towards a bearish trend 🧸. Don\'t forget to: Buy the dip.'
            message += `\n\nHistogram: ${histogram}% (before: ${prevHistogram}%). High: ${high}. Low: ${low}. Close: ${close}. MACD cross date: ${dateString}.`
            message += '\n\n[Open ' + symbolPair + ' Chart](https://www.binance.com/en/trade/' + symbolURI + '?layout=pro)'
            break
          case 'bullish':
            message += 'towards a bullish trend 🚀. Hodl!'
            message += `\n\nHistogram: ${histogram}% (before: ${prevHistogram}%). High: ${high}. Low: ${low}. Close: ${close}. MACD cross date: ${dateString}.`
            message += '\n\n[Open ' + symbolPair + ' Chart](https://www.binance.com/en/trade/' + symbolURI + '?layout=pro)'
            break
        }
        this.sendTelegramMessage(message)
        this.prevLastCrossTime = currentTime
        messageSend = true
      }
    }
    if (messageSend === false) {
      console.log('DEBUG: No crosses detected for ' + symbolPair + '. Don\'t send a message update.')
    }
  }

  /**
   * Helper method for sending the message to Telegram bot
   */
  sendTelegramMessage (message) {
    console.log('INFO: Try sending the following message to Telegram channel: ' + message)

    this.bot.sendMessage(this.botChatID, message, this.sendMessageOptions).catch(error => {
      console.log('ERROR: Could not send Telegram message: "' + message + '", due to error: ' + error.message)
    })
  }
}

module.exports = Communicate
