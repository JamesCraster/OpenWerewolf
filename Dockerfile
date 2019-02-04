FROM node:10
WORKDIR /usr/src/app
COPY *.json ./
RUN npm install -g gulp
RUN npm install -g typescript
RUN npm install -g sass
RUN npm install -g babel-cli babel-preset-react
RUN npm install -g webpack-cli
RUN npm install
COPY . .
RUN npm run build
RUN apt-get update && apt-get install -y redis-server
EXPOSE 6379
EXPOSE 8080
EXPOSE 8081
CMD ["npm", "run", "start:debug"]
