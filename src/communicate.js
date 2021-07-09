const Util = require('./util')
const fs = require('fs')

class Communicate {
  /**
   * @param {Object} bot Telegram Bot Object
   * @param {Number} botChatID Chat ID number
   */
  constructor (bot, botChatID) {
    this.bot = bot
    this.botChatID = botChatID
    this.sendMessageOptions = { parse_mode: 'markdown', disable_web_page_preview: true }
    // Notify channel about Bot booting-up (commented-out for now)
    this.sendTelegramMessage('(Re)starting-up Bot... 🤓')
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
    const tempFilename = './tmp-' + symbolPair.replace(/\//g, '_') + '-data.json'

    for (const cross of crosses) {
      let sendMessage = false
      const currentTime = cross.time.getTime()

      if (fs.existsSync(tempFilename)) {
        const data = this.readContent(tempFilename)
        sendMessage = (currentTime > data.time)
      } else {
        sendMessage = true // Always send a message the first time, if file does not yet exists.
      }

      // Only send messages that are newer that the previous send onces
      if (sendMessage) {
        let message = '❗*Crypto Alert*❗\n ' + symbolPair + ' changed in market trend: '
        const dateString = Util.dateToString(cross.time, true)
        const symbolURI = symbolPair.replace(/\//g, '_B') // BUSD
        const histogram = cross.hist.toFixed(4)
        const prevHistogram = cross.prevHist.toFixed(4)
        const high = cross.high.toFixed(1)
        const low = cross.low.toFixed(1)
        const close = cross.close.toFixed(1)
        switch (cross.type) {
          case 'bearish':
            message += 'towards a bearish trend 🧸. Don\'t forget to: Buy the dip.'
            break
          case 'bullish':
            message += 'towards a bullish trend 🚀. To the moon! Hodl.'
            break
        }
        message += `\n\nHistogram: ${histogram}% (before: ${prevHistogram}%). High: ${high}. Low: ${low}. Close: ${close}. MACD cross date: ${dateString}.`
        message += '\n\n[Open ' + symbolPair + ' Chart](https://www.binance.com/en/trade/' + symbolURI + '?layout=pro)'
        this.sendTelegramMessage(message)
        messageSend = true // Only used for debug console message
        // Write data to disk
        this.writeContent(tempFilename, {
          time: currentTime
        })
      }
    }
    if (messageSend === false) {
      console.log('DEBUG: No MACD crosses detected for ' + symbolPair + '. Do not send a message update.')
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

  /**
   * Read content from file
   * @param {String} fileName file name
   * @returns content
   */
  readContent (fileName) {
    let data = {}
    try {
      const raw = fs.readFileSync(fileName)
      data = JSON.parse(raw)
    } catch (err) {
      console.error(err)
    }
    return data
  }

  /**
   * Write content to file
   * @param {String} fileName file name
   * @param {Object} content data
   */
  writeContent (fileName, content) {
    const data = JSON.stringify(content)
    try {
      fs.writeFileSync(fileName, data)
    } catch (err) {
      console.error(err)
    }
  }
}

module.exports = Communicate
