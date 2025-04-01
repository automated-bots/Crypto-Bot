const Util = require('./util')
const fs = require('fs')
const logger = require('./logger')

class Communicate {
  /**
   * @param {Object} bot Telegram Bot Object
   * @param {Number} botChatID Chat ID number
   */
  constructor (bot, botChatID) {
    this.bot = bot
    this.botChatID = botChatID
    this.sendMessageOptions = { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
  }

  /**
   * Send message to Telegram channel about crypto market (only when needed).
   * It will send you a message whenever there is a MACD cross detected in the PPO histogram.
   *
   * @param {Array} crosses Crosses in MACD
   * @param {String} symbolPair Crypto market symbol pair
   * @param {String} name Full crypto name
   */
  sendCryptoMarketUpdate (crosses, symbolPair, name) {
    let messageSend = false
    const tempFilename = 'tmp-' + symbolPair.replace(/\//g, '_') + '-data.json'
    const tempFilePath = `./tmp/${tempFilename}`

    for (const cross of crosses) {
      let sendMessage = false
      const currentTime = cross.time.getTime()

      if (fs.existsSync(tempFilePath)) {
        const data = this.readContent(tempFilePath)
        // Check if the current MACD cross time is later than the previous stored time.
        // If this is true, we found a new MACD cross on the PPO indicator! So let's send an update message.
        sendMessage = (currentTime > data.time)
      } else {
        logger.warn('WARN: Missing crypto temp file on disk (' + tempFilename + '). First run/trigger?')
        sendMessage = true // Always send a message the first time, if file does not yet exists.
      }

      // Only send messages that are newer that the previous send onces
      if (sendMessage) {
        // Only for DOT change the symbolPair to another symbol pair, because TwelveData is strange
        if (symbolPair.startsWith('pDOTn')) {
          symbolPair = 'DOT/USD'
        }
        // Markdownv2 ready format
        symbolPair = symbolPair.replaceAll('.', '\\.').replaceAll('-', '\\-').replaceAll('+', '\\+').replaceAll('_', '\\_')
        let message = '❗*Crypto Alert*❗\n ' + name + ' \\(' + symbolPair + '\\) changed in market trend: '
        const dateString = Util.dateToString(cross.time, true)
        const symbolURITradingView = symbolPair.replace(/\//g, '') // USD, only remove the slash
        const histogram = cross.hist.toFixed(4).toString().replace('.', '\\.').replace('-', '\\-')
        const prevHistogram = cross.prevHist.toFixed(4).toString().replace('.', '\\.').replace('-', '\\-')
        const high = cross.high.toFixed(1).toString().replace('.', '\\.')
        const low = cross.low.toFixed(1).toString().replace('.', '\\.')
        const close = cross.close.toFixed(1).toString().replace('.', '\\.')
        switch (cross.type) {
          case 'bearish':
            message += 'towards a bearish trend 🧸\\. Don\'t forget to: Buy the dip\\.'
            break
          case 'bullish':
            message += 'towards a bullish trend 🚀\\. To the moon\\! Hodl\\.'
            break
        }
        message += `\n\nHistogram: ${histogram}% \\(before: ${prevHistogram}%\\)\\. High: ${high}\\. Low: ${low}\\. Close: ${close}\\. MACD cross date: ${dateString}\\.`
        message += '\n\n[Open ' + symbolPair + ' chart \\(TradingView\\)](https://www.tradingview.com/chart?symbol=Binance:' + symbolURITradingView + ')'

        this.sendTelegramMessage(message)
        messageSend = true // Only used for debugging towards pino logger
        // Write data to disk
        this.writeContent(tempFilePath, {
          time: currentTime
        })
      }
    }
    if (messageSend === false) {
      logger.debug('No new MACD crosses detected for ' + symbolPair + '. Don\'t send update.')
    }
  }

  /**
   * Helper method for sending the message to Telegram bot
   */
  sendTelegramMessage (message) {
    logger.info('Sending message send to Telegram: ' + message)

    this.bot.sendMessage(this.botChatID, message, this.sendMessageOptions).catch(error => {
      logger.error('ERROR: Could not send Telegram message: "' + message + '", due to error: ' + error.message)
      global.ErrorState = true
    })
  }

  /**
   * Read content from file
   * @param {String} fileName file name
   * @returns content
   */
  readContent (fileName) {
    try {
      const raw = fs.readFileSync(fileName)
      return JSON.parse(raw)
    } catch (err) {
      logger.error(err)
    }
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
      logger.error(err)
    }
  }
}

module.exports = Communicate
