# Multi-stage build: frontend + BFF server
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Install root deps
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Copy source + build frontend
COPY . .
RUN npm run build

# 3. Production image
FROM node:20-alpine

WORKDIR /app

# Copy server + install its deps
COPY server/ ./server/
RUN cd server && npm ci --omit=dev

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy fonts (Vite copies public/ to dist/ but just in case)
COPY public/fonts ./dist/fonts

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server/index.js"]
