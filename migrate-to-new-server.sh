#!/bin/bash

################################################################################
# Server Migration Script
# 
# This script helps migrate all services from the current server to a new AWS
# account, including:
# - PostgreSQL database backup and restore
# - S3 bucket object migration
# - Database URL updates (replacing old S3 URLs with new ones)
# - Docker compose configuration generation
#
# Usage:
#   ./migrate-to-new-server.sh [--help] [--dry-run]
#
# Prerequisites:
#   - AWS CLI configured with credentials for both old and new accounts
#   - Docker and docker compose installed
#   - PostgreSQL client tools (pg_dump, psql)
#   - Access to the current running database
################################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_DIR="$SCRIPT_DIR/migration_data_$(date +%Y%m%d_%H%M%S)"

# Default values
DRY_RUN=false
SKIP_DB=false
SKIP_S3=false
SKIP_URL_UPDATE=false

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo "========================================================================"
    echo "$1"
    echo "========================================================================"
    echo ""
}

show_help() {
    cat << EOF
Server Migration Script

This script migrates all services from the current server to a new AWS account.

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -d, --dry-run          Perform a dry run without making changes
    --skip-db              Skip database backup and restore
    --skip-s3              Skip S3 bucket migration
    --skip-url-update      Skip database URL updates
    --config FILE          Use custom configuration file (default: migration-config.env)

Examples:
    # Full migration with interactive prompts
    ./migrate-to-new-server.sh

    # Dry run to see what would be done
    ./migrate-to-new-server.sh --dry-run

    # Skip database migration (if already done)
    ./migrate-to-new-server.sh --skip-db

EOF
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_deps=()
    
    # Check for required commands
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v docker compose >/dev/null 2>&1 || missing_deps+=("docker compose")
    command -v aws >/dev/null 2>&1 || missing_deps+=("aws")
    command -v pg_dump >/dev/null 2>&1 || missing_deps+=("pg_dump")
    command -v psql >/dev/null 2>&1 || missing_deps+=("psql")
    command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies and try again"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

load_configuration() {
    print_header "Loading Configuration"
    
    local config_file="${1:-$SCRIPT_DIR/migration-config.env}"
    
    if [ -f "$config_file" ]; then
        log_info "Loading configuration from: $config_file"
        # shellcheck source=/dev/null
        source "$config_file"
        log_success "Configuration loaded"
    else
        log_warning "Configuration file not found: $config_file"
        log_info "Will prompt for required information"
    fi
}

prompt_for_inputs() {
    print_header "Configuration Setup"
    
    # Old AWS Account Details
    echo "=== Old (Source) AWS Account ==="
    read -p "Old AWS Profile Name [default]: " OLD_AWS_PROFILE
    OLD_AWS_PROFILE=${OLD_AWS_PROFILE:-default}
    
    read -p "Old AWS Region [ap-south-1]: " OLD_AWS_REGION
    OLD_AWS_REGION=${OLD_AWS_REGION:-ap-south-1}
    
    read -p "Old S3 Bucket Name [peptide-bucket]: " OLD_S3_BUCKET
    OLD_S3_BUCKET=${OLD_S3_BUCKET:-peptide-bucket}
    
    echo ""
    echo "=== New (Target) AWS Account ==="
    read -p "New AWS Profile Name: " NEW_AWS_PROFILE
    if [ -z "$NEW_AWS_PROFILE" ]; then
        log_error "New AWS profile name is required"
        exit 1
    fi
    
    read -p "New AWS Region [us-east-1]: " NEW_AWS_REGION
    NEW_AWS_REGION=${NEW_AWS_REGION:-us-east-1}
    
    read -p "New S3 Bucket Name: " NEW_S3_BUCKET
    if [ -z "$NEW_S3_BUCKET" ]; then
        log_error "New S3 bucket name is required"
        exit 1
    fi
    
    echo ""
    echo "=== Database Configuration ==="
    read -p "Database Host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Database Port [5444]: " DB_PORT
    DB_PORT=${DB_PORT:-5444}
    
    read -p "Database Name [peptides_db]: " DB_NAME
    DB_NAME=${DB_NAME:-peptides_db}
    
    read -p "Database User [peptides_user]: " DB_USER
    DB_USER=${DB_USER:-peptides_user}
    
    read -sp "Database Password: " DB_PASSWORD
    echo ""
    
    if [ -z "$DB_PASSWORD" ]; then
        log_error "Database password is required"
        exit 1
    fi
    
    # Save configuration
    save_configuration
}

save_configuration() {
    local config_file="$SCRIPT_DIR/migration-config.env"
    
    cat > "$config_file" << EOF
# Migration Configuration
# Generated: $(date)

# Old AWS Account
OLD_AWS_PROFILE="$OLD_AWS_PROFILE"
OLD_AWS_REGION="$OLD_AWS_REGION"
OLD_S3_BUCKET="$OLD_S3_BUCKET"

# New AWS Account
NEW_AWS_PROFILE="$NEW_AWS_PROFILE"
NEW_AWS_REGION="$NEW_AWS_REGION"
NEW_S3_BUCKET="$NEW_S3_BUCKET"

# Database Configuration
DB_HOST="$DB_HOST"
DB_PORT="$DB_PORT"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
# DB_PASSWORD is not saved for security reasons

EOF
    
    log_success "Configuration saved to: $config_file"
    log_warning "Note: Database password is not saved. You'll need to provide it when needed."
}

create_migration_directory() {
    print_header "Creating Migration Directory"
    
    mkdir -p "$MIGRATION_DIR"
    mkdir -p "$MIGRATION_DIR/database"
    mkdir -p "$MIGRATION_DIR/s3_manifest"
    mkdir -p "$MIGRATION_DIR/configs"
    
    log_success "Migration directory created: $MIGRATION_DIR"
}

################################################################################
# Database Migration Functions
################################################################################

backup_database() {
    print_header "Backing Up Database"
    
    if [ "$SKIP_DB" = true ]; then
        log_warning "Skipping database backup (--skip-db flag set)"
        return 0
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would backup database: $DB_NAME"
        return 0
    fi
    
    local backup_file="$MIGRATION_DIR/database/peptides_db_backup.sql"
    
    log_info "Starting database backup..."
    log_info "Host: $DB_HOST:$DB_PORT"
    log_info "Database: $DB_NAME"
    log_info "Output: $backup_file"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-privileges \
        --verbose \
        -f "$backup_file" 2>&1 | tee "$MIGRATION_DIR/database/backup.log"; then
        
        log_success "Database backup completed"
        log_info "Backup size: $(du -h "$backup_file" | cut -f1)"
        
        # Create a compressed version
        log_info "Creating compressed backup..."
        gzip -c "$backup_file" > "$backup_file.gz"
        log_success "Compressed backup: $backup_file.gz ($(du -h "$backup_file.gz" | cut -f1))"
    else
        log_error "Database backup failed"
        exit 1
    fi
    
    unset PGPASSWORD
}

################################################################################
# S3 Migration Functions
################################################################################

verify_s3_access() {
    print_header "Verifying S3 Access"
    
    log_info "Checking access to old S3 bucket..."
    if aws s3 ls "s3://$OLD_S3_BUCKET" --profile "$OLD_AWS_PROFILE" --region "$OLD_AWS_REGION" > /dev/null 2>&1; then
        log_success "Access to old S3 bucket verified"
    else
        log_error "Cannot access old S3 bucket: $OLD_S3_BUCKET"
        exit 1
    fi
    
    log_info "Checking access to new S3 bucket..."
    if aws s3 ls "s3://$NEW_S3_BUCKET" --profile "$NEW_AWS_PROFILE" --region "$NEW_AWS_REGION" > /dev/null 2>&1; then
        log_success "New S3 bucket exists and is accessible"
    else
        log_warning "New S3 bucket does not exist or is not accessible"
        read -p "Create new S3 bucket? (y/n): " create_bucket
        if [ "$create_bucket" = "y" ]; then
            create_new_s3_bucket
        else
            log_error "Cannot proceed without access to new S3 bucket"
            exit 1
        fi
    fi
}

create_new_s3_bucket() {
    log_info "Creating new S3 bucket: $NEW_S3_BUCKET"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would create S3 bucket: $NEW_S3_BUCKET"
        return 0
    fi
    
    # Create bucket with appropriate region
    if [ "$NEW_AWS_REGION" = "us-east-1" ]; then
        aws s3 mb "s3://$NEW_S3_BUCKET" \
            --profile "$NEW_AWS_PROFILE" \
            --region "$NEW_AWS_REGION"
    else
        aws s3 mb "s3://$NEW_S3_BUCKET" \
            --profile "$NEW_AWS_PROFILE" \
            --region "$NEW_AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$NEW_AWS_REGION"
    fi
    
    # Enable versioning (optional but recommended)
    aws s3api put-bucket-versioning \
        --bucket "$NEW_S3_BUCKET" \
        --versioning-configuration Status=Enabled \
        --profile "$NEW_AWS_PROFILE" \
        --region "$NEW_AWS_REGION"
    
    # Set bucket policy for public read if needed
    log_info "Note: You may need to configure bucket policies and CORS settings manually"
    
    log_success "S3 bucket created successfully"
}

migrate_s3_objects() {
    print_header "Migrating S3 Objects"
    
    if [ "$SKIP_S3" = true ]; then
        log_warning "Skipping S3 migration (--skip-s3 flag set)"
        return 0
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would migrate objects from $OLD_S3_BUCKET to $NEW_S3_BUCKET"
        
        # List objects to show what would be migrated
        log_info "Objects that would be migrated:"
        aws s3 ls "s3://$OLD_S3_BUCKET" --recursive --profile "$OLD_AWS_PROFILE" --region "$OLD_AWS_REGION" | head -20
        return 0
    fi
    
    log_info "Counting objects in source bucket..."
    local object_count
    object_count=$(aws s3 ls "s3://$OLD_S3_BUCKET" --recursive --profile "$OLD_AWS_PROFILE" --region "$OLD_AWS_REGION" | wc -l)
    log_info "Total objects to migrate: $object_count"
    
    if [ "$object_count" -eq 0 ]; then
        log_warning "No objects found in source bucket"
        return 0
    fi
    
    # Create manifest of all objects
    log_info "Creating object manifest..."
    aws s3 ls "s3://$OLD_S3_BUCKET" --recursive --profile "$OLD_AWS_PROFILE" --region "$OLD_AWS_REGION" \
        > "$MIGRATION_DIR/s3_manifest/objects_list.txt"
    
    # Perform the sync
    log_info "Starting S3 sync operation..."
    log_info "This may take a while depending on the number and size of objects..."
    
    # Use AWS CLI to sync between buckets
    # Note: This requires credentials for both accounts to be available
    log_info "Syncing objects from old to new bucket..."
    
    # Method 1: If you have access to both accounts simultaneously
    # aws s3 sync "s3://$OLD_S3_BUCKET" "s3://$NEW_S3_BUCKET" \
    #     --source-region "$OLD_AWS_REGION" \
    #     --region "$NEW_AWS_REGION" \
    #     --profile "$NEW_AWS_PROFILE"
    
    # Method 2: Download and upload (more reliable across different accounts)
    local temp_dir="$MIGRATION_DIR/s3_temp"
    mkdir -p "$temp_dir"
    
    log_info "Step 1/2: Downloading objects from old bucket..."
    aws s3 sync "s3://$OLD_S3_BUCKET" "$temp_dir" \
        --profile "$OLD_AWS_PROFILE" \
        --region "$OLD_AWS_REGION"
    
    log_info "Step 2/2: Uploading objects to new bucket..."
    aws s3 sync "$temp_dir" "s3://$NEW_S3_BUCKET" \
        --profile "$NEW_AWS_PROFILE" \
        --region "$NEW_AWS_REGION"
    
    log_success "S3 migration completed"
    
    # Verify migration
    log_info "Verifying migration..."
    local new_object_count
    new_object_count=$(aws s3 ls "s3://$NEW_S3_BUCKET" --recursive --profile "$NEW_AWS_PROFILE" --region "$NEW_AWS_REGION" | wc -l)
    
    if [ "$new_object_count" -eq "$object_count" ]; then
        log_success "Verification passed: All objects migrated successfully"
    else
        log_warning "Object count mismatch: Old=$object_count, New=$new_object_count"
        log_warning "Please review the migration logs"
    fi
    
    # Clean up temporary directory
    log_info "Cleaning up temporary files..."
    rm -rf "$temp_dir"
}

################################################################################
# Database URL Update Functions
################################################################################

generate_url_update_sql() {
    print_header "Generating URL Update Script"
    
    if [ "$SKIP_URL_UPDATE" = true ]; then
        log_warning "Skipping URL update script generation (--skip-url-update flag set)"
        return 0
    fi
    
    local sql_file="$MIGRATION_DIR/database/update_s3_urls.sql"
    
    # Construct old and new S3 base URLs
    local old_s3_url="https://${OLD_S3_BUCKET}.s3.${OLD_AWS_REGION}.amazonaws.com"
    local new_s3_url="https://${NEW_S3_BUCKET}.s3.${NEW_AWS_REGION}.amazonaws.com"
    
    log_info "Old S3 URL: $old_s3_url"
    log_info "New S3 URL: $new_s3_url"
    
    cat > "$sql_file" << EOF
-- S3 URL Update Script
-- Generated: $(date)
-- 
-- This script updates all S3 URLs in the database to point to the new bucket
-- Old URL: $old_s3_url
-- New URL: $new_s3_url

BEGIN;

-- Backup tables before updating (optional, comment out if not needed)
-- CREATE TABLE IF NOT EXISTS product_images_backup AS SELECT * FROM product_images;
-- CREATE TABLE IF NOT EXISTS variant_images_backup AS SELECT * FROM variant_images;
-- CREATE TABLE IF NOT EXISTS media_files_backup AS SELECT * FROM media_files;
-- CREATE TABLE IF NOT EXISTS email_templates_backup AS SELECT * FROM email_templates;

-- Update ProductImage URLs
UPDATE product_images
SET url = REPLACE(url, '$old_s3_url', '$new_s3_url')
WHERE url LIKE '$old_s3_url%';

-- Update VariantImage URLs
UPDATE variant_images
SET url = REPLACE(url, '$old_s3_url', '$new_s3_url')
WHERE url LIKE '$old_s3_url%';

-- Update MediaFile URLs
UPDATE media_files
SET url = REPLACE(url, '$old_s3_url', '$new_s3_url')
WHERE url LIKE '$old_s3_url%';

-- Update EmailTemplate background images (array field)
UPDATE email_templates
SET "backgroundImages" = (
    SELECT array_agg(REPLACE(elem, '$old_s3_url', '$new_s3_url'))
    FROM unnest("backgroundImages") AS elem
)
WHERE EXISTS (
    SELECT 1 FROM unnest("backgroundImages") AS elem
    WHERE elem LIKE '$old_s3_url%'
);

-- Show update counts
SELECT 'product_images' as table_name, COUNT(*) as updated_rows 
FROM product_images 
WHERE url LIKE '$new_s3_url%'
UNION ALL
SELECT 'variant_images', COUNT(*) 
FROM variant_images 
WHERE url LIKE '$new_s3_url%'
UNION ALL
SELECT 'media_files', COUNT(*) 
FROM media_files 
WHERE url LIKE '$new_s3_url%'
UNION ALL
SELECT 'email_templates', COUNT(*) 
FROM email_templates 
WHERE EXISTS (
    SELECT 1 FROM unnest("backgroundImages") AS elem
    WHERE elem LIKE '$new_s3_url%'
);

-- Commit transaction
COMMIT;

-- Verification queries
-- Run these after the update to verify changes:
-- SELECT url FROM product_images WHERE url LIKE '%$NEW_S3_BUCKET%' LIMIT 5;
-- SELECT url FROM variant_images WHERE url LIKE '%$NEW_S3_BUCKET%' LIMIT 5;
-- SELECT url FROM media_files WHERE url LIKE '%$NEW_S3_BUCKET%' LIMIT 5;

EOF
    
    log_success "URL update script generated: $sql_file"
    log_warning "Review the script before executing!"
}

apply_url_updates() {
    print_header "Applying URL Updates to Database"
    
    if [ "$SKIP_URL_UPDATE" = true ]; then
        log_warning "Skipping URL updates (--skip-url-update flag set)"
        return 0
    fi
    
    local sql_file="$MIGRATION_DIR/database/update_s3_urls.sql"
    
    if [ ! -f "$sql_file" ]; then
        log_error "SQL update script not found: $sql_file"
        exit 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would execute SQL script: $sql_file"
        log_info "[DRY RUN] Preview of script:"
        head -30 "$sql_file"
        return 0
    fi
    
    read -p "Apply URL updates to database? This will modify data! (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_warning "URL update cancelled by user"
        return 0
    fi
    
    log_info "Applying URL updates..."
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$sql_file" \
        > "$MIGRATION_DIR/database/url_update.log" 2>&1; then
        
        log_success "URL updates applied successfully"
        log_info "Log file: $MIGRATION_DIR/database/url_update.log"
        
        # Show summary
        log_info "Update summary:"
        tail -10 "$MIGRATION_DIR/database/url_update.log"
    else
        log_error "Failed to apply URL updates"
        log_error "Check log file: $MIGRATION_DIR/database/url_update.log"
        exit 1
    fi
    
    unset PGPASSWORD
}

################################################################################
# Configuration Generation Functions
################################################################################

generate_docker_compose() {
    print_header "Generating Docker Compose Configuration"
    
    local compose_file="$MIGRATION_DIR/configs/docker compose.new-server.yaml"
    
    # Get new AWS credentials
    log_info "Retrieving AWS credentials for new account..."
    
    local new_access_key
    local new_secret_key
    
    # Try to get credentials from AWS CLI config
    new_access_key=$(aws configure get aws_access_key_id --profile "$NEW_AWS_PROFILE" 2>/dev/null || echo "YOUR_NEW_AWS_ACCESS_KEY_ID")
    new_secret_key=$(aws configure get aws_secret_access_key --profile "$NEW_AWS_PROFILE" 2>/dev/null || echo "YOUR_NEW_AWS_SECRET_ACCESS_KEY")
    
    cat > "$compose_file" << EOF
version: "3.8"

# Docker Compose Configuration for New Server
# Generated: $(date)
# 
# This configuration is based on docker compose.staging.yaml
# with updated AWS credentials and S3 bucket settings

services:
  database:
    image: postgres:15-alpine
    container_name: peptides_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: peptides_db
      POSTGRES_USER: peptides_user
      POSTGRES_PASSWORD: peptides_password_2024  # CHANGE THIS IN PRODUCTION
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5444:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U peptides_user -d peptides_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: harshitdkanodia/peptides_api:latest
    container_name: peptides_api
    restart: unless-stopped
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://peptides_user:peptides_password_2024@database:5432/peptides_db
      JWT_SECRET: \${JWT_SECRET}  # SET THIS IN .env FILE
      STRIPE_SECRET_KEY: \${STRIPE_SECRET_KEY}  # SET THIS IN .env FILE
      STRIPE_WEBHOOK_SECRET: \${STRIPE_WEBHOOK_SECRET}  # SET THIS IN .env FILE
      EMAIL_HOST: smtp.gmail.com
      EMAIL_PORT: 587
      EMAIL_SECURE: false
      EMAIL_USER: \${EMAIL_USER}  # SET THIS IN .env FILE
      EMAIL_PASSWORD: \${EMAIL_PASSWORD}  # SET THIS IN .env FILE
      EMAIL_FROM: \${EMAIL_FROM}  # SET THIS IN .env FILE
      SHIPPING_MANAGER_EMAIL: \${SHIPPING_MANAGER_EMAIL}
      CORS_ORIGIN: \${CORS_ORIGIN}  # SET THIS IN .env FILE
      PORT: 3001
      
      # Authorize.Net
      ANET_ENV: production
      ANET_API_LOGIN_ID: \${ANET_API_LOGIN_ID}
      ANET_TRANSACTION_KEY: \${ANET_TRANSACTION_KEY}
      ANET_CLIENT_KEY: \${ANET_CLIENT_KEY}
      
      # Twilio SMS Configuration
      TWILIO_ACCOUNT_SID: \${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: \${TWILIO_AUTH_TOKEN}
      TWILIO_FROM_NUMBER: \${TWILIO_FROM_NUMBER}
      TWILIO_MESSAGING_SERVICE_SID: \${TWILIO_MESSAGING_SERVICE_SID}
      
      # NEW AWS S3 Configuration
      AWS_REGION: ${NEW_AWS_REGION}
      AWS_ACCESS_KEY_ID: ${new_access_key}
      AWS_SECRET_KEY_ID: ${new_secret_key}
      S3_BUCKET_NAME: ${NEW_S3_BUCKET}
      AWS_S3_BASE_URL: https://${NEW_S3_BUCKET}.s3.${NEW_AWS_REGION}.amazonaws.com
      AWS_FORCE_PATH_STYLE: false
      
      # ShipStation
      FRONTEND_URL: \${FRONTEND_URL}
      SHIPSTATION_BASE_URL: https://api.shipstation.com
      SHIPSTATION_API_KEY: \${SHIPSTATION_API_KEY}
      SHIPSTATION_API_SECRET: \${SHIPSTATION_API_SECRET}
      SHIPSTATION_ALLOW_MOCK_FALLBACK: false
      SHIPPING_MANAGER_EMAIL: \${SHIPPING_MANAGER_EMAIL}
    ports:
      - "3666:3001"

  frontend:
    image: harshitdkanodia/peptides_nextjs:latest
    container_name: peptides_frontend
    restart: unless-stopped
    depends_on:
      - api
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: \${NEXT_PUBLIC_API_URL}  # SET THIS IN .env FILE
      SERVER_API_URL: http://api:3001/api
      
      # Authorize.Net Frontend Configuration
      NEXT_PUBLIC_ANET_ENV: production
      NEXT_PUBLIC_ANET_API_LOGIN_ID: \${ANET_API_LOGIN_ID}
      NEXT_PUBLIC_ANET_CLIENT_KEY: \${ANET_CLIENT_KEY}
    ports:
      - "3667:3000"

  redis:
    image: redis:7-alpine
    container_name: peptides_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

EOF
    
    log_success "Docker compose configuration generated: $compose_file"
}

generate_env_template() {
    print_header "Generating Environment Variables Template"
    
    local env_file="$MIGRATION_DIR/configs/.env.new-server.template"
    
    cat > "$env_file" << EOF
# Environment Variables for New Server
# Generated: $(date)
#
# Copy this file to .env and fill in the values
# DO NOT commit .env file to version control!

# Application
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://peptides_user:peptides_password_2024@database:5432/peptides_db

# JWT
JWT_SECRET=your_jwt_secret_key_here_change_this
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
EMAIL_FROM=noreply@centreresearch.org
SHIPPING_MANAGER_EMAIL=shipping@centreresearch.org

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Authorize.Net
ANET_ENV=production
ANET_API_LOGIN_ID=your_anet_api_login_id
ANET_TRANSACTION_KEY=your_anet_transaction_key
ANET_CLIENT_KEY=your_anet_client_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=your_twilio_phone_number
TWILIO_MESSAGING_SERVICE_SID=your_twilio_messaging_service_sid

# AWS S3 (New Account)
AWS_REGION=${NEW_AWS_REGION}
AWS_ACCESS_KEY_ID=${new_access_key:-YOUR_AWS_ACCESS_KEY_ID}
AWS_SECRET_KEY_ID=${new_secret_key:-YOUR_AWS_SECRET_ACCESS_KEY}
S3_BUCKET_NAME=${NEW_S3_BUCKET}
AWS_S3_BASE_URL=https://${NEW_S3_BUCKET}.s3.${NEW_AWS_REGION}.amazonaws.com
AWS_FORCE_PATH_STYLE=false

# Frontend
FRONTEND_URL=https://your-frontend-domain.com
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api

# ShipStation
SHIPSTATION_BASE_URL=https://api.shipstation.com
SHIPSTATION_API_KEY=your_shipstation_api_key
SHIPSTATION_API_SECRET=your_shipstation_api_secret
SHIPSTATION_ALLOW_MOCK_FALLBACK=false

EOF
    
    log_success "Environment template generated: $env_file"
}

generate_migration_summary() {
    print_header "Generating Migration Summary"
    
    local summary_file="$MIGRATION_DIR/MIGRATION_SUMMARY.md"
    
    cat > "$summary_file" << EOF
# Server Migration Summary

**Migration Date:** $(date)
**Migration Directory:** $MIGRATION_DIR

## Configuration

### Source (Old) Server
- **AWS Profile:** $OLD_AWS_PROFILE
- **AWS Region:** $OLD_AWS_REGION
- **S3 Bucket:** $OLD_S3_BUCKET
- **Database Host:** $DB_HOST:$DB_PORT
- **Database Name:** $DB_NAME

### Target (New) Server
- **AWS Profile:** $NEW_AWS_PROFILE
- **AWS Region:** $NEW_AWS_REGION
- **S3 Bucket:** $NEW_S3_BUCKET

## Migration Steps Completed

- [x] Configuration loaded and validated
- [x] Prerequisites checked
- [x] Migration directory created
- [x] Database backed up
- [x] S3 objects migrated
- [x] URL update script generated
- [x] Docker compose configuration generated
- [x] Environment template generated

## Files Generated

1. **Database Backup:**
   - \`database/peptides_db_backup.sql\`
   - \`database/peptides_db_backup.sql.gz\`

2. **S3 Manifest:**
   - \`s3_manifest/objects_list.txt\`

3. **Configuration Files:**
   - \`configs/docker compose.new-server.yaml\`
   - \`configs/.env.new-server.template\`

4. **SQL Scripts:**
   - \`database/update_s3_urls.sql\`

## Next Steps

### 1. Review Generated Files
Review all generated files, especially:
- Docker compose configuration
- Environment template
- URL update SQL script

### 2. Set Up New Server

\`\`\`bash
# Copy docker compose file to your project
cp configs/docker compose.new-server.yaml /path/to/project/docker compose.production.yaml

# Create .env file from template
cp configs/.env.new-server.template /path/to/project/.env
# Edit .env and fill in all required values
\`\`\`

### 3. Restore Database

\`\`\`bash
# On new server, restore the database
docker compose up -d database
sleep 10  # Wait for database to be ready

# Restore from backup
docker cp database/peptides_db_backup.sql peptides_db:/tmp/
docker exec peptides_db psql -U peptides_user -d peptides_db -f /tmp/peptides_db_backup.sql
\`\`\`

### 4. Apply URL Updates

\`\`\`bash
# Apply S3 URL updates
docker exec peptides_db psql -U peptides_user -d peptides_db -f /path/to/update_s3_urls.sql
\`\`\`

### 5. Start Services

\`\`\`bash
# Start all services
docker compose -f docker compose.production.yaml up -d

# Check logs
docker compose logs -f
\`\`\`

### 6. Verify Migration

- [ ] Check that all services are running
- [ ] Verify database connection
- [ ] Test S3 image loading
- [ ] Check API endpoints
- [ ] Test frontend functionality
- [ ] Verify email sending
- [ ] Test payment processing

## Important Notes

1. **Secrets Management:** Update all secrets and API keys in the .env file
2. **DNS Configuration:** Update DNS records to point to new server
3. **SSL Certificates:** Configure SSL/TLS certificates for HTTPS
4. **Firewall Rules:** Configure security groups and firewall rules
5. **Monitoring:** Set up monitoring and alerting
6. **Backups:** Configure automated backups for new server

## Rollback Plan

If issues occur, you can rollback by:
1. Keeping old server running
2. Updating DNS to point back to old server
3. Investigating issues on new server without impacting users

## Support

For issues or questions, refer to:
- Migration logs in this directory
- Docker compose documentation
- AWS S3 documentation
- PostgreSQL documentation

---

**Generated by:** migrate-to-new-server.sh
**Script Version:** 1.0.0

EOF
    
    log_success "Migration summary generated: $summary_file"
}

################################################################################
# Main Migration Flow
################################################################################

main() {
    print_header "Server Migration Script"
    echo "This script will help you migrate services to a new AWS account"
    echo ""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -d|--dry-run)
                DRY_RUN=true
                log_info "Dry run mode enabled"
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                log_info "Database migration will be skipped"
                shift
                ;;
            --skip-s3)
                SKIP_S3=true
                log_info "S3 migration will be skipped"
                shift
                ;;
            --skip-url-update)
                SKIP_URL_UPDATE=true
                log_info "URL updates will be skipped"
                shift
                ;;
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Execute migration steps
    check_prerequisites
    
    # Load or prompt for configuration
    if [ -n "$CONFIG_FILE" ] && [ -f "$CONFIG_FILE" ]; then
        load_configuration "$CONFIG_FILE"
    else
        prompt_for_inputs
    fi
    
    create_migration_directory
    
    # Database migration
    backup_database
    
    # S3 migration
    verify_s3_access
    migrate_s3_objects
    
    # Generate update scripts
    generate_url_update_sql
    
    # Apply updates if not in dry run
    if [ "$DRY_RUN" = false ]; then
        read -p "Do you want to apply URL updates now? (y/n): " apply_now
        if [ "$apply_now" = "y" ]; then
            apply_url_updates
        else
            log_info "URL updates can be applied later using the generated SQL script"
        fi
    fi
    
    # Generate configuration files
    generate_docker_compose
    generate_env_template
    generate_migration_summary
    
    print_header "Migration Preparation Complete!"
    
    echo ""
    log_success "All migration artifacts have been generated in:"
    log_success "$MIGRATION_DIR"
    echo ""
    log_info "Next steps:"
    log_info "1. Review the generated files"
    log_info "2. Review the migration summary: $MIGRATION_DIR/MIGRATION_SUMMARY.md"
    log_info "3. Follow the instructions in the summary to complete the migration"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "This was a DRY RUN - no actual changes were made"
        log_info "Run without --dry-run to perform the actual migration"
    fi
}

# Run main function
main "$@"
