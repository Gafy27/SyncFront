# Frontend/Server Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./
COPY drizzle.config.ts ./

# Copy attached_assets early (needed for build)
COPY attached_assets ./attached_assets

# Accept build arguments for Vite environment variables
ARG VITE_API_URL=
ARG VITE_DEMO_MODE=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE

# Install dependencies
RUN npm ci

# Copy source files
COPY server ./server

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
# Copy server code
COPY --from=builder /app/server ./server
# Vite outputs to dist/public, server expects it at server/public
COPY --from=builder /app/dist/public ./server/public

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]

