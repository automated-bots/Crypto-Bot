#!/usr/bin/env bash
docker run -p 3010:3010 --restart=always -v $(pwd)/config.yml:/app/config.yml -d danger89/crypto-bot
