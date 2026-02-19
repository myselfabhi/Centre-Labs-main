# Security Issue: AWS Credentials in Git History

## What Happened

GitHub blocked your push because **real AWS credentials** were detected in these files:
- `db-backup-restore-generic.sh`
- `db-backup-restore.sh`
- `restore-to-dev.sh`
- `docker-compose.prod.yaml`
- `docker-compose.staging.yaml`

## ⚠️ Security Risk

**These credentials are now exposed** in your Git commit history. Even if you remove them from files, they're still in the commit. Anyone with access to your repo can see them.

### Immediate Actions Required

1. **Rotate/revoke the exposed AWS credentials** in AWS IAM console:
   - Access Key: `AKIAQYR77SKDMLCYNRVC` (production)
   - Access Key: `AKIAWNIQE7MBBDZERM6O` (staging)
   - Create new keys and update your deployment configs

2. **Remove secrets from Git history** (see below)

## What Was Fixed

✅ Replaced hardcoded credentials with environment variable placeholders:
- `AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-YOUR_AWS_ACCESS_KEY_ID}"`
- `AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-YOUR_AWS_SECRET_ACCESS_KEY}"`

Now these scripts will:
- Use environment variables if set (`export AWS_ACCESS_KEY_ID=...`)
- Fall back to placeholder text if not set (safe for Git)

## Fixing Git History

Since you just initialized the repo, the easiest fix is to **amend the commit**:

```bash
# Stage the fixed files
git add db-backup-restore-generic.sh db-backup-restore.sh restore-to-dev.sh docker-compose.prod.yaml docker-compose.staging.yaml

# Amend the last commit (replaces it with the fixed version)
git commit --amend --no-edit

# Force push (since you're rewriting history)
git push -f origin main
```

**Note:** If you've already pushed and others have cloned, coordinate with your team before force pushing.

## Best Practices Going Forward

1. **Never commit secrets** - use environment variables or `.env` files (already in `.gitignore`)
2. **Use `.env.example`** files with placeholder values
3. **Use secret management** (AWS Secrets Manager, GitHub Secrets, etc.) for production
4. **Review files before committing** - check for `AKIA`, `sk_`, `pk_`, passwords, tokens

## Files That Should Use Environment Variables

- `docker-compose.prod.yaml` - use `.env` file or GitHub Secrets
- `docker-compose.staging.yaml` - use `.env` file or CI/CD secrets
- Backup scripts - read from environment or `.env` file
