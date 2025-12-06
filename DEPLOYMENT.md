# EC2 Deployment Guide

This guide will help you deploy the SyncAdminConsole application on an AWS EC2 instance.

## Prerequisites

- AWS EC2 instance (Ubuntu 20.04+ recommended)
- MongoDB installed and running (or MongoDB Atlas connection)
- Node.js 20+ and npm installed
- Domain name (optional, for production)

## Step 1: Server Setup

### Install Node.js and npm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install MongoDB (if using local MongoDB)

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## Step 2: Application Setup

### Clone and Install Dependencies

```bash
# Clone your repository
git clone <your-repo-url>
cd SyncAdminConsole

# Install root dependencies
npm install

# Install SyncAPI dependencies
cd SyncAPI
npm install
cd ..
```

### Migrate MongoDB Data (If Applicable)

If you have existing MongoDB data on another VM, see [MONGODB_MIGRATION.md](./MONGODB_MIGRATION.md) for detailed instructions.

**Quick migration steps:**
1. On source VM: `./backup-mongodb.sh`
2. Transfer backup file: `scp ~/mongodb-backups/mongodb-backup-*.tar.gz user@destination-vm:/home/user/`
3. On destination VM: `./restore-mongodb.sh mongodb-backup-*.tar.gz`

## Step 3: Environment Configuration

### Create .env file in root directory

```bash
# Frontend Server Configuration
PORT=5000

# Sync API Configuration
# Use localhost if running on same instance
SYNC_API_URL=http://localhost:3000

# Frontend API URL (replace with your EC2 public IP or domain)
# Get your EC2 public IP: curl http://169.254.169.254/latest/meta-data/public-ipv4
# Example: http://54.123.45.67:3000
# Or with domain: https://api.yourdomain.com
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:3000
```

### Create .env file in SyncAPI directory

```bash
cd SyncAPI

# MongoDB Configuration
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017

# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Server Configuration
PORT=3000

# CORS Configuration
# Replace with your EC2 public IP or domain
# Single origin: http://YOUR_EC2_PUBLIC_IP:5000
# Multiple origins: http://YOUR_EC2_PUBLIC_IP:5000,https://yourdomain.com
CORS_ALLOWED_ORIGIN=http://YOUR_EC2_PUBLIC_IP:5000

# Organization ID
ORGANIZATION_ID=autentiodev

# InfluxDB Configuration (if needed)
# INFLUXDB_HOST=https://your-influxdb-host:8086
# INFLUXDB_TOKEN=your-token
# INFLUXDB_DATABASE__LORA=your-database
# INFLUXDB_ORG=your-org
```

**Important:** Replace `YOUR_EC2_PUBLIC_IP` with your actual EC2 public IP address. You can get it with:
```bash
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

## Step 4: Build the Application

```bash
# Build the frontend
npm run build

# Build the SyncAPI
cd SyncAPI
npm run build
cd ..
```

## Step 5: Start Services with PM2

### Start SyncAPI

```bash
cd SyncAPI
pm2 start dist/server.js --name sync-api
cd ..
```

### Start Frontend Server

```bash
pm2 start dist/index.js --name sync-admin
```

### Save PM2 configuration

```bash
pm2 save
pm2 startup
```

## Step 6: Configure AWS Security Groups

In your EC2 Security Group, open the following ports:

- **Port 5000** (HTTP) - For the frontend application
- **Port 3000** (HTTP) - For the API (if accessing directly)
- **Port 22** (SSH) - For server access

### Security Group Rules Example:

```
Inbound Rules:
- Type: Custom TCP, Port: 5000, Source: 0.0.0.0/0 (or your IP for security)
- Type: Custom TCP, Port: 3000, Source: 0.0.0.0/0 (or restrict to internal)
- Type: SSH, Port: 22, Source: Your IP
```

## Step 7: Access the Application

Once deployed, access your application at:
- Frontend: `http://YOUR_EC2_PUBLIC_IP:5000`
- API: `http://YOUR_EC2_PUBLIC_IP:3000/status`

## Step 8: Using a Domain Name (Optional)

If you have a domain name:

1. Point your domain's A record to your EC2 public IP
2. Update `.env` files:
   - Root `.env`: `VITE_API_URL=https://api.yourdomain.com`
   - SyncAPI `.env`: `CORS_ALLOWED_ORIGIN=https://yourdomain.com`

3. Consider using Nginx as a reverse proxy with SSL:
   - Install Nginx: `sudo apt install nginx`
   - Configure SSL with Let's Encrypt: `sudo apt install certbot python3-certbot-nginx`
   - Set up reverse proxy to forward requests to localhost:5000 and localhost:3000

## Monitoring and Logs

### View PM2 logs

```bash
# View all logs
pm2 logs

# View specific service logs
pm2 logs sync-api
pm2 logs sync-admin
```

### Restart services

```bash
pm2 restart sync-api
pm2 restart sync-admin
```

### Stop services

```bash
pm2 stop sync-api
pm2 stop sync-admin
```

## Troubleshooting

### Check if services are running

```bash
pm2 status
```

### Check if ports are listening

```bash
sudo netstat -tlnp | grep -E '3000|5000'
```

### Check MongoDB status

```bash
sudo systemctl status mongod
```

### View application logs

```bash
pm2 logs sync-api --lines 50
pm2 logs sync-admin --lines 50
```

## Security Recommendations

1. **Use HTTPS**: Set up SSL/TLS certificates (Let's Encrypt)
2. **Restrict CORS**: Only allow your frontend domain in production
3. **Firewall**: Use AWS Security Groups to restrict access
4. **Environment Variables**: Never commit `.env` files to git
5. **MongoDB**: Enable authentication for MongoDB
6. **Regular Updates**: Keep Node.js and dependencies updated

## Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild
npm run build
cd SyncAPI && npm run build && cd ..

# Restart services
pm2 restart sync-api
pm2 restart sync-admin
```

