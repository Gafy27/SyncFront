# SyncAPI Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (needed for build)
RUN npm ci

# Copy source files
COPY src ./src
COPY seed-mtconnect-connector.ts ./

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for seed script with ts-node)
RUN npm ci

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/seed-mtconnect-connector.ts ./

# Copy source files (needed for seed script imports)
COPY src ./src

# Copy resources (icons)
COPY resources ./resources

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

