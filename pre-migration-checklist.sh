#!/bin/bash

################################################################################
# Pre-Migration Checklist
# 
# This script helps you verify you're ready to run the migration by checking:
# - Required software is installed
# - AWS accounts are configured
# - Current server/database is accessible
# - You have necessary credentials and information
#
# Usage:
#   ./pre-migration-checklist.sh
################################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

log_check() {
    echo -n "  Checking $1... "
}

log_pass() {
    echo -e "${GREEN}✓ PASS${NC}"
    ((CHECKS_PASSED++))
}

log_fail() {
    echo -e "${RED}✗ FAIL${NC}"
    if [ -n "$1" ]; then
        echo -e "    ${YELLOW}→${NC} $1"
    fi
    ((CHECKS_FAILED++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_header() {
    echo ""
    echo "========================================================================"
    echo "$1"
    echo "========================================================================"
    echo ""
}

check_software() {
    print_header "1. Software Prerequisites"
    
    log_check "Docker"
    if command -v docker >/dev/null 2>&1; then
        log_pass
        docker --version | sed 's/^/    /'
    else
        log_fail "Install: sudo apt-get install docker.io"
    fi
    
    log_check "Docker Compose"
    if command -v docker-compose >/dev/null 2>&1; then
        log_pass
        docker-compose --version | sed 's/^/    /'
    else
        log_fail "Install: sudo apt-get install docker-compose"
    fi
    
    log_check "AWS CLI"
    if command -v aws >/dev/null 2>&1; then
        log_pass
        aws --version | sed 's/^/    /'
    else
        log_fail "Install: sudo apt-get install awscli"
    fi
    
    log_check "PostgreSQL Client"
    if command -v pg_dump >/dev/null 2>&1 && command -v psql >/dev/null 2>&1; then
        log_pass
        psql --version | sed 's/^/    /'
    else
        log_fail "Install: sudo apt-get install postgresql-client"
    fi
    
    log_check "jq (JSON processor)"
    if command -v jq >/dev/null 2>&1; then
        log_pass
        jq --version | sed 's/^/    /'
    else
        log_fail "Install: sudo apt-get install jq"
    fi
}

check_aws_config() {
    print_header "2. AWS Configuration"
    
    log_check "AWS credentials file"
    if [ -f "$HOME/.aws/credentials" ]; then
        log_pass
        echo -e "    ${BLUE}Profiles found:${NC}"
        grep '^\[' "$HOME/.aws/credentials" | sed 's/^/      /'
    else
        log_fail "Run: aws configure"
    fi
    
    log_check "AWS config file"
    if [ -f "$HOME/.aws/config" ]; then
        log_pass
    else
        log_fail "Run: aws configure"
    fi
    
    # Try to list available profiles
    if command -v aws >/dev/null 2>&1; then
        log_info "Test your AWS profiles:"
        echo "    aws s3 ls --profile <profile-name>"
    fi
}

check_current_server() {
    print_header "3. Current Server Access"
    
    log_check "Docker compose file exists"
    if [ -f "docker-compose.staging.yaml" ]; then
        log_pass
        echo -e "    ${BLUE}Found:${NC} docker-compose.staging.yaml"
    else
        log_fail "docker-compose.staging.yaml not found"
    fi
    
    log_check "Docker services running"
    if docker-compose -f docker-compose.staging.yaml ps >/dev/null 2>&1; then
        local running
        running=$(docker-compose -f docker-compose.staging.yaml ps --services --filter "status=running" | wc -l)
        if [ "$running" -gt 0 ]; then
            log_pass
            echo -e "    ${BLUE}Running services:${NC} $running"
        else
            log_fail "No services are running"
        fi
    else
        log_fail "Cannot query docker-compose services"
    fi
    
    log_check "Database connectivity"
    # Try to connect using default staging config
    if docker exec peptides_db psql -U peptides_user -d peptides_db -c "SELECT 1;" >/dev/null 2>&1; then
        log_pass
        local db_size
        db_size=$(docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT pg_size_pretty(pg_database_size('peptides_db'));" 2>/dev/null | tr -d ' ')
        echo -e "    ${BLUE}Database size:${NC} $db_size"
    else
        log_fail "Cannot connect to database"
        echo -e "    ${YELLOW}→${NC} Database may not be running or credentials may be different"
    fi
}

check_s3_access() {
    print_header "4. S3 Bucket Access"
    
    # Extract S3 bucket from docker-compose
    local current_bucket
    if [ -f "docker-compose.staging.yaml" ]; then
        current_bucket=$(grep "S3_BUCKET_NAME:" docker-compose.staging.yaml | head -1 | awk '{print $NF}')
        if [ -n "$current_bucket" ]; then
            log_info "Current S3 bucket: $current_bucket"
            
            log_check "Access to current S3 bucket"
            # Try default profile
            if aws s3 ls "s3://$current_bucket" --region ap-south-1 >/dev/null 2>&1; then
                log_pass
                local object_count
                object_count=$(aws s3 ls "s3://$current_bucket" --recursive --region ap-south-1 2>/dev/null | wc -l)
                echo -e "    ${BLUE}Objects in bucket:${NC} $object_count"
            else
                log_fail "Cannot access bucket (may need different AWS profile)"
            fi
        else
            log_fail "Cannot determine S3 bucket name from docker-compose.staging.yaml"
        fi
    else
        log_fail "docker-compose.staging.yaml not found"
    fi
}

check_information_ready() {
    print_header "5. Information Checklist"
    
    echo -e "${YELLOW}Please ensure you have the following information ready:${NC}"
    echo ""
    
    echo "  [ ] Old AWS Account Details:"
    echo "      - AWS profile name"
    echo "      - AWS region"
    echo "      - S3 bucket name"
    echo ""
    
    echo "  [ ] New AWS Account Details:"
    echo "      - AWS profile name (must be configured)"
    echo "      - AWS region for new resources"
    echo "      - S3 bucket name (can be created by script)"
    echo ""
    
    echo "  [ ] Database Credentials:"
    echo "      - Database host (default: localhost)"
    echo "      - Database port (default: 5444)"
    echo "      - Database name (default: peptides_db)"
    echo "      - Database user (default: peptides_user)"
    echo "      - Database password"
    echo ""
    
    echo "  [ ] Have you:"
    echo "      - Backed up current server?"
    echo "      - Tested in staging/dev first?"
    echo "      - Scheduled maintenance window?"
    echo "      - Notified users of potential downtime?"
    echo "      - Read the migration guide?"
    echo ""
}

show_summary() {
    print_header "Summary"
    
    echo -e "${GREEN}Passed:${NC} $CHECKS_PASSED checks"
    echo -e "${RED}Failed:${NC} $CHECKS_FAILED checks"
    echo ""
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All automated checks passed!${NC}"
        echo ""
        echo "You're ready to run the migration script:"
        echo -e "  ${BLUE}./migrate-to-new-server.sh${NC}"
        echo ""
        echo "Or test with a dry run first:"
        echo -e "  ${BLUE}./migrate-to-new-server.sh --dry-run${NC}"
        echo ""
    else
        echo -e "${RED}✗ Some checks failed.${NC}"
        echo ""
        echo "Please address the failed checks before running the migration."
        echo "See the output above for specific installation/configuration instructions."
        echo ""
    fi
    
    echo "For more information:"
    echo "  - Quick start: cat MIGRATION_QUICKSTART.md"
    echo "  - Full guide:  cat MIGRATION_GUIDE.md"
    echo "  - Script help: ./migrate-to-new-server.sh --help"
    echo ""
}

main() {
    echo "========================================================================"
    echo "                Pre-Migration Checklist"
    echo "========================================================================"
    echo ""
    echo "This script will verify you're ready to run the migration."
    echo ""
    
    check_software
    check_aws_config
    check_current_server
    check_s3_access
    check_information_ready
    show_summary
}

main
