# MongoDB Data Migration Guide

This guide explains how to backup your MongoDB data from one VM and restore it on another VM.

## Prerequisites

- MongoDB installed on both source and destination VMs
- `mongodump` and `mongorestore` tools (usually included with MongoDB installation)
- Access to both VMs via SSH

## Method 1: Full Database Backup (Recommended)

### Step 1: Export All Data from Source VM

On your **source VM** (current machine with data):

```bash
# Create a backup directory
mkdir -p ~/mongodb-backup
cd ~/mongodb-backup

# Export all databases (excluding system databases)
mongodump --uri="mongodb://localhost:27017" --out=./mongodb-dump

# Or if using a specific port (e.g., 27018 for Docker):
# mongodump --uri="mongodb://localhost:27018" --out=./mongodb-dump

# If MongoDB requires authentication:
# mongodump --uri="mongodb://username:password@localhost:27017" --out=./mongodb-dump
```

This creates a directory structure like:
```
mongodb-dump/
  ├── autentiodev/
  │   ├── config.bson
  │   ├── config.metadata.json
  │   ├── users.bson
  │   ├── users.metadata.json
  │   ├── monitoreo-cnc_devices.bson
  │   ├── monitoreo-cnc_devices.metadata.json
  │   └── ...
  └── other-organization/
      └── ...
```

### Step 2: Compress the Backup

```bash
# Create a compressed archive
tar -czf mongodb-backup-$(date +%Y%m%d-%H%M%S).tar.gz mongodb-dump/

# This creates a file like: mongodb-backup-20240115-143022.tar.gz
```

### Step 3: Transfer to Destination VM

**Option A: Using SCP (Secure Copy)**

```bash
# From source VM, copy to destination VM
scp mongodb-backup-*.tar.gz user@destination-vm-ip:/home/user/

# Example:
# scp mongodb-backup-20240115-143022.tar.gz ubuntu@54.123.45.67:/home/ubuntu/
```

**Option B: Using rsync**

```bash
# From source VM
rsync -avz mongodb-backup-*.tar.gz user@destination-vm-ip:/home/user/
```

**Option C: Using AWS S3 (if both VMs are on AWS)**

```bash
# Upload to S3 from source VM
aws s3 cp mongodb-backup-*.tar.gz s3://your-bucket-name/

# Download on destination VM
aws s3 cp s3://your-bucket-name/mongodb-backup-*.tar.gz ./
```

### Step 4: Restore on Destination VM

On your **destination VM**:

```bash
# Extract the backup
tar -xzf mongodb-backup-*.tar.gz

# Restore all databases
mongorestore --uri="mongodb://localhost:27017" ./mongodb-dump

# Or if using a specific port:
# mongorestore --uri="mongodb://localhost:27018" ./mongodb-dump

# If MongoDB requires authentication:
# mongorestore --uri="mongodb://username:password@localhost:27017" ./mongodb-dump
```

## Method 2: Backup Specific Organization Database

If you only want to backup a specific organization (e.g., `autentiodev`):

### Export Single Database

```bash
# On source VM
mongodump --uri="mongodb://localhost:27017" --db=autentiodev --out=./mongodb-dump
```

### Restore Single Database

```bash
# On destination VM
mongorestore --uri="mongodb://localhost:27017" --db=autentiodev ./mongodb-dump/autentiodev
```

## Method 3: Backup Specific Collections

If you only need specific collections:

### Export Specific Collections

```bash
# Export only config and users collections from autentiodev database
mongodump --uri="mongodb://localhost:27017" \
  --db=autentiodev \
  --collection=config \
  --collection=users \
  --out=./mongodb-dump
```

### Restore Specific Collections

```bash
# Restore specific collections
mongorestore --uri="mongodb://localhost:27017" \
  --db=autentiodev \
  ./mongodb-dump/autentiodev/config.bson \
  ./mongodb-dump/autentiodev/users.bson
```

## Method 4: Using MongoDB Atlas (Cloud)

If you're migrating to/from MongoDB Atlas:

### Export from Local to Atlas

```bash
# Export from local MongoDB
mongodump --uri="mongodb://localhost:27017" --out=./mongodb-dump

# Restore to MongoDB Atlas
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/" ./mongodb-dump
```

### Export from Atlas to Local

```bash
# Export from MongoDB Atlas
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/" --out=./mongodb-dump

# Restore to local MongoDB
mongorestore --uri="mongodb://localhost:27017" ./mongodb-dump
```

## Quick Migration Script

Create a script to automate the process:

### Source VM Script (`backup-mongodb.sh`)

```bash
#!/bin/bash

# Configuration
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
BACKUP_DIR="${HOME}/mongodb-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="mongodb-backup-${TIMESTAMP}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"
cd "${BACKUP_DIR}"

echo "Starting MongoDB backup..."
echo "MongoDB URI: ${MONGODB_URI}"

# Create dump
mongodump --uri="${MONGODB_URI}" --out="./${BACKUP_NAME}"

# Compress
echo "Compressing backup..."
tar -czf "${BACKUP_NAME}.tar.gz" "./${BACKUP_NAME}"

# Remove uncompressed directory
rm -rf "./${BACKUP_NAME}"

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "File size: $(du -h ${BACKUP_NAME}.tar.gz | cut -f1)"
```

### Destination VM Script (`restore-mongodb.sh`)

```bash
#!/bin/bash

# Configuration
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
BACKUP_FILE="${1}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "Starting MongoDB restore..."
echo "MongoDB URI: ${MONGODB_URI}"
echo "Backup file: ${BACKUP_FILE}"

# Extract backup
TEMP_DIR=$(mktemp -d)
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find the dump directory
DUMP_DIR=$(find "${TEMP_DIR}" -type d -name "mongodb-dump*" | head -1)
if [ -z "${DUMP_DIR}" ]; then
    DUMP_DIR=$(find "${TEMP_DIR}" -type d -mindepth 1 -maxdepth 1 | head -1)
fi

# Restore
echo "Restoring from: ${DUMP_DIR}"
mongorestore --uri="${MONGODB_URI}" "${DUMP_DIR}"

# Cleanup
rm -rf "${TEMP_DIR}"

echo "Restore completed!"
```

### Usage

```bash
# Make scripts executable
chmod +x backup-mongodb.sh restore-mongodb.sh

# On source VM
./backup-mongodb.sh

# Transfer the backup file to destination VM
scp ~/mongodb-backups/mongodb-backup-*.tar.gz user@destination-vm:/home/user/

# On destination VM
./restore-mongodb.sh mongodb-backup-20240115-143022.tar.gz
```

## Verification

After restoring, verify the data:

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017

# List databases
show dbs

# Use a specific database
use autentiodev

# List collections
show collections

# Count documents in a collection
db.config.countDocuments()
db.users.countDocuments()
```

## Important Notes

1. **Stop the application** before restoring to avoid data conflicts
2. **Backup before restore** on destination VM if it has existing data
3. **Check MongoDB versions** - ensure compatibility between source and destination
4. **Indexes are preserved** - mongodump/mongorestore includes indexes
5. **Large databases** - For very large databases, consider using `--gzip` option:
   ```bash
   mongodump --uri="mongodb://localhost:27017" --gzip --out=./mongodb-dump
   mongorestore --uri="mongodb://localhost:27017" --gzip ./mongodb-dump
   ```

## Troubleshooting

### Error: "cannot connect to MongoDB"

- Check if MongoDB is running: `sudo systemctl status mongod`
- Verify connection string and port
- Check firewall settings

### Error: "authentication failed"

- Verify username and password
- Check if authentication is enabled in MongoDB

### Error: "insufficient disk space"

- Free up space on destination VM
- Use compression (`--gzip`) to reduce backup size

### Partial Restore

If restore fails partway through:
```bash
# Drop the database and try again
mongosh mongodb://localhost:27017 --eval "db.getSiblingDB('autentiodev').dropDatabase()"
mongorestore --uri="mongodb://localhost:27017" ./mongodb-dump
```

