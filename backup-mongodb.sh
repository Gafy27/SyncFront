#!/bin/bash

# MongoDB Backup Script
# Usage: ./backup-mongodb.sh [mongodb-uri]

set -e

# Configuration
MONGODB_URI="${1:-${MONGODB_URI:-mongodb://localhost:27017}}"
BACKUP_DIR="${HOME}/mongodb-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="mongodb-backup-${TIMESTAMP}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"
cd "${BACKUP_DIR}"

echo "=== MongoDB Backup ==="
echo "MongoDB URI: ${MONGODB_URI}"
echo "Backup directory: ${BACKUP_DIR}"
echo ""

# Check if mongodump is available
if ! command -v mongodump &> /dev/null; then
    echo "Error: mongodump not found. Please install MongoDB tools."
    exit 1
fi

# Create dump
echo "Creating MongoDB dump..."
mongodump --uri="${MONGODB_URI}" --out="./${BACKUP_NAME}"

# Compress
echo "Compressing backup..."
tar -czf "${BACKUP_NAME}.tar.gz" "./${BACKUP_NAME}"

# Remove uncompressed directory
rm -rf "./${BACKUP_NAME}"

# Get file size
FILE_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)

echo ""
echo "=== Backup Completed ==="
echo "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "File size: ${FILE_SIZE}"
echo ""
echo "To transfer to another VM:"
echo "  scp ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz user@destination-vm:/home/user/"

