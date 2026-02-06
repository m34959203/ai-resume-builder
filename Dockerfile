# Multi-stage build: frontend + BFF server
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Install root deps + build frontend
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# 2. Production image
FROM node:20-alpine

WORKDIR /app

# Copy server + install its deps
COPY server/ ./server/
RUN cd server && npm ci --omit=dev

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy app.js (ESM bridge for Plesk — not used on Railway, but kept for compat)
COPY app.js ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.js"]
