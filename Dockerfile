# Multi-stage build for Mandate Gateway (React frontend + Express/PostgreSQL backend)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for Vite build)
RUN npm ci

# Copy full source
COPY . .

# Build frontend production bundle into dist/
RUN npm run build

# Production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy package manifests and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend assets from builder
COPY --from=builder /app/dist ./dist

# Copy backend server code, configs, migrations, and seeds
COPY server ./server
COPY docs ./docs
COPY openapi.yaml ./

# Non-root user for security
USER node

EXPOSE 3001

CMD ["node", "server/index.js"]
