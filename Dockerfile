FROM node:lts-slim
ENV NODE_ENV production

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install

COPY . .

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=12s --start-period=25s \
  CMD node healthcheck.js

CMD ["npm", "start"]
