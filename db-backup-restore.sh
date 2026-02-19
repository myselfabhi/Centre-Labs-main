#!/bin/bash

# Configuration (use environment variables or set here for local use only)
AWS_REGION="${AWS_REGION:-us-west-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-YOUR_AWS_ACCESS_KEY_ID}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-YOUR_AWS_SECRET_ACCESS_KEY}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-centre-research-media}"
DB_CONTAINER_NAME="peptides_db"
DB_USER="peptides_user"
DB_NAME="peptides_db"
BACKUP_PREFIX="db-backups"

# Export AWS credentials for aws cli
export AWS_REGION
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_requirements() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: docker is not installed.${NC}"
        exit 1
    fi
}

perform_backup() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILENAME="backup_${DB_NAME}_${TIMESTAMP}.sql"
    # Use a local temp directory that we can mount to docker
    TEMP_DIR="$(pwd)/temp_db_backup"
    mkdir -p "$TEMP_DIR"
    BACKUP_PATH="${TEMP_DIR}/${BACKUP_FILENAME}"

    echo -e "${YELLOW}Starting backup of ${DB_NAME}...${NC}"

    # Create dump
    if docker exec -t $DB_CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists > "$BACKUP_PATH"; then
        echo -e "${GREEN}Database dump created successfully at ${BACKUP_PATH}${NC}"
        
        # Upload to S3 using Dockerized AWS CLI
        S3_PATH="s3://${S3_BUCKET_NAME}/${BACKUP_PREFIX}/${BACKUP_FILENAME}"
        echo -e "${YELLOW}Uploading to ${S3_PATH}...${NC}"
        
        # Run AWS CLI container
        if docker run --rm \
            -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
            -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
            -e AWS_REGION="$AWS_REGION" \
            -v "$TEMP_DIR":/aws \
            amazon/aws-cli s3 cp "/aws/${BACKUP_FILENAME}" "$S3_PATH"; then
            
            echo -e "${GREEN}Backup uploaded successfully to S3!${NC}"
            rm -rf "$TEMP_DIR"
        else
            echo -e "${RED}Failed to upload backup to S3.${NC}"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
    else
        echo -e "${RED}Failed to create database dump.${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
}

perform_restore() {
    echo -e "${YELLOW}Fetching available backups from S3...${NC}"
    
    # List backups using Dockerized AWS CLI
    docker run --rm \
        -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
        -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
        -e AWS_REGION="$AWS_REGION" \
        amazon/aws-cli s3 ls "s3://${S3_BUCKET_NAME}/${BACKUP_PREFIX}/" | sort -r
    
    echo ""
    read -p "Enter the filename to restore (e.g., backup_peptides_db_20251123_120000.sql): " BACKUP_FILENAME
    
    if [ -z "$BACKUP_FILENAME" ]; then
        echo -e "${RED}No filename provided.${NC}"
        exit 1
    fi

    TEMP_DIR="$(pwd)/temp_db_restore"
    mkdir -p "$TEMP_DIR"
    LOCAL_BACKUP_PATH="${TEMP_DIR}/${BACKUP_FILENAME}"
    S3_PATH="s3://${S3_BUCKET_NAME}/${BACKUP_PREFIX}/${BACKUP_FILENAME}"

    # Download from S3
    echo -e "${YELLOW}Downloading ${S3_PATH}...${NC}"
    
    if docker run --rm \
        -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
        -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
        -e AWS_REGION="$AWS_REGION" \
        -v "$TEMP_DIR":/aws \
        amazon/aws-cli s3 cp "$S3_PATH" "/aws/${BACKUP_FILENAME}"; then
        
        echo -e "${GREEN}Download successful.${NC}"
        
        echo -e "${YELLOW}Restoring database... (This will overwrite existing data)${NC}"
        read -p "Are you sure? (y/N): " CONFIRM
        if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
            echo "Restore cancelled."
            rm -rf "$TEMP_DIR"
            exit 0
        fi

        # Restore dump
        if cat "$LOCAL_BACKUP_PATH" | docker exec -i $DB_CONTAINER_NAME psql -U $DB_USER -d $DB_NAME; then
            echo -e "${GREEN}Database restored successfully!${NC}"
        else
            echo -e "${RED}Failed to restore database.${NC}"
        fi
        
        rm -rf "$TEMP_DIR"
    else
        echo -e "${RED}Failed to download backup from S3.${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
}

# Main script logic
check_requirements

echo "Database Backup & Restore Utility"
echo "---------------------------------"
echo "1. Backup Database to S3"
echo "2. Restore Database from S3"
echo "3. Exit"
echo ""
read -p "Select an option (1-3): " OPTION

case $OPTION in
    1)
        perform_backup
        ;;
    2)
        perform_restore
        ;;
    3)
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option.${NC}"
        exit 1
        ;;
esac
