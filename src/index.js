// NTBA = node-telegram-bot-api fixes
process.env.NTBA_FIX_319 = 1
process.env.NTBA_FIX_350 = 1
// Constants
const port = process.env.PORT || 3010
const host = process.env.HOST || '0.0.0.0'

const fs = require('fs')
const YAML = require('yaml')
const Fetcher = require('./fetcher')
const DataProcessor = require('./dataProcessor')
const CronJob = require('cron').CronJob
const crypto = require('crypto')
const TELEGRAM_SECRET_HASH = crypto.randomBytes(20).toString('hex')
const TEST_API_SECRET_HASH = crypto.randomBytes(40).toString('hex')
const TelegramBot = require('node-telegram-bot-api')
const express = require('express')
const Communicate = require('./communicate')
const { version } = require('../package.json')

const cfg = YAML.parse(fs.readFileSync('config.yml', 'utf8').toString())
if (!cfg) {
  throw new Error('Please create a config.yml file.')
}
if (cfg.exchange_settings.use_cache) {
  console.log('WARN: Cached market data files will be used (if available).')
}

console.log('INFO: Using Telegram channel chat ID: ' + cfg.telegram_settings.chat_id)
console.log('INFO: Current test API hash: ' + TEST_API_SECRET_HASH)
console.log('INFO: Current crypto coins will be tracked: ' + cfg.tickers.params.crypto_symbols_pairs)

// Setup Telegram bot
const bot = new TelegramBot(cfg.telegram_settings.bot_token)

// Inform the Telegram servers of the new webhook url
bot.setWebHook(`${cfg.telegram_settings.public_url}/bot${TELEGRAM_SECRET_HASH}`)

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Receive Telegram updates
app.post(`/bot${TELEGRAM_SECRET_HASH}`, (req, res) => {
  bot.processUpdate(req.body)
  res.sendStatus(200)
})
// Display version
app.get('/', (req, res) => res.send('<h1>Crypto Alert bot</h1> Crypto alert bot v' + version + '. <br/><br/>By: Melroy van den Berg'))

// Test APIs
app.get(`/test_api/${TEST_API_SECRET_HASH}/crypto`, (req, res) => {
  onTickCryptoExchange()
  res.send('OK')
})

// Start Express Server
app.listen(port, host, () => {
  console.log(`INFO: Crypto Exchange Bot v${version} is now running on ${host} on port ${port}.`)
})

// Simple ping command
bot.onText(/\/ping/, () => {
  bot.sendMessage(cfg.telegram_settings.chat_id, 'Pong').catch(error => {
    console.log('ERROR: Could not send pong message, due to error: ' + error.message)
  })
})

/*
// For testing only
const bot = {}
bot.sendMessage = (a, b, c) => {
  return new Promise(function (resolve, reject) {
    reject(new Error('This is just a drill'))
  })
} */

// Create API Fetcher, data processor and communication instances
const fetcher = new Fetcher(cfg.exchange_settings)
const dataProcessor = new DataProcessor(
  cfg.tickers.warmup_period,
  cfg.tickers.data_period,
  cfg.tickers.indicators)
const comm = new Communicate(bot, cfg.telegram_settings.chat_id)

/**
 * Trigger for cron job
 */
function onTickCryptoExchange () {
  // Get Crypto data points for all crypto pairs at once
  fetcher.getData(cfg.tickers.params)
    .then(dataList => {
      // Loop over all the crypto symbols pairs
      for (const data of dataList) {
        const crosses = dataProcessor.processCryptoMarket(data)
        comm.sendCryptoMarketUpdate(crosses, data.symbol)
      }
    })
    .catch(error => {
      console.error('Error: Something went wrong during getting or processing the stock market data. With message: ' + error.message + '. Stack:\n')
      console.log(error.stack)
    })
}

// Cron job for onTickCryptoExchange()
// Note: set utcOffset to zero (UTC)
const job = new CronJob(cfg.tickers.cron_time, onTickCryptoExchange, null, false, null, null, null, 0)
job.start()
console.log('INFO: Cron triggers scheduled for (upcoming 10 shown):\n - ' + job.nextDates(10).join('\n - '))
