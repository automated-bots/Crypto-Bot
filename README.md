# Crypto Alert Bot

`crypt-bot` is an open-source bot that track the top 5 most popular crypto tokens/coins. And give you a notification when the trend is changing (up/down trend).

This bot will inform you via Telegram, whenever there is an up- or downtrend in one of the top 5 crypto coins. Technical analysis is applied to determine the up- or downtrends.

## Requirements

This bot is written in JavaScript and run on NodeJS.

* [NodeJS 14 or higher](https://nodejs.org/en/download/)

## Usage

You can join the public [Crypto Exchange Alert Telegram channel](https://t.me/crypto_exchange_updates), where this bot is connected to.

*Or* since this project is open-source, you can setup your own `crypto-bot` as well as your own [Telegram Bot](https://core.telegram.org/bots). See below.

## Run it yourself

### Docker

Use the [DockerHub Docker image](https://hub.docker.com/repository/docker/danger89/crypto-bot) (see also: [Dockerfile](Dockerfile)).

1. Copy/rename the [config template file](configTemplate.yml) to `config.yml`, can be stored anywhere on your machine:

    ```sh
    cp configTemplate.yml config.yml
    ```

2. Now change the `config.yml` to your needs (see "Most important Settings" section below).
3. Start Docker container by providing the `config.yml` from outside the Docker container (by default using current working directory, `pwd`, on your host machine):

    ```sh
    docker run --restart always -p 127.0.0.1:3010:3010 -v $(pwd)/config.yml:/app/config.yml -d danger89/crypto-bot
    ```

*Note:* The command above should pull the image automatically from Docker Hub.

You can also use `docker-compose`, see [docker-compose.yml](docker-compose.yml).

### Plain terminal

Follow the steps:

1. Copy the config template to `config.yml`: `cp configTemplate.yml config.yml`
2. Change the configuration settings, webhook domain for Telegram bot and API keys for the stock data
3. Install depedencies via: `npm install` (once needed)
4. Start the bot using: `npm start`

**Advice:** Run the bot 24/7 on some dedicated hardware. `cron_time` within the configuration will take care of the triggers when to look-up for data.

**Hidden feature:** Set `DEBUG` to `true` value in the [dataProcessor.js](src/dataProcessor.js) source file to dump the market data to a comma-seperated values (CSV) file. Useful for off-line verification/calculations.

### Most important Settings

The following settings require definitely some attention during setup:

* `exchange_settings -> use_cache` - Set to `False` to not use any local caching, needed for production!
* `exchange_settings -> apiKey` - API token of ...
* `telegram_settings -> bot_token` - Token from Telegram, created via [@BotFather](https://telegram.me/BotFather)
* `telegram_settings -> public_url` - Telegram public URL for Webhook
* `telegram_settings -> chat_id` - Telegram channel name including '@' or any other chat ID.

There are also 2 environment variables available to set:

* `HOST` (default: `0.0.0.0`)
* `PORT` (default: `3010`)

## License

[MIT License](LICENSE)

