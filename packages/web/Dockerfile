# Ubuntu + Node.js
FROM node:8.11.2

RUN mkdir /app

WORKDIR /app

ADD package.json ./
RUN npm install

ADD . /app

ENTRYPOINT ["yarn", "build:start"]