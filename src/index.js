const express = require('express')
const cors = require('cors')
const fs = require('fs')
const YAML = require('yaml')
const Fetcher = require('./fetcher')
const Process = require('./process')
const CronJob = require('cron').CronJob

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

// TODO: https://github.com/yagop/node-telegram-bot-api/blob/master/examples/webhook/express.js
app.get('/', (req, res) => res.send('(VIX) Index bot v1.0.0'))
app.listen(port, () => console.log(`INFO: VIX Bot is running on port ${port}!`))

// TODO: Only report on changes in levels (don't spam muliple times a day/over days)

/**
 * Triggers on cron job
 */
function onTick () {
  // Get market data
  const fetcher = new Fetcher(cfg.exchange)
  fetcher.getData().then(data => {
    const process = new Process(cfg.settings, data)
    process.processData()
    const result = process.getResult()
    console.log('Result ' + JSON.stringify(result))
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

const job = new CronJob(cfg.settings.cron_time, onTick, null, false, cfg.settings.cron_timezone)
job.start()
console.log('INFO: Cron triggers next times (shows only upcoming 6 dates):\n - ' + job.nextDates(6).join('\n - '))
