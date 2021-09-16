FROM node:14

WORKDIR /app

RUN npm install -g npm@7

COPY package.json .
COPY packages/provider-keeper-ui/package.json ./packages/provider-keeper-ui/package.json

RUN npm install

COPY . .

RUN npm run ui:build
CMD npm run ui:start
EXPOSE 8081
