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
global.TelegramSecretHash = crypto.randomBytes(20).toString('hex')
const apiTestRandomHash = crypto.randomBytes(40).toString('hex')
const TelegramBot = require('node-telegram-bot-api')
const express = require('express')
// const cors = require('cors')
const Communicate = require('./communicate')
const { version } = require('../package.json')
const app = express()
const telegramRouter = require('./routes/telegram')

const cfg = YAML.parse(fs.readFileSync('config.yml', 'utf8').toString())
if (!cfg) {
  throw new Error('Please create a config.yml file.')
}
if (cfg.exchange_settings.use_cache) {
  console.log('INFO: Cached market data files will be used (if available).')
}

console.log('INFO: Current test API hash: ' + apiTestRandomHash)
console.log('INFO: VIX index Cron time: \'' + cfg.tickers.volatility.cron_time + '\' with timezone: ' + cfg.tickers.volatility.cron_timezone)
console.log('INFO: GSPC index Cron time: \'' + cfg.tickers.stockmarket.cron_time + '\' with timezone: ' + cfg.tickers.stockmarket.cron_timezone)

const bot = new TelegramBot(cfg.telegram_settings.bot_token)
bot.setWebHook(`${cfg.telegram_settings.public_url}/telegram/bot${TelegramSecretHash}`)
bot.onText(/\/start/, (msg) => {
  console.log('INFO: Set chat id: ' + msg.chat.id)
  app.set('chat_id', msg.chat.id)
})

// app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.set('telegram_bot', bot)

app.get('/', (req, res) => res.send('Market data bot v' + version))
app.use('/telegram', telegramRouter)
app.get(`/test_api/${apiTestRandomHash}/volatil`, (req, res) => {
  onTickVolatility()
  res.send('OK')
})
app.get(`/test_api/${apiTestRandomHash}/stock`, (req, res) => {
  onTickStockMarket()
  res.send('OK')
})

app.listen(port, host, () => {
  console.log(`INFO: Market Alert Bot v${version} is now running on ${host} on port ${port}.`)
})

// Create API Fetcher, data processor and communication instances
const fetcher = new Fetcher(cfg.exchange_settings)
const dataProcessor = new DataProcessor(cfg.tickers.volatility.alerts,
  cfg.tickers.stockmarket.warmup_period,
  cfg.tickers.stockmarket.data_period,
  cfg.tickers.stockmarket.indicators)
const comm = new Communicate(cfg.tickers.volatility.alerts, bot, cfg.telegram_settings.chat_id)

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
