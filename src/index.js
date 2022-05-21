// NTBA = node-telegram-bot-api fixes
process.env.NTBA_FIX_319 = 1
process.env.NTBA_FIX_350 = 1
// Constants
const port = process.env.PORT || 3010
const host = process.env.HOST || '0.0.0.0'
const isFake = process.env.NODE_ENV === 'fake'

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
const Util = require('./util')
const { version } = require('../package.json')

const cfg = YAML.parse(fs.readFileSync('config.yml', 'utf8').toString())
if (!cfg) {
  throw new Error('Please create a config.yml file.')
}
if (cfg.exchange_settings.use_cache) {
  console.warn(Util.getCurrentDateTime() + ' - WARN: Cached market data files will be used (if available).')
}

console.info(Util.getCurrentDateTime() + ' - Using Telegram channel chat ID: ' + cfg.telegram_settings.chat_id)
console.info(Util.getCurrentDateTime() + ' - Current test API hash: ' + TEST_API_SECRET_HASH)
console.info(Util.getCurrentDateTime() + ' - Current crypto coins will be tracked: ' + cfg.tickers.params.crypto_symbols_pairs)

// Setup Telegram bot
const bot = (isFake) ? {} : new TelegramBot(cfg.telegram_settings.bot_token)
// For testing purpose only
if (isFake) {
  bot.setWebHook = (url, options = {}, fileOptions = {}) => { }
  bot.onText = (regexp, callback) => {}
  bot.sendMessage = (chatId, text, form = {}) => {
    return new Promise(function (resolve, reject) {
      console.log(Util.getCurrentDateTime() + ' - Send messaged (just a drill)! Chat ID: ' + chatId + ' with message: ' + text)
      resolve()
    })
  }
}

// Inform the Telegram servers of the new webhook url
bot.setWebHook(`${cfg.telegram_settings.public_url}/bot${TELEGRAM_SECRET_HASH}`)

// Create API Fetcher, data processor and communication instances
const fetcher = new Fetcher(cfg.exchange_settings)
const dataProcessor = new DataProcessor(
  cfg.general_settings.verbose,
  cfg.general_settings.dumpCSV,
  cfg.tickers.warmup_period,
  cfg.tickers.data_period,
  cfg.tickers.indicators)
const comm = new Communicate(bot, cfg.telegram_settings.chat_id)

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

app.get('/health', (req, res) => {
  // Check if there are any issues with the communication layer
  const isError = comm.isError()
  const statusCode = (isError) ? 500 : 200
  res.status(statusCode).json({ health_ok: !isError })
})

// Simple ping command
bot.onText(/\/ping/, () => {
  bot.sendMessage(cfg.telegram_settings.chat_id, 'Pong').catch(error => {
    console.error(Util.getCurrentDateTime() + ' - ERROR: Could not send pong message, due to error: ' + error.message)
  })
})

// Start Express Server
app.listen(port, host, () => {
  console.info(`${Util.getCurrentDateTime()} - Crypto Exchange Bot v${version} is now running on ${host} on port ${port}.`)
})

/**
 * Due to the 8 API/min rate limit, we need to call the API with time-outs
 * @param {Array} symbolPairs Crypto symbol pairs
 */
function fetchData (symbolPairs) {
  // Get Crypto data points for all crypto pairs at once
  fetcher.getData(symbolPairs, cfg.tickers.params.interval, cfg.tickers.params.outputsize)
    .then(dataList => {
      // Loop over all the crypto symbols pairs
      for (const data of dataList) {
        const crosses = dataProcessor.processCryptoMarket(data)
        comm.sendCryptoMarketUpdate(crosses, data.symbol, data.name)
      }
    })
    .catch(error => {
      console.error(Util.getCurrentDateTime() + ' - Error: Something went wrong during getting or processing the stock market data. With message: ' + error.message + '. Stack:\n')
      console.error(error.stack)
    })
}

/**
 * Trigger for cron job,
 * with a maximum of 8 symbol pairs/min. rate limition due to our free API account.
 */
function onTickCryptoExchange () {
  const symbols = cfg.tickers.params.crypto_symbols_pairs
  // We will split the crypto symbol pairs in chunks of 8,
  // so we do not hit the API req limit of 8 API calls/min.
  const symbolsChunks = sliceIntoChunks(symbols, 8)

  let timeout = 0
  for (const symbolPairs of symbolsChunks) {
    // Immediately Invoked Function Expression workaround so we can use the setTimeout inside a for loop in JS
    (function (symbolPairs, timeout) {
      setTimeout(fetchData, timeout, symbolPairs)
    })(symbolPairs, timeout)

    // Next call(s) will be deleyed by little over 1 min, so we don't hit the API call rate limit
    timeout += 62000 // in milliseconds
  }
}

function sliceIntoChunks (arr, chunkSize) {
  const res = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize)
    res.push(chunk)
  }
  return res
}

// Cron job for onTickCryptoExchange()
const job = new CronJob(cfg.tickers.cron_time, onTickCryptoExchange, null, false, cfg.tickers.cron_timezone)
job.start()
console.info(Util.getCurrentDateTime() + ' - Cron triggers scheduled for (upcoming 10 shown):\n - ' + job.nextDates(10).join('\n - '))
