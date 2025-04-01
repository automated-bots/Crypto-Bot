#!/usr/bin/env bash
docker build -t danger89/crypto-bot:latest -t registry.melroy.org/melroy/crypto-bot/crypto-bot:latest .

# Push the images to the DockerHub and the GitLab registry
docker push danger89/crypto-bot:latest
docker push registry.melroy.org/melroy/crypto-bot/crypto-bot:latest
