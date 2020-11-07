#!/usr/bin/env bash
docker run --restart=always -v $(pwd)/config.yml:/app/config.yml -d danger89/index-bot
