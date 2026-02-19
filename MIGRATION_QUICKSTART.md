# Quick Start - Server Migration

This is a condensed guide for experienced users. For detailed instructions, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

## Prerequisites

```bash
# Install required tools
sudo apt-get install -y docker.io docker-compose awscli postgresql-client jq

# Configure AWS profiles
aws configure --profile old-aws
aws configure --profile new-aws
```

## Quick Migration (5 Steps)

### 1. Run Migration Script

```bash
# Make executable
chmod +x migrate-to-new-server.sh

# Run (interactive prompts)
./migrate-to-new-server.sh
```

**What you'll be asked:**
- Old AWS: profile, region, bucket name
- New AWS: profile, region, bucket name
- Database: host, port, name, user, password

### 2. Review Generated Files

```bash
# Go to migration directory (path shown by script)
cd migration_data_YYYYMMDD_HHMMSS/

# Quick review
ls -lh database/       # Database backup
cat database/update_s3_urls.sql  # SQL to update URLs
cat configs/docker-compose.new-server.yaml  # New docker-compose
cat MIGRATION_SUMMARY.md  # Full summary
```

### 3. Set Up New Server

```bash
# On new server
cd /path/to/project

# Copy config
cp /path/to/migration_data/configs/docker-compose.new-server.yaml docker-compose.production.yaml

# Create .env from template
cp /path/to/migration_data/configs/.env.new-server.template .env
nano .env  # Fill in all values
```

### 4. Restore Database & Apply Updates

```bash
# Start database
docker-compose -f docker-compose.production.yaml up -d database
sleep 10

# Restore
docker cp /path/to/migration_data/database/peptides_db_backup.sql peptides_db:/tmp/
docker exec peptides_db psql -U peptides_user -d peptides_db -f /tmp/peptides_db_backup.sql

# Update URLs
docker cp /path/to/migration_data/database/update_s3_urls.sql peptides_db:/tmp/
docker exec peptides_db psql -U peptides_user -d peptides_db -f /tmp/update_s3_urls.sql
```

### 5. Start Services

```bash
# Start all services
docker-compose -f docker-compose.production.yaml up -d

# Check status
docker-compose ps
docker-compose logs -f
```

## Verification Commands

```bash
# Database
docker exec peptides_db psql -U peptides_user -d peptides_db -c "SELECT COUNT(*) FROM products;"

# S3 URLs updated
docker exec peptides_db psql -U peptides_user -d peptides_db -c "SELECT url FROM product_images LIMIT 3;"

# API health
curl http://localhost:3666/api/health

# Check logs
docker-compose logs --tail=50 api
docker-compose logs --tail=50 frontend
```

## Dry Run First (Recommended)

```bash
# Test without making changes
./migrate-to-new-server.sh --dry-run
```

## Partial Migration

```bash
# Skip database (if already done)
./migrate-to-new-server.sh --skip-db

# Skip S3 (if already done)
./migrate-to-new-server.sh --skip-s3

# Skip URL updates (manual later)
./migrate-to-new-server.sh --skip-url-update
```

## Using Config File

```bash
# Create config file
cat > migration-config.env << 'EOF'
OLD_AWS_PROFILE="default"
OLD_AWS_REGION="ap-south-1"
OLD_S3_BUCKET="peptide-bucket"
NEW_AWS_PROFILE="new-account"
NEW_AWS_REGION="us-east-1"
NEW_S3_BUCKET="peptides-new-bucket"
DB_HOST="localhost"
DB_PORT="5444"
DB_NAME="peptides_db"
DB_USER="peptides_user"
EOF

# Run with config
./migrate-to-new-server.sh --config migration-config.env
```

## Post-Migration Checklist

- [ ] Update DNS to point to new server
- [ ] Configure SSL certificates (Let's Encrypt)
- [ ] Set up automated backups
- [ ] Configure monitoring
- [ ] Test all functionality
- [ ] Update firewall rules
- [ ] Review security settings

## Common Issues

### Images Not Loading

```bash
# Check S3 bucket policy
aws s3api get-bucket-policy --bucket NEW_BUCKET --profile new-aws

# Set public read (if needed)
aws s3api put-bucket-policy --bucket NEW_BUCKET --profile new-aws --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::NEW_BUCKET/*"
  }]
}'
```

### Service Won't Start

```bash
# Check logs
docker-compose logs api

# Verify config
docker-compose config

# Rebuild
docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

## Rollback

If issues occur:

1. Keep old server running during migration
2. Update DNS back to old server
3. Fix issues on new server without affecting users

## Get Help

- Full guide: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- Script help: `./migrate-to-new-server.sh --help`
- Check logs in migration directory

---

**Need detailed instructions?** See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
