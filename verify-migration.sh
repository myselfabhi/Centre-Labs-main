#!/bin/bash

################################################################################
# Post-Migration Verification Script
# 
# This script helps verify that the migration was successful by checking:
# - Database connectivity and data integrity
# - S3 bucket accessibility and object counts
# - Application health
# - Image URL updates
#
# Usage:
#   ./verify-migration.sh [migration-directory]
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verification results
PASSED=0
FAILED=0
WARNINGS=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[! WARN]${NC} $1"
    ((WARNINGS++))
}

print_header() {
    echo ""
    echo "========================================================================"
    echo "$1"
    echo "========================================================================"
    echo ""
}

show_summary() {
    print_header "Verification Summary"
    echo -e "${GREEN}Passed:   $PASSED${NC}"
    echo -e "${RED}Failed:   $FAILED${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        log_success "All critical checks passed!"
        if [ $WARNINGS -gt 0 ]; then
            log_warning "Please review warnings above"
        fi
        return 0
    else
        log_error "Some checks failed. Please review the issues above."
        return 1
    fi
}

check_docker() {
    print_header "Checking Docker Services"
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "docker-compose not found"
        return 1
    fi
    
    log_success "docker-compose is installed"
    
    # Check if services are running
    local running_services
    running_services=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
    
    if [ "$running_services" -gt 0 ]; then
        log_success "Docker services are running ($running_services services)"
    else
        log_error "No Docker services are running"
        return 1
    fi
    
    # Check specific services
    for service in database api frontend redis; do
        if docker-compose ps "$service" 2>/dev/null | grep -q "Up"; then
            log_success "Service '$service' is running"
        else
            log_error "Service '$service' is not running"
        fi
    done
}

check_database() {
    print_header "Checking Database"
    
    # Check database connectivity
    if docker exec peptides_db psql -U peptides_user -d peptides_db -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "Database is accessible"
    else
        log_error "Cannot connect to database"
        return 1
    fi
    
    # Check table counts
    local table_count
    table_count=$(docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$table_count" -gt 0 ]; then
        log_success "Database has $table_count tables"
    else
        log_error "No tables found in database"
        return 1
    fi
    
    # Check specific tables exist
    for table in products customers orders product_images variant_images media_files; do
        if docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null | grep -q "t"; then
            log_success "Table '$table' exists"
        else
            log_error "Table '$table' not found"
        fi
    done
    
    # Check record counts
    local product_count
    product_count=$(docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null | tr -d ' ')
    log_info "Products in database: $product_count"
    
    local customer_count
    customer_count=$(docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT COUNT(*) FROM customers;" 2>/dev/null | tr -d ' ')
    log_info "Customers in database: $customer_count"
    
    local order_count
    order_count=$(docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT COUNT(*) FROM orders;" 2>/dev/null | tr -d ' ')
    log_info "Orders in database: $order_count"
}

check_s3_urls() {
    print_header "Checking S3 URL Updates"
    
    # Check ProductImage URLs
    local product_image_count
    product_image_count=$(docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT COUNT(*) FROM product_images;" 2>/dev/null | tr -d ' ')
    
    if [ "$product_image_count" -gt 0 ]; then
        log_info "Found $product_image_count product images"
        
        # Show sample URLs
        log_info "Sample product image URLs:"
        docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT url FROM product_images LIMIT 3;" 2>/dev/null | sed 's/^/ /'
        
        # Check if URLs still point to old bucket (if migration directory provided)
        if [ -n "$MIGRATION_DIR" ] && [ -f "$MIGRATION_DIR/MIGRATION_SUMMARY.md" ]; then
            local old_bucket
            old_bucket=$(grep "S3 Bucket:" "$MIGRATION_DIR/MIGRATION_SUMMARY.md" | head -1 | awk '{print $NF}')
            
            if [ -n "$old_bucket" ]; then
                local old_url_count
                old_url_count=$(docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT COUNT(*) FROM product_images WHERE url LIKE '%$old_bucket%';" 2>/dev/null | tr -d ' ')
                
                if [ "$old_url_count" -eq 0 ]; then
                    log_success "No product images pointing to old bucket"
                else
                    log_error "$old_url_count product images still pointing to old bucket"
                fi
            fi
        fi
    else
        log_warning "No product images found in database"
    fi
    
    # Check VariantImage URLs
    local variant_image_count
    variant_image_count=$(docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT COUNT(*) FROM variant_images;" 2>/dev/null | tr -d ' ')
    
    if [ "$variant_image_count" -gt 0 ]; then
        log_info "Found $variant_image_count variant images"
    else
        log_warning "No variant images found in database"
    fi
    
    # Check MediaFile URLs
    local media_file_count
    media_file_count=$(docker exec peptides_db psql -U peptides_user -d peptides_db -t -c "SELECT COUNT(*) FROM media_files;" 2>/dev/null | tr -d ' ')
    
    if [ "$media_file_count" -gt 0 ]; then
        log_info "Found $media_file_count media files"
    else
        log_warning "No media files found in database"
    fi
}

check_api_health() {
    print_header "Checking API Health"
    
    # Check if API is responding
    local api_port
    api_port=$(docker-compose port api 3001 2>/dev/null | cut -d: -f2)
    
    if [ -z "$api_port" ]; then
        api_port="3666"  # Default from staging config
    fi
    
    log_info "Checking API on port $api_port..."
    
    # Try health endpoint
    if curl -s -f "http://localhost:$api_port/api/health" >/dev/null 2>&1; then
        log_success "API health endpoint is responding"
    else
        log_warning "API health endpoint not accessible (may not be implemented)"
    fi
    
    # Check API logs for errors
    local error_count
    error_count=$(docker-compose logs --tail=100 api 2>/dev/null | grep -i "error" | wc -l)
    
    if [ "$error_count" -eq 0 ]; then
        log_success "No errors in recent API logs"
    else
        log_warning "Found $error_count error messages in recent API logs"
    fi
}

check_frontend_health() {
    print_header "Checking Frontend Health"
    
    # Check if frontend is responding
    local frontend_port
    frontend_port=$(docker-compose port frontend 3000 2>/dev/null | cut -d: -f2)
    
    if [ -z "$frontend_port" ]; then
        frontend_port="3667"  # Default from staging config
    fi
    
    log_info "Checking frontend on port $frontend_port..."
    
    if curl -s -f "http://localhost:$frontend_port" >/dev/null 2>&1; then
        log_success "Frontend is responding"
    else
        log_error "Frontend is not accessible"
    fi
    
    # Check frontend logs for errors
    local error_count
    error_count=$(docker-compose logs --tail=100 frontend 2>/dev/null | grep -i "error" | wc -l)
    
    if [ "$error_count" -eq 0 ]; then
        log_success "No errors in recent frontend logs"
    else
        log_warning "Found $error_count error messages in recent frontend logs"
    fi
}

check_s3_access() {
    print_header "Checking S3 Access"
    
    # Try to get S3 configuration from environment
    local s3_bucket
    local aws_region
    
    s3_bucket=$(docker-compose exec -T api printenv S3_BUCKET_NAME 2>/dev/null || echo "")
    aws_region=$(docker-compose exec -T api printenv AWS_REGION 2>/dev/null || echo "")
    
    if [ -n "$s3_bucket" ]; then
        log_info "S3 Bucket: $s3_bucket"
        log_info "AWS Region: $aws_region"
        
        # Try to check if bucket is accessible (requires AWS CLI in container or host)
        if command -v aws >/dev/null 2>&1; then
            if aws s3 ls "s3://$s3_bucket" >/dev/null 2>&1; then
                log_success "S3 bucket is accessible"
            else
                log_warning "Cannot verify S3 bucket access (may need AWS credentials)"
            fi
        else
            log_info "AWS CLI not available, skipping bucket accessibility check"
        fi
    else
        log_warning "Could not determine S3 bucket configuration"
    fi
}

check_environment_variables() {
    print_header "Checking Environment Variables"
    
    # Check critical environment variables
    local critical_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_KEY_ID"
        "S3_BUCKET_NAME"
        "AWS_REGION"
    )
    
    for var in "${critical_vars[@]}"; do
        local value
        value=$(docker-compose exec -T api printenv "$var" 2>/dev/null || echo "")
        
        if [ -n "$value" ]; then
            if [ "$var" = "JWT_SECRET" ] || [ "$var" = "AWS_SECRET_KEY_ID" ]; then
                log_success "$var is set (value hidden)"
            else
                log_success "$var is set"
            fi
        else
            log_error "$var is not set"
        fi
    done
}

# Main execution
main() {
    print_header "Post-Migration Verification"
    
    # Check if migration directory was provided
    if [ -n "$1" ]; then
        MIGRATION_DIR="$1"
        log_info "Using migration directory: $MIGRATION_DIR"
    fi
    
    # Run all checks
    check_docker || true
    check_database || true
    check_s3_urls || true
    check_api_health || true
    check_frontend_health || true
    check_s3_access || true
    check_environment_variables || true
    
    # Show summary
    show_summary
}

# Run main with arguments
main "$@"
