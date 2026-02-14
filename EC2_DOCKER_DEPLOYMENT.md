# EC2 Docker Deployment Guide

This guide explains how to deploy SyncAdminConsole on an AWS EC2 instance using Docker.

## Prerequisites

- AWS EC2 instance (Ubuntu 20.04+ recommended)
- SSH access to the EC2 instance
- Your EC2 public IP address

## Step 1: Connect to EC2 via SSH

```bash
# Replace with your EC2 key file and instance details
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Example:
# ssh -i ~/.ssh/my-ec2-key.pem ubuntu@54.123.45.67
```

## Step 2: Install Docker and Docker Compose

Once connected to EC2, install Docker:

```bash
# Update system packages
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
# Or run: newgrp docker
```

Verify Docker installation:
```bash
docker --version
docker-compose --version
```

## Step 3: Transfer Project Files to EC2

### Option A: Using Git (Recommended)

```bash
# On EC2, clone your repository
git clone https://github.com/autentiodev/Sync-Demo.git
cd Sync-Demo

# Or if using SSH:
# git clone git@github.com:autentiodev/Sync-Demo.git
```

### Option B: Using SCP (from your local machine)

```bash
# From your local machine, compress the project
cd /home/gaby/github/SyncAdminConsole
tar -czf sync-admin.tar.gz --exclude='node_modules' --exclude='dist' --exclude='.git' .

# Transfer to EC2
scp -i /path/to/your-key.pem sync-admin.tar.gz ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/

# On EC2, extract
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd /home/ubuntu
tar -xzf sync-admin.tar.gz -C sync-admin
cd sync-admin
```

## Step 4: Get EC2 Public IP

```bash
# On EC2, get your public IP
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

Save this IP - you'll need it for configuration.

## Step 5: Create Environment File

On EC2, create a `.env` file in the project root:

```bash
cd /home/ubuntu/Sync-Demo  # or wherever you cloned/extracted the project

# Create .env file
cat > .env << EOF
# Get your EC2 public IP first
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Frontend will use relative URLs (empty = proxy through frontend server)
VITE_API_URL=

# Demo mode (set to false to disable)
VITE_DEMO_MODE=true

# InfluxDB (optional - leave empty if not using)
INFLUXDB_HOST=
INFLUXDB_TOKEN=
INFLUXDB_DATABASE=

# CORS - allow all origins for now
CORS_ALLOWED_ORIGIN=*
EOF
```

Or manually edit `.env`:
```bash
nano .env
```

Add:
```
VITE_API_URL=
VITE_DEMO_MODE=true
CORS_ALLOWED_ORIGIN=*
INFLUXDB_HOST=
INFLUXDB_TOKEN=
INFLUXDB_DATABASE=
```

## Step 6: Configure AWS Security Group

In AWS Console, go to EC2 → Security Groups → Your Instance's Security Group:

**Add Inbound Rules:**
- **Type**: Custom TCP
- **Port**: 5000
- **Source**: 0.0.0.0/0 (or your IP for security)
- **Description**: Frontend

- **Type**: Custom TCP  
- **Port**: 3001
- **Source**: 0.0.0.0/0 (or restrict to internal)
- **Description**: API

- **Type**: SSH
- **Port**: 22
- **Source**: Your IP
- **Description**: SSH Access

## Step 7: Build and Run with Docker

```bash
# Make sure you're in the project directory
cd /home/ubuntu/Sync-Demo  # or your project path

# Build and start all services
docker-compose up -d --build

# View logs to verify everything started
docker-compose logs -f
```

Wait for all services to start (you'll see "Connected to MongoDB" and "serving on port" messages).

## Step 8: Seed Initial Data (Optional)

```bash
# Run the seed script to create organization, applications, connectors, etc.
docker-compose exec sync-api npx ts-node seed-mtconnect-connector.ts
```

## Step 9: Access the Application

Once running, access your application at:
- **Frontend**: `http://YOUR_EC2_PUBLIC_IP:5000`
- **API Status**: `http://YOUR_EC2_PUBLIC_IP:3001/status`

## Useful Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f sync-api
docker-compose logs -f sync-admin
docker-compose logs -f mongodb
```

### Check Status
```bash
docker-compose ps
```

### Restart Services
```bash
docker-compose restart
# Or specific service
docker-compose restart sync-api
```

### Stop Services
```bash
docker-compose down
```

### Update and Redeploy
```bash
# Pull latest changes (if using git)
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Access MongoDB
```bash
# Connect to MongoDB container
docker-compose exec mongodb mongosh

# Or from host
mongosh mongodb://localhost:27018
```

## Troubleshooting

### Check if containers are running
```bash
docker-compose ps
```

### Check if ports are listening
```bash
sudo netstat -tlnp | grep -E '5000|3001|27018'
```

### View container logs
```bash
docker-compose logs sync-api --tail 50
docker-compose logs sync-admin --tail 50
```

### Restart a specific service
```bash
docker-compose restart sync-api
```

### Rebuild after code changes
```bash
docker-compose up -d --build sync-admin
```

### Check Docker disk space
```bash
docker system df
```

### Clean up unused Docker resources
```bash
docker system prune -a
```

## Security Recommendations

1. **Use HTTPS**: Set up Nginx reverse proxy with Let's Encrypt SSL
2. **Restrict CORS**: Update `CORS_ALLOWED_ORIGIN` to your domain in production
3. **Firewall**: Use AWS Security Groups to restrict access
4. **Environment Variables**: Never commit `.env` files
5. **MongoDB**: Enable authentication for MongoDB in production

## Using a Domain Name (Optional)

If you have a domain:

1. Point your domain's A record to your EC2 public IP
2. Update `.env`:
   ```
   VITE_API_URL=https://api.yourdomain.com
   CORS_ALLOWED_ORIGIN=https://yourdomain.com
   ```
3. Set up Nginx reverse proxy with SSL

## Quick Reference

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build

# Seed data
docker-compose exec sync-api npx ts-node seed-mtconnect-connector.ts
```

