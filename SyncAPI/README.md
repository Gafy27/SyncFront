# Sync API

## Setup MongoDB

### Option 1: Using Docker Compose (Recommended)

1. Start MongoDB:
```bash
docker-compose -f docker-compose.mongodb.yml up -d
```

2. Verify MongoDB is running:
```bash
docker ps | grep sync-mongodb
```

3. Stop MongoDB:
```bash
docker-compose -f docker-compose.mongodb.yml down
```

### Option 2: Using Local MongoDB Installation

If you have MongoDB installed locally, make sure it's running:
```bash
# On Linux/Mac
sudo systemctl start mongod
# or
mongod

# On Windows
net start MongoDB
```

## Environment Variables

Create a `.env` file in the SyncAPI directory:

```env
# MongoDB Configuration
# If using the SyncAPI container (port 27018):
MONGODB_URI=mongodb://localhost:27018
# OR if using existing MongoDB (port 27017):
# MONGODB_URI=mongodb://localhost:27017

# Server Configuration
PORT=3000

# CORS Configuration
CORS_ALLOWED_ORIGIN=http://localhost:5000

# Organization ID (default organization)
ORGANIZATION_ID=autentiodev

# InfluxDB Configuration
# Update these with your InfluxDB instance credentials
# Cloud example:
#INFLUXDB_HOST=https://us-east-1-1.aws.cloud2.influxdata.com
#INFLUXDB_TOKEN=
#INFLUXDB_DATABASE__LORA=dosivac-lora
#INFLUXDB_ORG=dosivac

# Local example:
INFLUXDB_HOST=https://192.168.0.245:8086
INFLUXDB_TOKEN="ORgfEHYiWNqJj4lcvNBhdGGHFWognV90dp0ddIbSOl18pmt1VTBrmfoPV2a8K3PIEd3hcJnLs3bZ7aqbyJDY2A=="
INFLUXDB_DATABASE__LORA=rewind
INFLUXDB_ORG=dosivac
```

## Install Dependencies

```bash
npm install
```

## Run the API

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## Database Structure

The API uses a multi-tenant architecture:
- Each organization has its own database (database name = organizationId)
- Each application has collections: `{applicationId}_devices` and `{applicationId}_config`
- Organization configuration is stored in the `config` collection

## Accessing MongoDB

### Option 1: Mongo Express (Web Interface)

Start MongoDB with Mongo Express:
```bash
docker-compose -f docker-compose.mongo-express.yml up -d
```

Access Mongo Express at: **http://localhost:8081**
- Username: `admin`
- Password: `admin123`

### Option 2: MongoDB Compass (Desktop GUI)

1. Download from: https://www.mongodb.com/try/download/compass
2. Connect using:
   - Connection String: `mongodb://localhost:27018`
   - Or use the connection form with:
     - Host: `localhost`
     - Port: `27018`

### Option 3: MongoDB Shell (mongosh)

```bash
# Install mongosh if not already installed
# Ubuntu/Debian:
sudo apt-get install -y mongodb-mongosh

# Or use Docker:
docker run -it --rm mongo:7.0 mongosh mongodb://host.docker.internal:27018

# Or connect directly:
mongosh mongodb://localhost:27018
```

### Option 4: VS Code Extension

Install the "MongoDB for VS Code" extension and connect to:
- Connection String: `mongodb://localhost:27018`

## Test the API

```bash
# Check API status
curl http://localhost:3000/status

# Get organization stats (replace {organizationId} with actual ID)
curl http://localhost:3000/organizations/{organizationId}/stats
```
