#!/bin/bash

# AWS Configuration (use environment variables or set here for local use only)
AWS_REGION="${AWS_REGION:-us-west-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-YOUR_AWS_ACCESS_KEY_ID}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-YOUR_AWS_SECRET_ACCESS_KEY}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-centre-research-media}"
BACKUP_PREFIX="db-backups"

# Export AWS credentials for aws cli
export AWS_REGION
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables to store parsed values
DB_CONTAINER_NAME=""
DB_USER=""
DB_NAME=""
DB_PASSWORD=""

check_requirements() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: docker is not installed.${NC}"
        exit 1
    fi
    
    if ! command -v grep &> /dev/null; then
        echo -e "${RED}Error: grep is not installed.${NC}"
        exit 1
    fi
}

select_docker_compose_file() {
    echo -e "${BLUE}Available docker-compose files:${NC}"
    echo ""
    
    # Find all docker-compose files in current directory
    local compose_files=()
    local index=1
    
    for file in docker-compose*.yaml docker-compose*.yml; do
        if [ -f "$file" ]; then
            compose_files+=("$file")
            echo "  $index. $file"
            ((index++))
        fi
    done
    
    if [ ${#compose_files[@]} -eq 0 ]; then
        echo -e "${RED}No docker-compose files found in current directory.${NC}"
        exit 1
    fi
    
    echo ""
    read -p "Select a docker-compose file (1-${#compose_files[@]}): " selection
    
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#compose_files[@]} ]; then
        echo -e "${RED}Invalid selection.${NC}"
        exit 1
    fi
    
    SELECTED_COMPOSE_FILE="${compose_files[$((selection-1))]}"
    echo -e "${GREEN}Selected: ${SELECTED_COMPOSE_FILE}${NC}"
    echo ""
}

parse_database_config() {
    local compose_file="$1"
    
    echo -e "${YELLOW}Parsing database configuration from ${compose_file}...${NC}"
    
    # Extract container name (look for container_name under database service)
    DB_CONTAINER_NAME=$(grep -A 20 "database:" "$compose_file" | grep "container_name:" | head -1 | awk '{print $2}' | tr -d '"' | tr -d "'")
    
    # Extract database environment variables
    DB_NAME=$(grep -A 20 "database:" "$compose_file" | grep "POSTGRES_DB:" | head -1 | awk '{print $2}' | tr -d '"' | tr -d "'")
    DB_USER=$(grep -A 20 "database:" "$compose_file" | grep "POSTGRES_USER:" | head -1 | awk '{print $2}' | tr -d '"' | tr -d "'")
    DB_PASSWORD=$(grep -A 20 "database:" "$compose_file" | grep "POSTGRES_PASSWORD:" | head -1 | awk '{print $2}' | tr -d '"' | tr -d "'")
    
    # Validate extraction
    if [ -z "$DB_CONTAINER_NAME" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
        echo -e "${RED}Error: Could not parse database configuration from ${compose_file}${NC}"
        echo "Parsed values:"
        echo "  Container: $DB_CONTAINER_NAME"
        echo "  Database: $DB_NAME"
        echo "  User: $DB_USER"
        exit 1
    fi
    
    echo -e "${GREEN}Database configuration detected:${NC}"
    echo "  Container: $DB_CONTAINER_NAME"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo ""
}

perform_backup() {
    # Ask for custom backup name
    echo -e "${YELLOW}Enter a custom name for this backup (optional):${NC}"
    echo "  Example: before-migration, pre-deployment, feature-xyz"
    read -p "Custom name (press Enter to skip): " CUSTOM_NAME
    
    # Build backup filename
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    if [ -z "$CUSTOM_NAME" ]; then
        BACKUP_FILENAME="backup_${DB_NAME}_${TIMESTAMP}.sql"
    else
        # Sanitize custom name (replace spaces and special chars with underscores)
        SANITIZED_NAME=$(echo "$CUSTOM_NAME" | tr ' ' '_' | tr -cd '[:alnum:]_-')
        BACKUP_FILENAME="backup_${DB_NAME}_${SANITIZED_NAME}_${TIMESTAMP}.sql"
    fi
    
    # Use a local temp directory that we can mount to docker
    TEMP_DIR="$(pwd)/temp_db_backup"
    mkdir -p "$TEMP_DIR"
    BACKUP_PATH="${TEMP_DIR}/${BACKUP_FILENAME}"

    echo -e "${YELLOW}Starting backup of ${DB_NAME}...${NC}"
    echo "  Backup file: ${BACKUP_FILENAME}"

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
        echo -e "${RED}Error: Container ${DB_CONTAINER_NAME} is not running.${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi

    # Create dump
    if docker exec -t $DB_CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists > "$BACKUP_PATH"; then
        echo -e "${GREEN}Database dump created successfully${NC}"
        
        # Get file size
        FILE_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        echo "  Size: ${FILE_SIZE}"
        
        # Upload to S3 using Dockerized AWS CLI
        S3_PATH="s3://${S3_BUCKET_NAME}/${BACKUP_PREFIX}/${BACKUP_FILENAME}"
        echo -e "${YELLOW}Uploading to S3...${NC}"
        
        # Run AWS CLI container
        if docker run --rm \
            -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
            -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
            -e AWS_REGION="$AWS_REGION" \
            -v "$TEMP_DIR":/aws \
            amazon/aws-cli s3 cp "/aws/${BACKUP_FILENAME}" "$S3_PATH"; then
            
            echo -e "${GREEN}✓ Backup uploaded successfully to S3!${NC}"
            echo "  Location: ${S3_PATH}"
            rm -rf "$TEMP_DIR"
        else
            echo -e "${RED}Failed to upload backup to S3.${NC}"
            echo "  Local backup saved at: ${BACKUP_PATH}"
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
    echo ""
    
    # List backups using Dockerized AWS CLI and capture output
    BACKUPS_LIST=$(docker run --rm \
        -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
        -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
        -e AWS_REGION="$AWS_REGION" \
        amazon/aws-cli s3 ls "s3://${S3_BUCKET_NAME}/${BACKUP_PREFIX}/" | sort -r)
    
    if [ -z "$BACKUPS_LIST" ]; then
        echo -e "${RED}No backups found in S3.${NC}"
        exit 1
    fi
    
    # Parse and display backups with numbers
    echo -e "${BLUE}Available backups:${NC}"
    echo ""
    
    local backup_files=()
    local index=1
    
    while IFS= read -r line; do
        # Extract filename from the line (last field)
        filename=$(echo "$line" | awk '{print $NF}')
        if [ ! -z "$filename" ]; then
            backup_files+=("$filename")
            # Extract date and size for display
            date=$(echo "$line" | awk '{print $1, $2}')
            size=$(echo "$line" | awk '{print $3}')
            echo "  $index. $filename"
            echo "      Date: $date | Size: $size"
            echo ""
            ((index++))
        fi
    done <<< "$BACKUPS_LIST"
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        echo -e "${RED}No valid backup files found.${NC}"
        exit 1
    fi
    
    # Let user select a backup
    read -p "Select backup to restore (1-${#backup_files[@]}) or 'c' to cancel: " selection
    
    if [[ "$selection" == "c" ]] || [[ "$selection" == "C" ]]; then
        echo "Restore cancelled."
        exit 0
    fi
    
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backup_files[@]} ]; then
        echo -e "${RED}Invalid selection.${NC}"
        exit 1
    fi
    
    BACKUP_FILENAME="${backup_files[$((selection-1))]}"
    echo ""
    echo -e "${GREEN}Selected: ${BACKUP_FILENAME}${NC}"
    
    TEMP_DIR="$(pwd)/temp_db_restore"
    mkdir -p "$TEMP_DIR"
    LOCAL_BACKUP_PATH="${TEMP_DIR}/${BACKUP_FILENAME}"
    S3_PATH="s3://${S3_BUCKET_NAME}/${BACKUP_PREFIX}/${BACKUP_FILENAME}"

    # Download from S3
    echo -e "${YELLOW}Downloading backup...${NC}"
    
    if docker run --rm \
        -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
        -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
        -e AWS_REGION="$AWS_REGION" \
        -v "$TEMP_DIR":/aws \
        amazon/aws-cli s3 cp "$S3_PATH" "/aws/${BACKUP_FILENAME}"; then
        
        echo -e "${GREEN}Download successful.${NC}"
        
        # Check if container is running
        if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
            echo -e "${RED}Error: Container ${DB_CONTAINER_NAME} is not running.${NC}"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
        
        echo ""
        echo -e "${RED}WARNING: This will overwrite the current database!${NC}"
        echo "  Container: $DB_CONTAINER_NAME"
        echo "  Database: $DB_NAME"
        echo "  Backup: $BACKUP_FILENAME"
        echo ""
        read -p "Are you sure you want to proceed? Type 'yes' to confirm: " CONFIRM
        
        if [[ "$CONFIRM" != "yes" ]]; then
            echo "Restore cancelled."
            rm -rf "$TEMP_DIR"
            exit 0
        fi

        echo -e "${YELLOW}Restoring database...${NC}"
        
        # Restore dump
        if cat "$LOCAL_BACKUP_PATH" | docker exec -i $DB_CONTAINER_NAME psql -U $DB_USER -d $DB_NAME; then
            echo ""
            echo -e "${GREEN}✓ Database restored successfully!${NC}"
        else
            echo ""
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
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Database Backup & Restore Utility (Generic)         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

check_requirements

# Step 1: Select docker-compose file
select_docker_compose_file

# Step 2: Parse database configuration
parse_database_config "$SELECTED_COMPOSE_FILE"

# Step 3: Choose operation
echo "What would you like to do?"
echo ""
echo "  1. Backup Database to S3"
echo "  2. Restore Database from S3"
echo "  3. Exit"
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

echo ""
echo -e "${GREEN}Operation completed.${NC}"
