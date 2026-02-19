# Migration Troubleshooting Guide

Quick reference for resolving common issues during server migration.

## Quick Diagnosis

Run these commands first to understand the issue:

```bash
# Check script help
./migrate-to-new-server.sh --help

# Run pre-migration checklist
./pre-migration-checklist.sh

# Check Docker services
docker-compose ps

# Check logs
docker-compose logs --tail=50 api
docker-compose logs --tail=50 database
```

---

## Common Issues & Solutions

### 1. Prerequisites Issues

#### Issue: "Command not found: docker" or other tools

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose awscli postgresql-client jq

# macOS
brew install docker docker-compose awscli postgresql jq

# Verify installation
docker --version
docker-compose --version
aws --version
pg_dump --version
```

#### Issue: "Permission denied" when running scripts

**Solution:**
```bash
# Make scripts executable
chmod +x migrate-to-new-server.sh
chmod +x verify-migration.sh
chmod +x pre-migration-checklist.sh

# Or run with bash
bash migrate-to-new-server.sh
```

---

### 2. AWS Configuration Issues

#### Issue: "Unable to locate credentials"

**Solution:**
```bash
# Configure AWS CLI
aws configure --profile old-aws
# Enter access key, secret key, region, output format

aws configure --profile new-aws
# Enter access key, secret key, region, output format

# Verify configuration
aws sts get-caller-identity --profile old-aws
aws sts get-caller-identity --profile new-aws
```

#### Issue: "Access Denied" for S3 bucket

**Solution:**
```bash
# Check IAM permissions for old account:
# - s3:ListBucket on source bucket
# - s3:GetObject on source bucket objects

# Check IAM permissions for new account:
# - s3:CreateBucket
# - s3:PutBucketVersioning
# - s3:PutObject on destination bucket
# - s3:ListBucket on destination bucket

# Test access
aws s3 ls s3://OLD_BUCKET --profile old-aws --region OLD_REGION
aws s3 ls s3://NEW_BUCKET --profile new-aws --region NEW_REGION
```

#### Issue: "InvalidAccessKeyId" or "SignatureDoesNotMatch"

**Solution:**
```bash
# Reconfigure AWS credentials
aws configure --profile PROFILE_NAME

# Or edit credentials directly
nano ~/.aws/credentials

# Format should be:
# [profile-name]
# aws_access_key_id = YOUR_KEY
# aws_secret_access_key = YOUR_SECRET
```

---

### 3. Database Connection Issues

#### Issue: "Connection refused" to database

**Solution:**
```bash
# Check if database container is running
docker-compose ps database

# Start database if not running
docker-compose up -d database

# Wait for database to be ready
sleep 10

# Check database logs
docker-compose logs database

# Test connection manually
docker exec peptides_db psql -U peptides_user -d peptides_db -c "SELECT 1;"

# If using remote database, check:
# 1. Firewall rules allow connection
# 2. Security groups allow your IP
# 3. Database is listening on specified port
```

#### Issue: "Authentication failed for user"

**Solution:**
```bash
# Verify credentials in docker-compose.staging.yaml
grep -A 5 "POSTGRES_" docker-compose.staging.yaml

# Check environment variable
docker-compose exec database printenv | grep POSTGRES

# Reset password if needed (in docker-compose.yaml)
# Then restart:
docker-compose down
docker-compose up -d database
```

#### Issue: Database backup fails with "pg_dump: error"

**Solution:**
```bash
# Check PostgreSQL client version matches server
psql --version
docker exec peptides_db psql --version

# If versions differ, use docker exec for backup
docker exec peptides_db pg_dump -U peptides_user peptides_db > backup.sql

# Check disk space
df -h

# Check database size
docker exec peptides_db psql -U peptides_user -d peptides_db -c \
  "SELECT pg_size_pretty(pg_database_size('peptides_db'));"
```

---

### 4. S3 Migration Issues

#### Issue: S3 sync takes too long or hangs

**Solution:**
```bash
# Check number of objects
aws s3 ls s3://OLD_BUCKET --recursive --profile old-aws | wc -l

# For large buckets, use screen/tmux to prevent disconnection
screen -S migration
./migrate-to-new-server.sh
# Ctrl+A, D to detach
# screen -r migration to reattach

# Or use AWS DataSync for very large migrations
# https://aws.amazon.com/datasync/
```

#### Issue: "BucketAlreadyExists" error

**Solution:**
```bash
# S3 bucket names are globally unique
# Choose a different bucket name

# Or if you own the bucket but in different region:
aws s3 mb s3://NEW_BUCKET --region NEW_REGION --profile new-aws

# Verify bucket exists
aws s3 ls s3://NEW_BUCKET --profile new-aws --region NEW_REGION
```

#### Issue: Some objects fail to copy

**Solution:**
```bash
# Check error logs in migration directory
cat migration_data_*/s3_manifest/*.log

# Verify object counts
OLD_COUNT=$(aws s3 ls s3://OLD_BUCKET --recursive --profile old-aws | wc -l)
NEW_COUNT=$(aws s3 ls s3://NEW_BUCKET --recursive --profile new-aws | wc -l)
echo "Old: $OLD_COUNT, New: $NEW_COUNT"

# Retry failed objects manually
aws s3 sync s3://OLD_BUCKET s3://NEW_BUCKET \
  --source-region OLD_REGION \
  --region NEW_REGION \
  --profile new-aws
```

#### Issue: Object permissions not set correctly

**Solution:**
```bash
# Set bucket policy for public read (if needed)
cat > /tmp/bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::NEW_BUCKET/*"
  }]
}
EOF

aws s3api put-bucket-policy \
  --bucket NEW_BUCKET \
  --policy file:///tmp/bucket-policy.json \
  --profile new-aws

# Set CORS if needed
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}
EOF

aws s3api put-bucket-cors \
  --bucket NEW_BUCKET \
  --cors-configuration file:///tmp/cors.json \
  --profile new-aws
```

---

### 5. URL Update Issues

#### Issue: SQL script fails to execute

**Solution:**
```bash
# Check SQL syntax
cat migration_data_*/database/update_s3_urls.sql

# Test with a single table first
docker exec peptides_db psql -U peptides_user -d peptides_db -c \
  "SELECT COUNT(*) FROM product_images WHERE url LIKE '%OLD_BUCKET%';"

# Apply update manually with transaction
docker exec -i peptides_db psql -U peptides_user -d peptides_db << 'EOF'
BEGIN;
UPDATE product_images 
SET url = REPLACE(url, 'OLD_URL', 'NEW_URL')
WHERE url LIKE '%OLD_BUCKET%';
SELECT COUNT(*) FROM product_images WHERE url LIKE '%NEW_BUCKET%';
COMMIT;
EOF
```

#### Issue: URLs not updating for all records

**Solution:**
```bash
# Check current URLs
docker exec peptides_db psql -U peptides_user -d peptides_db -c \
  "SELECT DISTINCT substring(url from 1 for 50) FROM product_images LIMIT 5;"

# Verify old S3 URL pattern
OLD_URL="https://peptide-bucket.s3.ap-south-1.amazonaws.com"
NEW_URL="https://new-bucket.s3.us-east-1.amazonaws.com"

# Update each table manually if needed
docker exec peptides_db psql -U peptides_user -d peptides_db -c \
  "UPDATE product_images SET url = REPLACE(url, '$OLD_URL', '$NEW_URL');"

# For array fields (EmailTemplate)
docker exec peptides_db psql -U peptides_user -d peptides_db << 'EOF'
UPDATE email_templates
SET "backgroundImages" = (
  SELECT array_agg(REPLACE(elem, 'OLD_URL', 'NEW_URL'))
  FROM unnest("backgroundImages") AS elem
);
EOF
```

---

### 6. Docker Compose Issues

#### Issue: New docker-compose configuration fails to start

**Solution:**
```bash
# Validate docker-compose syntax
docker-compose -f docker-compose.production.yaml config

# Check environment variables
cat .env

# Start services one at a time
docker-compose -f docker-compose.production.yaml up -d database
docker-compose -f docker-compose.production.yaml up -d redis
docker-compose -f docker-compose.production.yaml up -d api
docker-compose -f docker-compose.production.yaml up -d frontend

# Check logs for errors
docker-compose logs api
docker-compose logs frontend
```

#### Issue: "Cannot connect to Docker daemon"

**Solution:**
```bash
# Start Docker daemon
sudo systemctl start docker

# Add user to docker group (logout/login required)
sudo usermod -aG docker $USER

# Or use sudo
sudo docker-compose up -d
```

#### Issue: Port already in use

**Solution:**
```bash
# Check what's using the port
netstat -tuln | grep -E '3666|3667|5444|6379'
# Or
lsof -i :3666

# Change ports in docker-compose.yaml
# From: "3666:3001"
# To:   "3668:3001"  # Use different host port

# Or stop conflicting service
sudo systemctl stop service-name
```

---

### 7. Application Issues

#### Issue: Images not loading after migration

**Solution:**
```bash
# 1. Verify URLs in database
docker exec peptides_db psql -U peptides_user -d peptides_db -c \
  "SELECT url FROM product_images LIMIT 3;"

# 2. Test S3 URL directly
curl -I https://NEW_BUCKET.s3.NEW_REGION.amazonaws.com/path/to/image.jpg

# 3. Check S3 bucket policy
aws s3api get-bucket-policy --bucket NEW_BUCKET --profile new-aws

# 4. Check CORS configuration
aws s3api get-bucket-cors --bucket NEW_BUCKET --profile new-aws

# 5. Verify environment variables in container
docker-compose exec api printenv | grep -E "S3|AWS"

# 6. Check API logs for S3 errors
docker-compose logs api | grep -i "s3\|aws"
```

#### Issue: API returns 500 errors

**Solution:**
```bash
# Check API logs
docker-compose logs --tail=100 api

# Check database connection
docker-compose exec api node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.\$connect()
    .then(() => console.log('✓ Database connected'))
    .catch(e => console.error('✗ Database error:', e))
    .finally(() => prisma.\$disconnect());
"

# Check environment variables
docker-compose exec api printenv | grep -E "DATABASE_URL|JWT_SECRET"

# Restart API service
docker-compose restart api
```

#### Issue: Frontend shows blank page

**Solution:**
```bash
# Check frontend logs
docker-compose logs --tail=100 frontend

# Check if frontend can reach API
docker-compose exec frontend curl http://api:3001/api/health

# Check environment variables
docker-compose exec frontend printenv | grep -E "NEXT_PUBLIC"

# Rebuild frontend
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

---

### 8. Migration Script Issues

#### Issue: Script exits with error

**Solution:**
```bash
# Run with verbose output
bash -x migrate-to-new-server.sh --dry-run 2>&1 | tee migration.log

# Check prerequisites
./pre-migration-checklist.sh

# Run in stages
./migrate-to-new-server.sh --skip-s3 --skip-url-update  # Only DB backup
./migrate-to-new-server.sh --skip-db --skip-url-update  # Only S3
./migrate-to-new-server.sh --skip-db --skip-s3          # Only URL updates
```

#### Issue: Migration directory permissions

**Solution:**
```bash
# Check ownership
ls -la migration_data_*/

# Fix permissions
sudo chown -R $USER:$USER migration_data_*/
chmod -R 755 migration_data_*/
```

---

## Emergency Rollback

If migration fails and you need to rollback:

```bash
# 1. Keep old server running (don't shut it down)

# 2. Update DNS to point back to old server
# (Do this in your DNS provider's control panel)

# 3. Stop new server services
docker-compose down

# 4. Investigate issues on new server
docker-compose logs > error_logs.txt

# 5. Fix issues and try again
```

---

## Getting Additional Help

### Check Documentation

```bash
# Full guide
cat MIGRATION_GUIDE.md | less

# Quick start
cat MIGRATION_QUICKSTART.md

# Overview
cat MIGRATION_README.md

# Script help
./migrate-to-new-server.sh --help
```

### Collect Debug Information

```bash
# Create debug report
cat > debug_info.txt << EOF
=== System Info ===
$(uname -a)

=== Docker Version ===
$(docker --version)
$(docker-compose --version)

=== AWS CLI Version ===
$(aws --version)

=== PostgreSQL Version ===
$(pg_dump --version)

=== Docker Services ===
$(docker-compose ps)

=== Docker Logs ===
$(docker-compose logs --tail=50)

=== Environment ===
$(docker-compose config)

=== Disk Space ===
$(df -h)
EOF

cat debug_info.txt
```

### Useful Commands

```bash
# Check all containers
docker ps -a

# Check container resources
docker stats

# Inspect container
docker inspect peptides_api

# Access container shell
docker exec -it peptides_api /bin/sh

# Check network
docker network ls
docker network inspect peptides_network

# Clean up Docker (if needed)
docker system prune -a
```

---

## Prevention Tips

1. **Always run dry-run first:**
   ```bash
   ./migrate-to-new-server.sh --dry-run
   ```

2. **Run pre-migration checklist:**
   ```bash
   ./pre-migration-checklist.sh
   ```

3. **Test in staging environment first**

4. **Keep old server running until verified**

5. **Monitor logs closely for 24-48 hours**

6. **Have rollback plan ready**

7. **Document any custom changes**

---

**Last Updated:** 2025-11-22  
**Version:** 1.0.0
