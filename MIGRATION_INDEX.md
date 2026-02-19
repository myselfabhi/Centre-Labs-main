# Server Migration Documentation Index

Quick navigation guide to all migration-related documentation and scripts.

## 🚀 Getting Started (Pick Your Path)

### Path 1: First-Time User (Recommended)
1. Read: [MIGRATION_README.md](./MIGRATION_README.md) - Overview
2. Read: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Full guide
3. Run: `./pre-migration-checklist.sh` - Check readiness
4. Run: `./migrate-to-new-server.sh --dry-run` - Test
5. Run: `./migrate-to-new-server.sh` - Execute

### Path 2: Experienced DevOps
1. Skim: [MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md)
2. Run: `./pre-migration-checklist.sh`
3. Create: `migration-config.env` from [example](./migration-config.env.example)
4. Run: `./migrate-to-new-server.sh --config migration-config.env`
5. Run: `./verify-migration.sh`

### Path 3: Troubleshooting
1. Check: [MIGRATION_TROUBLESHOOTING.md](./MIGRATION_TROUBLESHOOTING.md)
2. Run: `./pre-migration-checklist.sh` - Diagnose issues
3. Check logs in migration directory

---

## 📚 Documentation Files

| File | Size | Purpose | Audience |
|------|------|---------|----------|
| **MIGRATION_README.md** | 8.2KB | Overview with diagrams | Everyone |
| **MIGRATION_GUIDE.md** | 21KB | Complete step-by-step guide | All users |
| **MIGRATION_QUICKSTART.md** | 4.5KB | Quick reference guide | Experienced |
| **MIGRATION_TROUBLESHOOTING.md** | 13KB | Problem-solving guide | As needed |
| **migration-config.env.example** | 3.1KB | Configuration template | All users |

**Total Documentation: 49KB+ across 5 files**

---

## 🛠️ Script Files

| Script | Size | Purpose | When to Use |
|--------|------|---------|-------------|
| **pre-migration-checklist.sh** | 8.2KB | Verify prerequisites | Before migration |
| **migrate-to-new-server.sh** | 31KB | Main migration automation | During migration |
| **verify-migration.sh** | 11KB | Post-migration checks | After migration |

**Total Scripts: 50KB+ across 3 files**

All scripts are executable and include `--help` option.

---

## 📖 Documentation Details

### MIGRATION_README.md (Start Here)
- File overview and purpose
- Quick start instructions
- Migration process diagram
- Generated file structure
- Verification checklist
- Security checklist

**Best for:** Getting oriented with the migration tools

### MIGRATION_GUIDE.md (Main Reference)
- Prerequisites and installation
- AWS account setup
- Step-by-step migration process
- Post-migration configuration
- Verification procedures
- Troubleshooting basics
- Rollback procedures
- Security hardening
- Best practices

**Best for:** First migration or detailed instructions needed

### MIGRATION_QUICKSTART.md (Quick Reference)
- Condensed 5-step process
- Essential commands only
- Common issues and fixes
- Quick verification commands

**Best for:** Experienced users or as a cheat sheet

### MIGRATION_TROUBLESHOOTING.md (Problem Solving)
- 50+ common issues and solutions
- Prerequisites troubleshooting
- AWS configuration fixes
- Database connection issues
- S3 migration problems
- Docker compose issues
- Application debugging
- Emergency rollback
- Debug information collection

**Best for:** When something goes wrong

### migration-config.env.example (Template)
- Configuration file template
- Commented explanations
- Usage examples
- Required values documented

**Best for:** Automated/scripted migrations

---

## 🎯 Script Details

### pre-migration-checklist.sh
**Purpose:** Verify you're ready to migrate

**Checks:**
- ✓ Required software installed
- ✓ AWS CLI configured
- ✓ Current server accessible
- ✓ Database connectivity
- ✓ S3 bucket access

**Usage:**
```bash
./pre-migration-checklist.sh
```

**When:** Before starting migration

---

### migrate-to-new-server.sh
**Purpose:** Automate the entire migration

**Features:**
- Database backup (PostgreSQL)
- S3 object migration
- Database URL updates
- Configuration generation
- Comprehensive logging

**Usage:**
```bash
# Interactive mode
./migrate-to-new-server.sh

# With config file
./migrate-to-new-server.sh --config migration-config.env

# Dry run (test mode)
./migrate-to-new-server.sh --dry-run

# Partial migration
./migrate-to-new-server.sh --skip-db
./migrate-to-new-server.sh --skip-s3
./migrate-to-new-server.sh --skip-url-update

# Get help
./migrate-to-new-server.sh --help
```

**When:** During the migration process

---

### verify-migration.sh
**Purpose:** Verify migration was successful

**Checks:**
- ✓ Docker services running
- ✓ Database connectivity
- ✓ S3 URLs updated
- ✓ API health
- ✓ Frontend health
- ✓ Environment variables

**Usage:**
```bash
./verify-migration.sh [migration-directory]

# Example:
./verify-migration.sh migration_data_20250122_143022
```

**When:** After migration completes

---

## 🎬 Quick Start Examples

### Example 1: Complete Migration with Interactive Prompts
```bash
# Step 1: Check readiness
./pre-migration-checklist.sh

# Step 2: Test with dry run
./migrate-to-new-server.sh --dry-run

# Step 3: Run migration
./migrate-to-new-server.sh

# Step 4: Verify
./verify-migration.sh migration_data_20250122_143022
```

### Example 2: Using Configuration File
```bash
# Step 1: Create config
cp migration-config.env.example migration-config.env
nano migration-config.env  # Edit values

# Step 2: Run migration
./migrate-to-new-server.sh --config migration-config.env

# Step 3: Verify
./verify-migration.sh migration_data_20250122_143022
```

### Example 3: Partial Migration (Already Have DB Backup)
```bash
# Skip database backup, only migrate S3 and update URLs
./migrate-to-new-server.sh --skip-db
```

---

## 🔍 What Gets Migrated

### 1. PostgreSQL Database
- Complete database dump
- All tables and data
- Schema and indexes
- Compressed backup created

### 2. S3 Bucket Objects
- Product images
- Variant images
- Email template backgrounds
- Media library files
- All other uploaded content

### 3. Database S3 URLs
Four tables updated:
- `product_images`
- `variant_images`
- `media_files`
- `email_templates` (array field)

### 4. Configuration Files
Generated for new server:
- docker-compose.new-server.yaml
- .env.new-server.template
- SQL update script
- Migration summary

---

## 📊 Generated Output

After migration, you'll find:

```
migration_data_YYYYMMDD_HHMMSS/
├── database/
│   ├── peptides_db_backup.sql         # Full backup
│   ├── peptides_db_backup.sql.gz      # Compressed
│   ├── update_s3_urls.sql             # URL updates
│   └── backup.log                     # Process log
├── s3_manifest/
│   └── objects_list.txt               # Object list
├── configs/
│   ├── docker-compose.new-server.yaml # New config
│   └── .env.new-server.template       # Env template
└── MIGRATION_SUMMARY.md               # Summary
```

---

## 🆘 Need Help?

### Quick Diagnosis
```bash
./pre-migration-checklist.sh
```

### Check Script Help
```bash
./migrate-to-new-server.sh --help
```

### Review Troubleshooting Guide
```bash
cat MIGRATION_TROUBLESHOOTING.md | less
```

### Common Issues
1. **Prerequisites:** Install missing tools
2. **AWS Config:** Run `aws configure`
3. **Database:** Check connection settings
4. **S3 Access:** Verify IAM permissions
5. **Docker:** Ensure services running

See [MIGRATION_TROUBLESHOOTING.md](./MIGRATION_TROUBLESHOOTING.md) for detailed solutions.

---

## 📝 Checklist

Before migration:
- [ ] Read documentation
- [ ] Run pre-migration checklist
- [ ] Configure AWS CLI for both accounts
- [ ] Test database connectivity
- [ ] Backup current server
- [ ] Schedule maintenance window
- [ ] Run dry-run migration

During migration:
- [ ] Run migration script
- [ ] Monitor progress
- [ ] Review generated files
- [ ] Check for errors in logs

After migration:
- [ ] Run verification script
- [ ] Test application functionality
- [ ] Update DNS records
- [ ] Configure SSL certificates
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Document any changes

---

## 🔗 External Resources

- **Docker Docs:** https://docs.docker.com/
- **AWS S3 Docs:** https://docs.aws.amazon.com/s3/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **AWS CLI Docs:** https://docs.aws.amazon.com/cli/

---

## 📧 Support

For issues:
1. Check [MIGRATION_TROUBLESHOOTING.md](./MIGRATION_TROUBLESHOOTING.md)
2. Review script logs in migration directory
3. Run verification script for diagnostics
4. Collect debug information

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-22  
**Total Files:** 8 (5 docs + 3 scripts)  
**Total Size:** 99KB+
