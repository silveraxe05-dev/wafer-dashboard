# WaferTrack — API + UI in one image
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Same-origin API calls from the UI served by Express
ENV VITE_ADF_API_BASE=
RUN npm run build && npm run api:seed

ENV PORT=8080
ENV ADF_API_PORT=8080
ENV SERVE_UI=1
ENV NODE_ENV=production

EXPOSE 8080

CMD ["npx", "tsx", "api/server.ts"]
