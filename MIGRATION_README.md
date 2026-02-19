# Server Migration Scripts - Overview

This directory contains scripts and documentation for migrating your peptides e-commerce platform to a new AWS account/server.

## 📁 Files Overview

### Scripts

| File | Purpose | Executable |
|------|---------|------------|
| `pre-migration-checklist.sh` | Pre-migration readiness checker - verifies prerequisites | ✅ Yes |
| `migrate-to-new-server.sh` | Main migration script - automates the entire migration process | ✅ Yes |
| `verify-migration.sh` | Verification script - checks migration was successful | ✅ Yes |

### Documentation

| File | Purpose | Target Audience |
|------|---------|----------------|
| `MIGRATION_GUIDE.md` | Comprehensive 20KB+ guide with detailed instructions | Everyone - First migration |
| `MIGRATION_QUICKSTART.md` | Condensed reference for experienced users | Experienced DevOps |
| `migration-config.env.example` | Configuration template with examples | All users |
| `README.md` | Updated with migration information | All users |

## 🚀 Quick Start

### Step 0: Pre-Migration Check (Recommended)

Before starting the migration, verify you're ready:

```bash
chmod +x pre-migration-checklist.sh
./pre-migration-checklist.sh
```

This checks:
- ✅ Required software installed
- ✅ AWS CLI configured
- ✅ Database accessible
- ✅ S3 bucket accessible
- ✅ Docker services running

### For First-Time Users

1. **Read the guide first:**
   ```bash
   cat MIGRATION_GUIDE.md
   # Or open in your favorite markdown viewer
   ```

2. **Run the migration script:**
   ```bash
   chmod +x migrate-to-new-server.sh
   ./migrate-to-new-server.sh
   ```

3. **Follow the prompts** - The script will ask for:
   - Old AWS account details
   - New AWS account details
   - Database credentials

4. **Review generated files** in the migration directory

5. **Follow post-migration steps** from the summary

### For Experienced Users

1. **Check quick start:**
   ```bash
   cat MIGRATION_QUICKSTART.md
   ```

2. **Create config file:**
   ```bash
   cp migration-config.env.example migration-config.env
   nano migration-config.env  # Fill in your values
   ```

3. **Run migration:**
   ```bash
   ./migrate-to-new-server.sh --config migration-config.env
   ```

4. **Verify migration:**
   ```bash
   chmod +x verify-migration.sh
   ./verify-migration.sh /path/to/migration_data_YYYYMMDD_HHMMSS
   ```

## 🎯 What Gets Migrated

```
┌─────────────────────────────────────────────────┐
│           Migration Components                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. PostgreSQL Database                          │
│     ├─ Full database backup                      │
│     ├─ All tables and data                       │
│     └─ Schema and indexes                        │
│                                                  │
│  2. S3 Bucket Objects                            │
│     ├─ Product images                            │
│     ├─ Variant images                            │
│     ├─ Email template backgrounds                │
│     └─ Media library files                       │
│                                                  │
│  3. Database S3 URLs                             │
│     ├─ product_images table                      │
│     ├─ variant_images table                      │
│     ├─ media_files table                         │
│     └─ email_templates table                     │
│                                                  │
│  4. Configuration Files                          │
│     ├─ New docker-compose.yaml                   │
│     └─ New .env template                         │
│                                                  │
└─────────────────────────────────────────────────┘
```

## ⚙️ Migration Script Options

```bash
# Show help
./migrate-to-new-server.sh --help

# Dry run (preview without changes)
./migrate-to-new-server.sh --dry-run

# Use configuration file
./migrate-to-new-server.sh --config migration-config.env

# Skip database migration (if already done)
./migrate-to-new-server.sh --skip-db

# Skip S3 migration (if already done)
./migrate-to-new-server.sh --skip-s3

# Skip URL updates (do manually later)
./migrate-to-new-server.sh --skip-url-update
```

## 📊 Migration Process Flow

```
Start
  ↓
Prerequisites Check
  ├─ Docker installed? ✓
  ├─ AWS CLI configured? ✓
  ├─ PostgreSQL client? ✓
  └─ Database accessible? ✓
  ↓
Configuration
  ├─ Load from file OR
  └─ Interactive prompts
  ↓
Create Migration Directory
  ↓
Database Backup
  ├─ Export with pg_dump
  ├─ Create compressed copy
  └─ Generate logs
  ↓
S3 Migration
  ├─ Verify access
  ├─ Create new bucket (if needed)
  ├─ Copy all objects
  └─ Verify counts
  ↓
URL Updates
  ├─ Generate SQL script
  ├─ Update ProductImage URLs
  ├─ Update VariantImage URLs
  ├─ Update MediaFile URLs
  └─ Update EmailTemplate backgrounds
  ↓
Generate Configs
  ├─ New docker-compose.yaml
  ├─ New .env template
  └─ Migration summary
  ↓
Complete ✅
  └─ Review migration directory
```

## 🔍 Verification

After migration, run the verification script:

```bash
./verify-migration.sh /path/to/migration_data_YYYYMMDD_HHMMSS
```

This checks:
- ✅ Docker services running
- ✅ Database connectivity
- ✅ Table existence and counts
- ✅ S3 URLs updated correctly
- ✅ API health
- ✅ Frontend health
- ✅ Environment variables set

## 📝 Generated Files

After running the migration script, you'll find:

```
migration_data_YYYYMMDD_HHMMSS/
├── database/
│   ├── peptides_db_backup.sql         # Full database backup
│   ├── peptides_db_backup.sql.gz      # Compressed backup
│   ├── update_s3_urls.sql             # SQL to update URLs
│   └── backup.log                     # Backup process log
│
├── s3_manifest/
│   └── objects_list.txt               # List of migrated objects
│
├── configs/
│   ├── docker-compose.new-server.yaml # New docker-compose
│   └── .env.new-server.template       # New env template
│
└── MIGRATION_SUMMARY.md               # Complete summary
```

## ⚠️ Important Notes

1. **Backup First**: Always backup your current server before migration
2. **Test in Staging**: Test the migration process in staging first
3. **Keep Old Server Running**: Don't shut down old server until verified
4. **DNS Updates**: Plan DNS updates separately
5. **SSL Certificates**: Configure SSL on new server
6. **Secrets**: Update all secrets and API keys
7. **Monitor**: Watch logs closely for 24-48 hours after migration

## 🆘 Need Help?

| Issue | Solution |
|-------|----------|
| Script won't run | Check it's executable: `chmod +x migrate-to-new-server.sh` |
| Missing dependencies | Install: `sudo apt-get install docker.io docker-compose awscli postgresql-client jq` |
| AWS access denied | Verify AWS CLI profiles: `aws configure --profile <name>` |
| Database connection failed | Check host, port, credentials and network access |
| S3 bucket errors | Verify IAM permissions for both accounts |

## 📚 Additional Resources

- **Docker Compose Docs**: https://docs.docker.com/compose/
- **AWS S3 Docs**: https://docs.aws.amazon.com/s3/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **AWS CLI Docs**: https://docs.aws.amazon.com/cli/

## 🔐 Security Checklist

Before going live on new server:

- [ ] Change all default passwords
- [ ] Update all API keys and secrets
- [ ] Configure firewall rules
- [ ] Enable SSL/TLS
- [ ] Set up AWS CloudTrail
- [ ] Configure S3 bucket policies
- [ ] Review IAM permissions
- [ ] Enable MFA for AWS accounts
- [ ] Set up monitoring and alerts
- [ ] Configure automated backups

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-22  
**Maintainer**: DevOps Team
