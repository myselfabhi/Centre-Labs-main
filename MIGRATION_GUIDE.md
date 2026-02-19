# Server Migration Guide

This guide provides comprehensive instructions for migrating all services from your current server to a new AWS account using the automated migration script.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Migration Process](#migration-process)
- [What Gets Migrated](#what-gets-migrated)
- [Step-by-Step Instructions](#step-by-step-instructions)
- [Post-Migration Steps](#post-migration-steps)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedure](#rollback-procedure)

## Overview

The `migrate-to-new-server.sh` script automates the migration of:

1. **PostgreSQL Database** - Complete backup and structure for restore
2. **S3 Bucket Contents** - All objects from old to new bucket
3. **Database S3 URLs** - Updates all references to point to new bucket
4. **Configuration Files** - Generates new Docker Compose and environment files

## Prerequisites

### Required Software

Ensure the following are installed on your system:

- **Docker** (v20.10 or later)
- **Docker Compose** (v1.29 or later)
- **AWS CLI** (v2.0 or later)
- **PostgreSQL Client Tools** (`pg_dump`, `psql`)
- **jq** (JSON processor)
- **bash** (v4.0 or later)

Install on Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose awscli postgresql-client jq
```

Install on macOS:
```bash
brew install docker docker-compose awscli postgresql jq
```

### AWS Account Setup

#### 1. Configure AWS CLI for Old Account

```bash
# Configure old AWS account credentials
aws configure --profile old-aws
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., ap-south-1)
# - Output format (json)
```

#### 2. Configure AWS CLI for New Account

```bash
# Configure new AWS account credentials
aws configure --profile new-aws
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Output format (json)
```

#### 3. Verify Access

```bash
# Test old account access
aws s3 ls --profile old-aws

# Test new account access
aws s3 ls --profile new-aws
```

### Database Access

Ensure you have:
- Database host and port accessible
- Database credentials (username and password)
- Network access to the database (firewall rules, security groups)

### Permissions Required

#### Old AWS Account:
- `s3:ListBucket` on source bucket
- `s3:GetObject` on source bucket objects

#### New AWS Account:
- `s3:CreateBucket` (if bucket doesn't exist)
- `s3:PutBucketVersioning`
- `s3:PutObject` on destination bucket
- `s3:ListBucket` on destination bucket

## What Gets Migrated

### Database Content

All tables and data including:
- Users and permissions
- Customers and orders
- Products, variants, and inventory
- **Product images** (URLs will be updated)
- **Variant images** (URLs will be updated)
- **Media files** (URLs will be updated)
- **Email template backgrounds** (URLs will be updated)
- Categories, tags, and reviews
- Promotions and discounts
- System settings

### S3 Bucket Objects

All objects in the S3 bucket:
- Product images
- Variant images
- Email template backgrounds
- Media library files
- Any other uploaded content

### Configuration Files

Generated for new server:
- Docker Compose configuration with new AWS settings
- Environment variables template
- SQL script for updating S3 URLs

## Migration Process

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Migration Process                        │
└─────────────────────────────────────────────────────────────┘

1. Prerequisites Check
   ├── Verify required tools installed
   ├── Check AWS CLI configuration
   └── Validate database connectivity

2. Configuration Setup
   ├── Load or prompt for configuration
   ├── Validate AWS access
   └── Create migration directory

3. Database Backup
   ├── Export complete database dump
   ├── Create compressed backup
   └── Generate backup logs

4. S3 Migration
   ├── Verify access to both buckets
   ├── Create new bucket if needed
   ├── Copy all objects
   └── Verify object counts

5. URL Updates
   ├── Generate SQL update script
   ├── Update ProductImage URLs
   ├── Update VariantImage URLs
   ├── Update MediaFile URLs
   └── Update EmailTemplate backgrounds

6. Configuration Generation
   ├── Generate new Docker Compose file
   ├── Generate environment template
   └── Create migration summary

7. Migration Complete
   └── Review summary and next steps
```

## Step-by-Step Instructions

### Step 1: Prepare for Migration

1. **Backup Current Server** (recommended safety measure)
   ```bash
   # Create a snapshot of your current server instance
   # Or ensure you have recent backups
   ```

2. **Clone the Repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd centre_research_peptides_ecommerce_monorepo
   ```

3. **Review Current Configuration**
   ```bash
   # Review current docker compose configuration
   cat docker-compose.staging.yaml
   
   # Note the current S3 bucket name and AWS region
   grep -E "S3_BUCKET_NAME|AWS_REGION" docker-compose.staging.yaml
   ```

### Step 2: Run Migration Script

#### Option A: Interactive Mode (Recommended for First-Time)

```bash
./migrate-to-new-server.sh
```

The script will prompt you for:
- Old AWS account details (profile, region, bucket name)
- New AWS account details (profile, region, bucket name)
- Database connection details (host, port, database name, user, password)

#### Option B: Dry Run Mode (Test First)

```bash
./migrate-to-new-server.sh --dry-run
```

This shows what would be done without making any changes.

#### Option C: Using Configuration File

Create a configuration file to avoid repeated prompts:

```bash
# Create migration-config.env
cat > migration-config.env << EOF
OLD_AWS_PROFILE="old-aws"
OLD_AWS_REGION="ap-south-1"
OLD_S3_BUCKET="peptide-bucket"

NEW_AWS_PROFILE="new-aws"
NEW_AWS_REGION="us-east-1"
NEW_S3_BUCKET="peptides-new-bucket"

DB_HOST="localhost"
DB_PORT="5444"
DB_NAME="peptides_db"
DB_USER="peptides_user"
# Note: Password will still be prompted for security
EOF

# Run with config file
./migrate-to-new-server.sh --config migration-config.env
```

#### Option D: Partial Migration

Skip certain steps if already completed:

```bash
# Skip database backup (if already backed up)
./migrate-to-new-server.sh --skip-db

# Skip S3 migration (if already migrated)
./migrate-to-new-server.sh --skip-s3

# Skip URL updates (if you want to do it manually)
./migrate-to-new-server.sh --skip-url-update
```

### Step 3: Review Generated Files

After the script completes, review the migration directory:

```bash
# Navigate to migration directory (path shown at script completion)
cd migration_data_YYYYMMDD_HHMMSS/

# Review migration summary
cat MIGRATION_SUMMARY.md

# Review database backup
ls -lh database/

# Review S3 object manifest
head -20 s3_manifest/objects_list.txt

# Review URL update script
cat database/update_s3_urls.sql

# Review new Docker Compose configuration
cat configs/docker-compose.new-server.yaml

# Review environment template
cat configs/.env.new-server.template
```

### Step 4: Set Up New Server

#### 4.1. Prepare New Server Instance

```bash
# SSH to your new server
ssh user@new-server-ip

# Install Docker and Docker Compose
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Clone repository
git clone <repository-url>
cd centre_research_peptides_ecommerce_monorepo
```

#### 4.2. Transfer Migration Files

```bash
# From your local machine, transfer migration files
scp -r migration_data_YYYYMMDD_HHMMSS user@new-server-ip:/home/user/

# Or use S3 as intermediary
aws s3 cp migration_data_YYYYMMDD_HHMMSS s3://temp-bucket/migration/ --recursive
# Then on new server:
aws s3 cp s3://temp-bucket/migration/ ./migration_data/ --recursive
```

#### 4.3. Configure New Server

```bash
# On new server
cd centre_research_peptides_ecommerce_monorepo

# Copy Docker Compose configuration
cp /path/to/migration_data/configs/docker-compose.new-server.yaml docker-compose.production.yaml

# Create and edit .env file
cp /path/to/migration_data/configs/.env.new-server.template .env

# Edit .env and fill in all required values
nano .env
```

**Important:** Update these values in `.env`:
- `JWT_SECRET` - Generate a strong secret
- `STRIPE_SECRET_KEY` - Your Stripe key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret
- `EMAIL_USER` and `EMAIL_PASSWORD` - Email credentials
- `CORS_ORIGIN` - Your frontend domain
- `NEXT_PUBLIC_API_URL` - Your API domain
- All Authorize.Net credentials
- All Twilio credentials
- ShipStation credentials
- AWS credentials (should already be set from migration)

### Step 5: Restore Database

```bash
# Start only the database service
docker-compose -f docker-compose.production.yaml up -d database

# Wait for database to be ready (check health)
docker-compose ps

# Copy backup file to container
docker cp /path/to/migration_data/database/peptides_db_backup.sql peptides_db:/tmp/

# Restore database
docker exec -i peptides_db psql -U peptides_user -d peptides_db -f /tmp/peptides_db_backup.sql

# Verify restoration
docker exec -i peptides_db psql -U peptides_user -d peptides_db -c "\dt"
docker exec -i peptides_db psql -U peptides_user -d peptides_db -c "SELECT COUNT(*) FROM products;"
```

### Step 6: Apply URL Updates

```bash
# Copy SQL script to container
docker cp /path/to/migration_data/database/update_s3_urls.sql peptides_db:/tmp/

# Review the script before applying
docker exec -i peptides_db cat /tmp/update_s3_urls.sql

# Apply URL updates
docker exec -i peptides_db psql -U peptides_user -d peptides_db -f /tmp/update_s3_urls.sql

# Verify updates
docker exec -i peptides_db psql -U peptides_user -d peptides_db -c "SELECT url FROM product_images LIMIT 5;"
docker exec -i peptides_db psql -U peptides_user -d peptides_db -c "SELECT url FROM media_files LIMIT 5;"
```

### Step 7: Start All Services

```bash
# Start all services
docker-compose -f docker-compose.production.yaml up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service logs
docker-compose logs -f api
docker-compose logs -f frontend
```

## Post-Migration Steps

### 1. Update DNS Records

Point your domain to the new server:

```
# Example DNS changes needed:
api.yourdomain.com    → New Server IP
yourdomain.com        → New Server IP
www.yourdomain.com    → New Server IP
```

### 2. Configure SSL/TLS Certificates

```bash
# Using Let's Encrypt with Certbot
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### 3. Configure Nginx (if using reverse proxy)

Update nginx configuration to proxy to Docker services:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3666;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3667;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Set Up Monitoring

Configure monitoring for:
- Server resources (CPU, memory, disk)
- Docker container health
- Application logs
- Database performance
- S3 access logs

### 5. Configure Backups

Set up automated backups:

```bash
# Database backup script (run daily)
#!/bin/bash
docker exec peptides_db pg_dump -U peptides_user peptides_db | gzip > /backups/db_$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp /backups/db_$(date +%Y%m%d).sql.gz s3://your-backup-bucket/
```

### 6. Security Hardening

- Update all default passwords
- Configure firewall rules (only allow necessary ports)
- Set up fail2ban for SSH protection
- Enable AWS CloudTrail for audit logging
- Configure S3 bucket policies and CORS
- Review and minimize IAM permissions

## Verification

### Comprehensive Verification Checklist

#### Database Verification

```bash
# Check database is accessible
docker exec peptides_db psql -U peptides_user -d peptides_db -c "SELECT version();"

# Verify table counts
docker exec peptides_db psql -U peptides_user -d peptides_db -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check S3 URLs were updated
docker exec peptides_db psql -U peptides_user -d peptides_db -c "
  SELECT 'product_images' as table, COUNT(*) as count, 
         COUNT(CASE WHEN url LIKE '%${NEW_S3_BUCKET}%' THEN 1 END) as updated
  FROM product_images
  UNION ALL
  SELECT 'variant_images', COUNT(*), 
         COUNT(CASE WHEN url LIKE '%${NEW_S3_BUCKET}%' THEN 1 END)
  FROM variant_images
  UNION ALL
  SELECT 'media_files', COUNT(*), 
         COUNT(CASE WHEN url LIKE '%${NEW_S3_BUCKET}%' THEN 1 END)
  FROM media_files;
"
```

#### S3 Verification

```bash
# Compare object counts
echo "Old bucket:"
aws s3 ls s3://$OLD_S3_BUCKET --recursive --profile old-aws | wc -l

echo "New bucket:"
aws s3 ls s3://$NEW_S3_BUCKET --recursive --profile new-aws | wc -l

# Check specific files exist
aws s3 ls s3://$NEW_S3_BUCKET/email-templates/ --profile new-aws
```

#### Application Verification

```bash
# Check API health
curl http://localhost:3666/api/health

# Check frontend
curl http://localhost:3667

# Test image loading (replace with actual image URL from database)
curl -I https://${NEW_S3_BUCKET}.s3.${NEW_AWS_REGION}.amazonaws.com/path/to/image.jpg
```

#### Service Health Checks

```bash
# Check all containers are running
docker-compose ps

# Check container logs for errors
docker-compose logs --tail=100 api | grep -i error
docker-compose logs --tail=100 frontend | grep -i error

# Check database connections
docker exec peptides_api node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.\$connect()
    .then(() => console.log('Database connected'))
    .catch(e => console.error('Database error:', e))
    .finally(() => prisma.\$disconnect());
"
```

#### Functional Testing

Perform manual testing:

1. **User Authentication**
   - Log in to admin panel
   - Create a test user
   - Verify email sending

2. **Product Management**
   - View products
   - Check product images load correctly
   - Upload a new product image

3. **Order Processing**
   - Create a test order
   - Verify order emails
   - Check order status updates

4. **Payment Testing**
   - Test Stripe/Authorize.Net integration (use test mode)
   - Verify webhook handling

5. **Email Functionality**
   - Send test emails
   - Check email templates with background images

## Troubleshooting

### Common Issues and Solutions

#### Issue: Database Connection Failed

**Symptoms:**
```
Error: Connection refused to database
```

**Solutions:**
```bash
# Check if database container is running
docker-compose ps database

# Check database logs
docker-compose logs database

# Verify database credentials in .env
cat .env | grep DATABASE_URL

# Test database connection
docker exec peptides_db psql -U peptides_user -d peptides_db -c "SELECT 1;"
```

#### Issue: S3 Images Not Loading

**Symptoms:**
- Images return 403 Forbidden
- Images return 404 Not Found

**Solutions:**
```bash
# Check bucket policy allows public read
aws s3api get-bucket-policy --bucket $NEW_S3_BUCKET --profile new-aws

# Set bucket policy for public read (if appropriate)
aws s3api put-bucket-policy --bucket $NEW_S3_BUCKET --profile new-aws --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::'$NEW_S3_BUCKET'/*"
  }]
}'

# Check CORS configuration
aws s3api get-bucket-cors --bucket $NEW_S3_BUCKET --profile new-aws

# Set CORS configuration
aws s3api put-bucket-cors --bucket $NEW_S3_BUCKET --profile new-aws --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'

# Verify URLs in database were updated
docker exec peptides_db psql -U peptides_user -d peptides_db -c "SELECT url FROM product_images LIMIT 5;"
```

#### Issue: Migration Script Fails

**Symptoms:**
- Script exits with error
- Partial migration completed

**Solutions:**
```bash
# Check prerequisites
./migrate-to-new-server.sh --help

# Run in dry-run mode first
./migrate-to-new-server.sh --dry-run

# Check AWS credentials
aws sts get-caller-identity --profile old-aws
aws sts get-caller-identity --profile new-aws

# Check database connectivity
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Review script logs
# Logs are saved in migration directory
```

#### Issue: Services Won't Start

**Symptoms:**
```
Container exits immediately
Service unhealthy
```

**Solutions:**
```bash
# Check container logs
docker-compose logs api
docker-compose logs frontend

# Verify environment variables
docker-compose config

# Check if ports are already in use
netstat -tuln | grep -E '3666|3667|5444|6379'

# Restart services
docker-compose down
docker-compose up -d

# Rebuild if necessary
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Getting Help

If you encounter issues not covered here:

1. **Check Logs:**
   ```bash
   # Application logs
   docker-compose logs -f
   
   # System logs
   journalctl -u docker
   ```

2. **Verify Configuration:**
   ```bash
   # Check docker-compose configuration
   docker-compose config
   
   # Check environment variables
   docker-compose exec api env | sort
   ```

3. **Test Components Individually:**
   ```bash
   # Test database
   docker-compose up database
   
   # Test API
   docker-compose up database redis api
   
   # Add frontend last
   docker-compose up
   ```

## Rollback Procedure

If you need to rollback to the old server:

### Immediate Rollback (During Migration)

1. **Keep old server running** during initial migration
2. **Update DNS** back to old server IP
3. **Investigate issues** on new server without user impact

### Post-Migration Rollback

If issues discovered after full migration:

```bash
# 1. Stop new server services
docker-compose down

# 2. Restore old server from backup (if needed)

# 3. Update DNS to point to old server

# 4. Verify old server functionality

# 5. Investigate new server issues
```

### Data Loss Prevention

To prevent data loss during rollback:

1. **Keep old server running** for 24-48 hours after migration
2. **Sync recent data** if users made changes on new server:
   ```bash
   # Export recent data from new server
   # Import into old server
   ```
3. **Update S3 URLs back** if rolled back permanently

## Best Practices

1. **Test in Staging First:** Always test migration in staging environment
2. **Plan Downtime:** Schedule migration during low-traffic periods
3. **Communicate:** Notify users of scheduled maintenance
4. **Monitor Closely:** Watch metrics closely for 24-48 hours after migration
5. **Keep Backups:** Maintain backups of old server until confident in new setup
6. **Document Changes:** Keep notes of any customizations made during migration

## Security Checklist

- [ ] Changed all default passwords
- [ ] Updated all API keys and secrets
- [ ] Configured firewall rules
- [ ] Enabled SSL/TLS
- [ ] Set up AWS CloudTrail
- [ ] Configured S3 bucket policies
- [ ] Reviewed IAM permissions
- [ ] Enabled MFA for AWS accounts
- [ ] Set up security monitoring
- [ ] Configured automated backups

## Support and Resources

- **Docker Documentation:** https://docs.docker.com/
- **AWS S3 Documentation:** https://docs.aws.amazon.com/s3/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **AWS CLI Reference:** https://docs.aws.amazon.com/cli/

---

**Last Updated:** 2025-11-22
**Script Version:** 1.0.0
