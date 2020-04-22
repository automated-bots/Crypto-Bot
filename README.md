# Market Alert Bot

`index-bot` is an open-source stock (forex) bot that uses the the following data to notify the user via Telegram.

For now it's using the following market data:

* [VIX Index](http://www.cboe.com/products/vix-index-volatility/volatility-indexes)
* [GSPC Index](https://finance.yahoo.com/quote/%5EGSPC/) - [companies by Weight](https://www.slickcharts.com/sp500) (aka S&P 500 index)

This bot will inform you via Telegram, when a certain threshold limit is reached on the VIX volatility market index (on NYSE)
and or whenever there is an up- or downtrend in the S&P 500 market. Technical analysis is applied to determine the up- or downtrend of the S&P 500 index. 

## Requirements

This bot is written in JavaScript and run on NodeJS.

* [Node.js](https://nodejs.org/en/download/)

## Usage

You can join the public [Stock Exchange Telegram channel](https://t.me/stock_exchange_updates), where this bot is connected to.

*Or* since this project is open-source, you can setup your own `index-bot` as well as your own [Telegram Bot](https://core.telegram.org/bots). See below.

### Set-up yourself

Follow the steps to get it up and running yourself:

1. Copy the config template to `config.yml`: `cp configTemplate.yml config.yml`
2. Adjust the configuration settings (optionally), webhook domain for Telegram bot and API keys for the stock data
3. Install depedencies via: `npm install` (once needed)
4. Start the bot using: `npm start`

**Advice:** Run this bot 24/7 on some dedicated hardware. Crontime within the configuration will take care of the triggers when to look-up data.

**Hidden feature:** Set `DEBUG` to `true` value in the [dataProcessor.js](src/dataProcessor.js) source file to dump the market data to a comma-seperated values (CSV) file. Useful for off-line verification/calculations.

## License 

[MIT License](LICENSE)

## Useful links

* [More info about VIX](https://www.veb.net/artikel/06263/7-vragen-over-de-vix-index) (Dutch)
* [More info about S&P 500](https://www.lynx.nl/kennis/artikelen/sp-500-index-alles-populairste-speler/) (Dutch)