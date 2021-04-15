FROM node:lts-alpine
ENV NODE_ENV production

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install

COPY . .

EXPOSE 3010
CMD ["npm", "start"]
