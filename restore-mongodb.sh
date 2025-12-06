#!/bin/bash

# MongoDB Restore Script
# Usage: ./restore-mongodb.sh <backup-file.tar.gz> [mongodb-uri]

set -e

# Configuration
BACKUP_FILE="${1}"
MONGODB_URI="${2:-${MONGODB_URI:-mongodb://localhost:27017}}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <backup-file.tar.gz> [mongodb-uri]"
    echo "Example: $0 mongodb-backup-20240115-143022.tar.gz"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Check if mongorestore is available
if ! command -v mongorestore &> /dev/null; then
    echo "Error: mongorestore not found. Please install MongoDB tools."
    exit 1
fi

echo "=== MongoDB Restore ==="
echo "MongoDB URI: ${MONGODB_URI}"
echo "Backup file: ${BACKUP_FILE}"
echo ""

# Extract backup
TEMP_DIR=$(mktemp -d)
echo "Extracting backup to temporary directory..."
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find the dump directory
DUMP_DIR=$(find "${TEMP_DIR}" -type d -name "mongodb-dump*" | head -1)
if [ -z "${DUMP_DIR}" ]; then
    DUMP_DIR=$(find "${TEMP_DIR}" -type d -mindepth 1 -maxdepth 1 | head -1)
fi

if [ -z "${DUMP_DIR}" ] || [ ! -d "${DUMP_DIR}" ]; then
    echo "Error: Could not find dump directory in backup file"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

echo "Found dump directory: ${DUMP_DIR}"
echo ""

# Confirm restore
read -p "This will restore data to MongoDB. Continue? (y/n): " confirm
if [ "${confirm}" != "y" ] && [ "${confirm}" != "Y" ]; then
    echo "Restore cancelled."
    rm -rf "${TEMP_DIR}"
    exit 0
fi

# Restore
echo "Restoring MongoDB data..."
mongorestore --uri="${MONGODB_URI}" "${DUMP_DIR}"

# Cleanup
rm -rf "${TEMP_DIR}"

echo ""
echo "=== Restore Completed ==="

