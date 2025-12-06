# Docker Deployment Guide

This guide explains how to run the SyncAdminConsole application using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### Production Mode

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Development Mode

```bash
# Build and start all services in development mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

## Services

The Docker Compose setup includes:

1. **mongodb**: MongoDB database server (port 27017)
2. **sync-api**: Backend API server (port 3000)
3. **sync-admin**: Frontend application server (port 5000)

## Environment Variables

### Production (docker-compose.yml)

Environment variables are set in the `docker-compose.yml` file. To customize:

1. Create a `.env` file in the root directory
2. Update the `environment` section in `docker-compose.yml` to use variables:

```yaml
environment:
  - MONGODB_URI=${MONGODB_URI:-mongodb://mongodb:27017}
  - PORT=${PORT:-3000}
  - CORS_ALLOWED_ORIGIN=${CORS_ALLOWED_ORIGIN:-http://localhost:5000}
```

### Development (docker-compose.dev.yml)

Development mode includes volume mounts for hot-reloading. Changes to source files will require container restart.

## Building Images

### Build all services

```bash
docker-compose build
```

### Build specific service

```bash
docker-compose build sync-api
docker-compose build sync-admin
```

### Build without cache

```bash
docker-compose build --no-cache
```

## Accessing the Application

- **Frontend**: http://localhost:5000
- **API**: http://localhost:3000
- **API Status**: http://localhost:3000/status

## MongoDB Access

### From Host Machine

```bash
# Connect using mongosh
mongosh mongodb://localhost:27017

# Or using MongoDB Compass
# Connection string: mongodb://localhost:27017
```

### From Another Container

```bash
# Connection string: mongodb://mongodb:27017
```

## Data Persistence

MongoDB data is persisted in a Docker volume named `mongodb_data` (production) or `mongodb_data_dev` (development).

### Backup MongoDB Data

```bash
# Export data from container
docker exec sync-mongodb mongodump --out=/data/backup

# Copy backup to host
docker cp sync-mongodb:/data/backup ./mongodb-backup
```

### Restore MongoDB Data

```bash
# Copy backup to container
docker cp ./mongodb-backup sync-mongodb:/data/backup

# Restore data
docker exec sync-mongodb mongorestore /data/backup
```

## Seeding Initial Data

To seed the organization and connectors:

```bash
# Run the seed script using ts-node
docker-compose exec sync-api npx ts-node seed-mtconnect-connector.ts

# Or run in a new container
docker-compose run --rm sync-api npx ts-node seed-mtconnect-connector.ts
```

Note: The seed script requires the source files to be available in the container, which is included in the Docker image.

## Troubleshooting

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs sync-api
docker-compose logs sync-admin
docker-compose logs mongodb

# Follow logs
docker-compose logs -f sync-api
```

### Check Container Status

```bash
docker-compose ps
```

### Restart a Service

```bash
docker-compose restart sync-api
```

### Rebuild and Restart

```bash
docker-compose up -d --build sync-api
```

### Access Container Shell

```bash
# SyncAPI container
docker-compose exec sync-api sh

# MongoDB container
docker-compose exec mongodb mongosh
```

### Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Production Deployment

### Using Environment Files

1. Create `.env` file:

```env
MONGODB_URI=mongodb://mongodb:27017
PORT=3000
CORS_ALLOWED_ORIGIN=http://your-domain.com
ORGANIZATION_ID=autentiodev
```

2. Update `docker-compose.yml` to use environment variables:

```yaml
environment:
  - MONGODB_URI=${MONGODB_URI}
  - PORT=${PORT}
  - CORS_ALLOWED_ORIGIN=${CORS_ALLOWED_ORIGIN}
```

### Using Docker Secrets (Advanced)

For sensitive data, use Docker secrets:

```yaml
secrets:
  mongodb_uri:
    file: ./secrets/mongodb_uri.txt

services:
  sync-api:
    secrets:
      - mongodb_uri
    environment:
      - MONGODB_URI_FILE=/run/secrets/mongodb_uri
```

### Health Checks

Add health checks to services:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/status"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Networking

Services communicate through a Docker network (`sync-network`). Services can reference each other by service name:

- `mongodb` - MongoDB server
- `sync-api` - API server
- `sync-admin` - Frontend server

## Port Mapping

Default port mappings:

- `5000:5000` - Frontend (sync-admin)
- `3000:3000` - API (sync-api)
- `27017:27017` - MongoDB

To change ports, update the `ports` section in `docker-compose.yml`.

## Resource Limits

Add resource limits for production:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

