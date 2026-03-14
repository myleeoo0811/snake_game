FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY index.html ./
COPY styles.css ./
COPY app.js ./
COPY snake-game.js ./
COPY server.js ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
