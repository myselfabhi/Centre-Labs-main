#!/bin/bash

# Complete Development Setup Script
# This script sets up the entire development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "🚀 Setting up Peptides Website Development Environment"
echo "=================================================="
echo

# Check if dev-db.sh exists
if [ ! -f "dev-db.sh" ]; then
    print_error "dev-db.sh script not found. Please run this from the project root."
    exit 1
fi

# Check if nodejs-api directory exists
if [ ! -d "nodejs-api" ]; then
    print_error "nodejs-api directory not found. Please run this from the project root."
    exit 1
fi

# Check if nextjs-frontend directory exists
if [ ! -d "nextjs-frontend" ]; then
    print_error "nextjs-frontend directory not found. Please run this from the project root."
    exit 1
fi

# Step 1: Start database services
print_status "Step 1: Starting database services..."
./dev-db.sh start

# Wait a moment for services to be ready
sleep 3

# Step 2: Check if services are running
print_status "Step 2: Verifying services..."
./dev-db.sh status

# Step 3: Set up backend
print_status "Step 3: Setting up backend..."
cd nodejs-api

# Install dependencies
if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
else
    print_status "Backend dependencies already installed."
fi

# Create environment file
if [ ! -f ".env" ]; then
    print_status "Creating backend environment file..."
    cp ../dev.env.example .env
    print_success "Backend environment file created. Please update .env with your configuration."
else
    print_status "Backend environment file already exists."
fi

cd ..

# Step 4: Set up frontend
print_status "Step 4: Setting up frontend..."
cd nextjs-frontend

# Install dependencies
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
else
    print_status "Frontend dependencies already installed."
fi

# Create environment file
if [ ! -f ".env.local" ]; then
    print_status "Creating frontend environment file..."
    cp ../dev.env.example .env.local
    print_success "Frontend environment file created. Please update .env.local with your configuration."
else
    print_status "Frontend environment file already exists."
fi

cd ..

# Step 5: Seed database
print_status "Step 5: Seeding database with default data..."
./dev-db.sh seed

echo
echo "🎉 Development environment setup complete!"
echo "=========================================="
echo
echo "📋 Next Steps:"
echo
echo "1. Update environment files with your configuration:"
echo "   - Backend: nano nodejs-api/.env"
echo "   - Frontend: nano nextjs-frontend/.env.local"
echo
echo "2. Start the applications:"
echo "   Terminal 1: cd nodejs-api && npm run dev"
echo "   Terminal 2: cd nextjs-frontend && npm run dev"
echo
echo "3. Access your applications:"
echo "   - Frontend: http://localhost:3000"
echo "   - API: http://localhost:3001"
echo "   - Prisma Studio: http://localhost:5555"
echo
echo "4. Login with default users:"
echo "   - Admin: admin@example.com / SecurePass123!"
echo "   - Manager: manager@example.com / SecurePass123!"
echo "   - Staff: staff@example.com / SecurePass123!"
echo
echo "🔧 Useful Commands:"
echo "   - Check service status: ./dev-db.sh status"
echo "   - Stop services: ./dev-db.sh stop"
echo "   - Restart services: ./dev-db.sh restart"
echo "   - Reset data: ./dev-db.sh reset"
echo "   - Seed database: ./dev-db.sh seed"
echo
echo "📚 Documentation:"
echo "   - Development Guide: DEV_SETUP.md"
echo "   - Docker Setup: DOCKER_SETUP.md"
echo "   - Main README: README.md"
echo
echo "🚀 Happy coding!" 