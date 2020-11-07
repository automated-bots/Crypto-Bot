#!/usr/bin/env bash
docker run --restart=always -v $(pwd)/config.yml:$(pwd)/config.yml -d danger89/index-bot
