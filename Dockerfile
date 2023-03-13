FROM node:alpine AS node-builder

WORKDIR /backend

COPY package*.json .
RUN npm install
RUN npm i node-fetch
RUN npm install --save @types/node-fetch

COPY tsconfig.json .
COPY sectarians-nakama/* .
RUN npx tsc

FROM registry.heroiclabs.com/heroiclabs/nakama:3.15.0

COPY --from=node-builder /backend/build/*.js /nakama/data/modules/build/
COPY local.yml .
