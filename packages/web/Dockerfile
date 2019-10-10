# Ubuntu + Node.js
FROM node:8.11.1

RUN mkdir /app

WORKDIR /app

ADD yarn.lock package.json ./
RUN yarn

ADD . /app

ENTRYPOINT ["yarn", "build:start"]
