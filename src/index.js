// NTBA = node-telegram-bot-api fixes
process.env['NTBA_FIX_319'] = 1
process.env['NTBA_FIX_350'] = 1

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const YAML = require('yaml')
const Fetcher = require('./fetcher')
const DataProcessor = require('./dataProcessor')
const CronJob = require('cron').CronJob
const TelegramBot = require('node-telegram-bot-api')
const Communicate = require('./communicate')
const { version } = require('../package.json')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const port = process.env.PORT || 3008

const cfg = YAML.parse(fs.readFileSync('config.yml', 'utf8').toString())
if (!cfg) {
  throw new Error('Please create a config.yml file.')
}
if (cfg.exchange_settings.use_cache) {
  console.log('INFO: Cached market data files will be used (if available).')
}

console.log('INFO: ^VIX Cron time: \'' + cfg.tickers.volatility.cron_time + '\' with timezone: ' + cfg.tickers.volatility.cron_timezone)
console.log('INFO: ^GSPC Cron time: \'' + cfg.tickers.stockmarket.cron_time + '\' with timezone: ' + cfg.tickers.stockmarket.cron_timezone)

const bot = new TelegramBot(cfg.telegram_settings.bot_token)
// Informs Telegram servers of the new webhook
bot.setWebHook(`${cfg.telegram_settings.public_url}/bot/${cfg.telegram_settings.bot_token}`).catch(error => {
  console.log('ERROR: Telegram webhook setup failed: ' + error.message)
})

app.get('/', (req, res) => res.send('Market data bot v' + version))
// We are receiving updates at the route below
app.post(`/bot/${cfg.telegram_settings.bot_token}`, (req, res) => {
  bot.processUpdate(req.body)
  res.sendStatus(200)
})
app.listen(port, () => {
  console.log(`INFO: Market Alert Bot v${version} is running on port ${port}!`)
})

// Create API Fetcher, data process and communication instances
const fetcher = new Fetcher(cfg.exchange_settings)
const dataProcessor = new DataProcessor(cfg.tickers.volatility.alerts, cfg.tickers.stockmarket.indicators)
const comm = new Communicate(cfg.tickers.volatility.alerts, bot, cfg.telegram_settings.chat_id)

/**
 * Triggers on cron job
 */
function onTickVolatility () {
  // Get market data points
  fetcher.getData(cfg.tickers.volatility.params).then(data => {
    dataProcessor.processVolatility(data)
    // Get the result and send it to the communicate class
    comm.send(dataProcessor.getResult())
    // Restore to defaults
    dataProcessor.resetResult()
  })
    .catch(error => {
      console.error('Error: Something went wrong during getting or processing the volatility data:\n')
      console.log(error.stack)
    })
}

function onTickStockMarket () {
  // Get market data points
  fetcher.getData(cfg.tickers.stockmarket.params).then(data => {
    dataProcessor.processStockMarket(data)
    // Get the result and send it to the communicate class
    comm.send(dataProcessor.getResult())
    // Restore to defaults
    dataProcessor.resetResult()
  })
    .catch(error => {
      console.error('Error: Something went wrong during getting or processing the stock market data:\n')
      console.log(error.stack)
    })
}

// Cron job for onTickVolatility()
const job = new CronJob(cfg.tickers.volatility.cron_time, onTickVolatility, null, false, cfg.tickers.volatility.cron_timezone)
job.start()
console.log('INFO: Cron triggers next times (shows only upcoming 6 dates):\n - ' + job.nextDates(6).join('\n - '))

// Cron job for onTickStockMarket()
const job2 = new CronJob(cfg.tickers.stockmarket.cron_time, onTickStockMarket, null, false, cfg.tickers.stockmarket.cron_timezone)
job2.start()
