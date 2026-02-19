#!/bin/bash

# Development Database Setup Script
# This script runs PostgreSQL and Redis containers for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_CONTAINER="peptides_dev_db"
REDIS_CONTAINER="peptides_dev_redis"
POSTGRES_VOLUME="peptides_dev_postgres_data"
REDIS_VOLUME="peptides_dev_redis_data"

# Database configuration
POSTGRES_DB="peptides_db"
POSTGRES_USER="peptides_user"
POSTGRES_PASSWORD="dev_password_2024"
POSTGRES_PORT="5432"

# Redis configuration
REDIS_PORT="6379"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to create volumes if they don't exist
create_volumes() {
    print_status "Creating Docker volumes..."
    
    if ! docker volume inspect $POSTGRES_VOLUME > /dev/null 2>&1; then
        docker volume create $POSTGRES_VOLUME
        print_success "Created PostgreSQL volume: $POSTGRES_VOLUME"
    else
        print_status "PostgreSQL volume already exists: $POSTGRES_VOLUME"
    fi
    
    if ! docker volume inspect $REDIS_VOLUME > /dev/null 2>&1; then
        docker volume create $REDIS_VOLUME
        print_success "Created Redis volume: $REDIS_VOLUME"
    else
        print_status "Redis volume already exists: $REDIS_VOLUME"
    fi
}

# Function to stop and remove existing containers
cleanup_containers() {
    print_status "Cleaning up existing containers..."
    
    # Stop and remove PostgreSQL container
    if docker ps -q -f name=$POSTGRES_CONTAINER | grep -q .; then
        print_status "Stopping existing PostgreSQL container..."
        docker stop $POSTGRES_CONTAINER
        docker rm $POSTGRES_CONTAINER
        print_success "Removed PostgreSQL container"
    fi
    
    # Stop and remove Redis container
    if docker ps -q -f name=$REDIS_CONTAINER | grep -q .; then
        print_status "Stopping existing Redis container..."
        docker stop $REDIS_CONTAINER
        docker rm $REDIS_CONTAINER
        print_success "Removed Redis container"
    fi
}

# Function to start PostgreSQL
start_postgres() {
    print_status "Starting PostgreSQL container..."
    
    docker run -d \
        --name $POSTGRES_CONTAINER \
        --restart unless-stopped \
        -e POSTGRES_DB=$POSTGRES_DB \
        -e POSTGRES_USER=$POSTGRES_USER \
        -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
        -v $POSTGRES_VOLUME:/var/lib/postgresql/data \
        -p $POSTGRES_PORT:5432 \
        postgres:15-alpine
    
    print_success "PostgreSQL container started"
    print_status "Waiting for PostgreSQL to be ready..."
    
    # Wait for PostgreSQL to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec $POSTGRES_CONTAINER pg_isready -U $POSTGRES_USER -d $POSTGRES_DB > /dev/null 2>&1; then
            print_success "PostgreSQL is ready!"
            # Grant schema access so Prisma migrations work (PostgreSQL 15+)
            print_status "Granting schema permissions to $POSTGRES_USER..."
            docker exec $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -c "GRANT ALL ON SCHEMA public TO $POSTGRES_USER; GRANT CREATE ON SCHEMA public TO $POSTGRES_USER;" 2>/dev/null || true
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "PostgreSQL failed to start within $max_attempts attempts"
            exit 1
        fi
        
        print_status "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
}

# Function to start Redis
start_redis() {
    print_status "Starting Redis container..."
    
    docker run -d \
        --name $REDIS_CONTAINER \
        --restart unless-stopped \
        -v $REDIS_VOLUME:/data \
        -p $REDIS_PORT:6379 \
        redis:7-alpine redis-server --appendonly yes
    
    print_success "Redis container started"
    
    # Wait a moment for Redis to be ready
    sleep 2
    
    if docker exec $REDIS_CONTAINER redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is ready!"
    else
        print_warning "Redis might still be starting up..."
    fi
}

# Function to display connection information
show_connection_info() {
    echo
    echo "=========================================="
    echo "  🚀 Development Database Setup Complete!"
    echo "=========================================="
    echo
    echo "📊 PostgreSQL Database:"
    echo "   Host: localhost"
    echo "   Port: $POSTGRES_PORT"
    echo "   Database: $POSTGRES_DB"
    echo "   Username: $POSTGRES_USER"
    echo "   Password: $POSTGRES_PASSWORD"
    echo "   Connection URL: postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$POSTGRES_DB"
    echo
    echo "🔴 Redis Cache:"
    echo "   Host: localhost"
    echo "   Port: $REDIS_PORT"
    echo "   Connection URL: redis://localhost:$REDIS_PORT"
    echo
    echo "📁 Data Volumes:"
    echo "   PostgreSQL: $POSTGRES_VOLUME"
    echo "   Redis: $REDIS_VOLUME"
    echo
    echo "🔧 Useful Commands:"
    echo "   View logs: docker logs -f $POSTGRES_CONTAINER"
    echo "   Connect to DB: docker exec -it $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB"
    echo "   Connect to Redis: docker exec -it $REDIS_CONTAINER redis-cli"
    echo "   Stop services: ./dev-db.sh stop"
    echo "   Remove data: ./dev-db.sh reset"
    echo
}

# Function to stop services
stop_services() {
    print_status "Stopping development services..."
    
    if docker ps -q -f name=$POSTGRES_CONTAINER | grep -q .; then
        docker stop $POSTGRES_CONTAINER
        print_success "PostgreSQL stopped"
    fi
    
    if docker ps -q -f name=$REDIS_CONTAINER | grep -q .; then
        docker stop $REDIS_CONTAINER
        print_success "Redis stopped"
    fi
    
    print_success "All development services stopped"
}

# Function to reset (remove containers and volumes)
reset_data() {
    print_warning "This will remove all containers and data volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing containers and volumes..."
        
        # Stop and remove containers
        stop_services
        
        if docker ps -a -q -f name=$POSTGRES_CONTAINER | grep -q .; then
            docker rm $POSTGRES_CONTAINER
        fi
        
        if docker ps -a -q -f name=$REDIS_CONTAINER | grep -q .; then
            docker rm $REDIS_CONTAINER
        fi
        
        # Remove volumes
        if docker volume inspect $POSTGRES_VOLUME > /dev/null 2>&1; then
            docker volume rm $POSTGRES_VOLUME
            print_success "Removed PostgreSQL volume"
        fi
        
        if docker volume inspect $REDIS_VOLUME > /dev/null 2>&1; then
            docker volume rm $REDIS_VOLUME
            print_success "Removed Redis volume"
        fi
        
        print_success "All data has been reset"
    else
        print_status "Reset cancelled"
    fi
}

# Function to show status
show_status() {
    echo
    echo "=========================================="
    echo "  📊 Development Services Status"
    echo "=========================================="
    echo
    
    # Check PostgreSQL
    if docker ps -q -f name=$POSTGRES_CONTAINER | grep -q .; then
        echo -e "${GREEN}✅ PostgreSQL: Running${NC}"
        echo "   Container: $POSTGRES_CONTAINER"
        echo "   Port: $POSTGRES_PORT"
    else
        echo -e "${RED}❌ PostgreSQL: Not running${NC}"
    fi
    
    echo
    
    # Check Redis
    if docker ps -q -f name=$REDIS_CONTAINER | grep -q .; then
        echo -e "${GREEN}✅ Redis: Running${NC}"
        echo "   Container: $REDIS_CONTAINER"
        echo "   Port: $REDIS_PORT"
    else
        echo -e "${RED}❌ Redis: Not running${NC}"
    fi
    
    echo
    
    # Check volumes
    if docker volume inspect $POSTGRES_VOLUME > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL Volume: Exists${NC}"
    else
        echo -e "${RED}❌ PostgreSQL Volume: Missing${NC}"
    fi
    
    if docker volume inspect $REDIS_VOLUME > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis Volume: Exists${NC}"
    else
        echo -e "${RED}❌ Redis Volume: Missing${NC}"
    fi
    
    echo
}

# Function to seed database
seed_database() {
    print_status "Seeding database with default data..."
    
    # Check if API directory exists
    if [ ! -d "nodejs-api" ]; then
        print_error "nodejs-api directory not found. Please run this from the project root."
        exit 1
    fi
    
    # Check if database is running
    if ! docker ps -q -f name=$POSTGRES_CONTAINER | grep -q .; then
        print_error "PostgreSQL container is not running. Please start it first with: $0 start"
        exit 1
    fi
    
    # Check if database is ready
    if ! docker exec $POSTGRES_CONTAINER pg_isready -U $POSTGRES_USER -d $POSTGRES_DB > /dev/null 2>&1; then
        print_error "PostgreSQL is not ready. Please wait a moment and try again."
        exit 1
    fi
    
    # Run migrations first
    print_status "Running database migrations..."
    cd nodejs-api
    
    if ! npm run migrate:deploy; then
        print_error "Failed to run migrations"
        exit 1
    fi
    
    # Run seed script
    print_status "Running database seed script..."
    if ! npm run seed; then
        print_error "Failed to seed database"
        exit 1
    fi
    
    cd ..
    print_success "Database seeded successfully!"
    print_status "Default users created:"
    echo "   Admin: admin@example.com / SecurePass123!"
    echo "   Manager: manager@example.com / SecurePass123!"
    echo "   Staff: staff@example.com / SecurePass123!"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start   - Start PostgreSQL and Redis containers (default)"
    echo "  stop    - Stop all development services"
    echo "  restart - Restart all development services"
    echo "  status  - Show status of development services"
    echo "  seed    - Seed database with default data"
    echo "  reset   - Remove all containers and data volumes"
    echo "  help    - Show this help message"
    echo
    echo "Examples:"
    echo "  $0              # Start services"
    echo "  $0 start        # Start services"
    echo "  $0 stop         # Stop services"
    echo "  $0 status       # Check status"
    echo "  $0 seed         # Seed database"
    echo "  $0 reset        # Reset all data"
}

# Main script logic
main() {
    local command=${1:-start}
    
    case $command in
        start)
            check_docker
            create_volumes
            cleanup_containers
            start_postgres
            start_redis
            show_connection_info
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 2
            check_docker
            create_volumes
            cleanup_containers
            start_postgres
            start_redis
            show_connection_info
            ;;
        status)
            show_status
            ;;
        seed)
            seed_database
            ;;
        reset)
            reset_data
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 