const express = require('express')
const cors = require('cors')
const fs = require('fs')
const YAML = require('yaml')
const Fetcher = require('./fetcher')
const Process = require('./process')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const port = process.env.PORT || 3008

const cfg = YAML.parse(fs.readFileSync('config.yml', 'utf8').toString())
if (!cfg) {
  throw new Error('Please create a config.yml file.')
}

// TODO: https://github.com/yagop/node-telegram-bot-api/blob/master/examples/webhook/express.js
app.get('/', (req, res) => res.send('(VIX) Index bot v1.0.0'))

app.listen(port, () => console.log(`VIX Bot is running on port ${port}!`))

// TODO: Looping..
// setTimeout(..), bluebird or cron or something?
// TODO: Keep trend of the results? Don't spam daily about the threshold, only until it recovered again...?
//   However, do report when the result changes from extreme -> not extreme (or visa versa).
//   And finally report when not extreme -> 'safe zone' (back to normal).

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
