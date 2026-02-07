# Multi-stage build: frontend + BFF server
FROM node:22-alpine AS builder

WORKDIR /app

# 1. Install root deps (include devDependencies for Vite build)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# 2. Copy source + build frontend
COPY . .
RUN npm run build

# 3. Production image
FROM node:22-alpine

WORKDIR /app

# Copy server + install its production deps only
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server/index.js"]
