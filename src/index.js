// NTBA = node-telegram-bot-api fixes
process.env['NTBA_FIX_319'] = 1
process.env['NTBA_FIX_350'] = 1

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const YAML = require('yaml')
const Fetcher = require('./fetcher')
const Process = require('./process')
const CronJob = require('cron').CronJob
const TelegramBot = require('node-telegram-bot-api')
const Communicate = require('./communicate')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const port = process.env.PORT || 3008

const cfg = YAML.parse(fs.readFileSync('config.yml', 'utf8').toString())
if (!cfg) {
  throw new Error('Please create a config.yml file.')
}
if (cfg.exchange.use_cache) {
  console.log('INFO: Cached market data file is used (if possible).')
}
console.log('INFO: Cron time: \'' + cfg.settings.cron_time + '\' with timezone: ' + cfg.settings.cron_timezone)

const bot = new TelegramBot(cfg.settings.telegram_bot_token)
// Informs Telegram servers of the new webhook
bot.setWebHook(`${cfg.settings.telegram_public_url}/bot/${cfg.settings.telegram_bot_token}`)

app.get('/', (req, res) => res.send('(VIX) Index bot v1.0.0'))
// We are receiving updates at the route below
app.post(`/bot/${cfg.settings.telegram_bot_token}`, (req, res) => {
  app.get('telegram_bot').processUpdate(req.body)
  res.sendStatus(200)
})
app.listen(port, () => {
  console.log(`INFO: VIX Bot is running on port ${port}!`)
})

const fetcher = new Fetcher(cfg.exchange)
const comm = new Communicate(cfg.settings, bot)

/**
 * Triggers on cron job
 */
function onTick () {
  // Get market data points
  fetcher.getData().then(data => {
    // Process the data points
    const process = new Process(cfg.settings, data)
    process.processData()
    // Get the result and send it to the communicate class
    const result = process.getResult()
    comm.send(result)
  })
    .catch(error => {
      console.error('Error: Something went wrong during getting or processing the data')
      if (error) {
        if ('message' in error) {
          console.error(error.message)
        }
      }
    })
}

// Cron job that triggers the onTick() function repeatedly
const job = new CronJob(cfg.settings.cron_time, onTick, null, false, cfg.settings.cron_timezone)
job.start()
console.log('INFO: Cron triggers next times (shows only upcoming 6 dates):\n - ' + job.nextDates(6).join('\n - '))
