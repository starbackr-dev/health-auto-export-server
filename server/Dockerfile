FROM node:lts-alpine

WORKDIR /usr/src/server

COPY package*.json ./

RUN yarn install

COPY . .

RUN yarn build

EXPOSE 3001

CMD ["yarn", "start"]
