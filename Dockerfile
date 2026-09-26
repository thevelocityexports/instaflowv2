# ==============================================================================
# InstaFlow Production Dockerfile for Google Cloud Run
# Multi-stage lightweight build for standalone Node.js / Express backend
# ==============================================================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies (including build tools for compilation)
RUN npm ci

# Copy source code
COPY . .

# Compile backend TypeScript server to standalone ESM bundle
RUN npm run build:server

# Stage 2: Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled server bundle and configuration directory from builder
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/data ./data

# Expose default container port (Cloud Run overrides PORT dynamically)
EXPOSE 3000

# Start production server
CMD ["node", "server.js"]
