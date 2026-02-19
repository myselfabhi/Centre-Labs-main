#!/bin/bash

# Restore latest backup from S3 to local dev database
# Configuration (use environment variables or set here for local use only)
AWS_REGION="${AWS_REGION:-us-west-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-YOUR_AWS_ACCESS_KEY_ID}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-YOUR_AWS_SECRET_ACCESS_KEY}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-centre-research-media}"
BACKUP_PREFIX="db-backups"

# Local dev database configuration
DB_CONTAINER_NAME="peptides_dev_db"
DB_USER="peptides_user"
DB_NAME="peptides_db"
DB_PASSWORD="dev_password_2024"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Restore Latest Backup to Local Dev Database ===${NC}"

# Check if docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running.${NC}"
    exit 1
fi

# Check if the dev container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
    echo -e "${RED}Error: Container '${DB_CONTAINER_NAME}' is not running.${NC}"
    echo -e "${YELLOW}Make sure your dev database is running with: docker-compose up -d${NC}"
    exit 1
fi

# Create temp directory
TEMP_DIR="$(pwd)/temp_dev_restore"
mkdir -p "$TEMP_DIR"

echo -e "${YELLOW}Fetching latest backup from S3...${NC}"

# Get the latest backup filename
LATEST_BACKUP=$(docker run --rm \
    -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
    -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
    -e AWS_REGION="$AWS_REGION" \
    amazon/aws-cli s3 ls "s3://${S3_BUCKET_NAME}/${BACKUP_PREFIX}/" | sort | tail -n 1 | awk '{print $4}')

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}Error: No backups found in S3.${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo -e "${GREEN}Latest backup found: ${LATEST_BACKUP}${NC}"

S3_PATH="s3://${S3_BUCKET_NAME}/${BACKUP_PREFIX}/${LATEST_BACKUP}"
LOCAL_BACKUP_PATH="${TEMP_DIR}/${LATEST_BACKUP}"

# Download the backup
echo -e "${YELLOW}Downloading ${LATEST_BACKUP}...${NC}"

if docker run --rm \
    -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
    -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
    -e AWS_REGION="$AWS_REGION" \
    -v "$TEMP_DIR":/aws \
    amazon/aws-cli s3 cp "$S3_PATH" "/aws/${LATEST_BACKUP}"; then
    
    echo -e "${GREEN}Download successful.${NC}"
else
    echo -e "${RED}Failed to download backup from S3.${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Confirm before restore
echo ""
echo -e "${YELLOW}This will restore the backup to your LOCAL DEV database.${NC}"
echo -e "${YELLOW}Container: ${DB_CONTAINER_NAME}${NC}"
echo -e "${YELLOW}Database: ${DB_NAME}${NC}"
echo -e "${RED}WARNING: This will overwrite all existing data in the dev database!${NC}"
echo ""
read -p "Are you sure you want to continue? (y/N): " CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Restore cancelled."
    rm -rf "$TEMP_DIR"
    exit 0
fi

# Restore the backup
echo -e "${YELLOW}Restoring database...${NC}"

if cat "$LOCAL_BACKUP_PATH" | docker exec -i $DB_CONTAINER_NAME psql -U $DB_USER -d $DB_NAME; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Database restored successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Connection URL: postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
else
    echo -e "${RED}Failed to restore database.${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Cleanup
rm -rf "$TEMP_DIR"
echo -e "${GREEN}Cleanup complete.${NC}"
