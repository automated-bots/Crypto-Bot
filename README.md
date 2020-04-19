Market Alert Bot
=========

This Telegram bot uses the the following data to notify the user:
* [VIX Index](http://www.cboe.com/products/vix-index-volatility/volatility-indexes)
* [GSPC Index](https://finance.yahoo.com/quote/%5EGSPC/) - [companies by Weight](https://www.slickcharts.com/sp500) (aka S&P 500 index)

This bot will inform you via Telegram, when a certain threshold limit is reached on the VIX volatility market index (on NYSE)
and or whenever there is an up- or downtrend in the S&P 500 market.

* [More info about VIX](https://www.veb.net/artikel/06263/7-vragen-over-de-vix-index) (Dutch)
* [More info about S&P 500](https://www.lynx.nl/kennis/artikelen/sp-500-index-alles-populairste-speler/) (Dutch)

Requirements
------------

* [Node.js](https://nodejs.org/en/download/)
* npm

Usage
-----

Follow the steps:

1. Copy the config template to `config.yml`: `cp configTemplate.yml config.yml`
2. Adjust the configuration settings (optionally), webhook domain and API keys
3. Install depedencies via: `npm install` (once needed)
4. Start the bot using: `npm start`

TODO
----

Use S&P 500 index, weekly chart and trigger on MACD signal crosses (downtrend and uptrend).

