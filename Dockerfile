# Stage 1: Build the application
FROM node:18.19.1-alpine3.19 AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies and build
RUN npm ci --legacy-peer-deps
COPY src/ ./src/
RUN npm run build

# Verify build output
RUN ls -la /app/dist

# Stage 2: Create the production image
FROM node:18.19.1-alpine3.19

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Verify files were copied
RUN ls -la /app/dist

# Set the entry point
ENTRYPOINT ["node", "./dist/index.js"]

# Metadata
LABEL description="MCP Server for Outlook Calendar with SSE support"

# Health check using environment variable for host
ENV HEALTH_CHECK_URL=http://localhost:3000/health
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider $HEALTH_CHECK_URL || exit 1
