// NTBA = node-telegram-bot-api fixes
process.env.NTBA_FIX_319 = 1
process.env.NTBA_FIX_350 = 1
// Constants
const port = process.env.PORT || 3008
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
console.log('INFO: VIX index Cron time: \'' + cfg.tickers.volatility.cron_time + '\' with timezone: ' + cfg.tickers.volatility.cron_timezone)
console.log('INFO: GSPC index Cron time: \'' + cfg.tickers.stockmarket.cron_time + '\' with timezone: ' + cfg.tickers.stockmarket.cron_timezone)

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
app.get('/', (req, res) => res.send('<h1>Market data bot</h1> Market data index bot v' + version + '. <br/><br/>By: Melroy van den Berg'))

// Test APIs
app.get(`/test_api/${TEST_API_SECRET_HASH}/volatil`, (req, res) => {
  onTickVolatility()
  res.send('OK')
})
app.get(`/test_api/${TEST_API_SECRET_HASH}/stock`, (req, res) => {
  onTickStockMarket()
  res.send('OK')
})

// Start Express Server
app.listen(port, host, () => {
  console.log(`INFO: Market Alert Index Bot v${version} is now running on ${host} on port ${port}.`)
})

// Simple ping command
bot.onText(/\/ping/, () => {
  bot.sendMessage(cfg.telegram_settings.chat_id, 'Pong').catch(error => {
    console.log('ERROR: Could not send pong message, due to error: ' + error.message)
  })
})

// Create API Fetcher, data processor and communication instances
const fetcher = new Fetcher(cfg.exchange_settings)
const dataProcessor = new DataProcessor(cfg.tickers.volatility.alerts,
  cfg.tickers.stockmarket.warmup_period,
  cfg.tickers.stockmarket.data_period,
  cfg.tickers.stockmarket.indicators)
const comm = new Communicate(bot, cfg.tickers.volatility.alerts, cfg.telegram_settings.chat_id)

/**
 * Triggers on cron job
 */
function onTickVolatility () {
  // Get market data points
  fetcher.getData(cfg.tickers.volatility.params).then(data => {
    const result = dataProcessor.processVolatility(data)
    comm.sendVolatilityUpdate(result)
  })
    .catch(error => {
      console.error('Error: Something went wrong during getting or processing the volatility data. With message: ' + error.message + '. Stack:\n')
      console.log(error.stack)
    })
}

function onTickStockMarket () {
  // Get market data points
  fetcher.getData(cfg.tickers.stockmarket.params).then(data => {
    const result = dataProcessor.processStockMarket(data)
    comm.sendStockMarketUpdate(result)
  })
    .catch(error => {
      console.error('Error: Something went wrong during getting or processing the stock market data. With message: ' + error.message + '. Stack:\n')
      console.log(error.stack)
    })
}

// Cron job for onTickVolatility()
const job = new CronJob(cfg.tickers.volatility.cron_time, onTickVolatility, null, false, cfg.tickers.volatility.cron_timezone)
job.start()
console.log('INFO: Cron triggers scheduled for VIX (upcoming 6 shown):\n - ' + job.nextDates(6).join('\n - '))

// Cron job for onTickStockMarket()
const job2 = new CronJob(cfg.tickers.stockmarket.cron_time, onTickStockMarket, null, false, cfg.tickers.stockmarket.cron_timezone)
job2.start()
console.log('INFO: Cron triggers scheduled for GSPC (upcoming 3 shown):\n - ' + job2.nextDates(3).join('\n - '))
