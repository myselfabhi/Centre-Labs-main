# Local Development Setup

This guide helps you set up a local development environment with just the database and Redis services, allowing you to run your application code directly on your machine.

## Quick Start

### 1. Start Development Services

```bash
# Start PostgreSQL and Redis containers
./dev-db.sh

# Or explicitly start
./dev-db.sh start
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp dev.env.example .env

# Edit the .env file with your specific values
nano .env
```

### 3. Run Your Applications

```bash
# Terminal 1: Start the API backend
cd nodejs-api
npm install
npm run dev

# Terminal 2: Start the frontend
cd nextjs-frontend
npm install
npm run dev
```

## Development Script Commands

The `dev-db.sh` script provides several useful commands:

```bash
# Start services (default)
./dev-db.sh start

# Check status
./dev-db.sh status

# Stop services
./dev-db.sh stop

# Restart services
./dev-db.sh restart

# Seed database with default data
./dev-db.sh seed

# Reset all data (⚠️ removes all data)
./dev-db.sh reset

# Show help
./dev-db.sh help
```

## Service Information

### PostgreSQL Database
- **Host**: localhost
- **Port**: 5432
- **Database**: peptides_db
- **Username**: peptides_user
- **Password**: dev_password_2024
- **Connection URL**: `postgresql://peptides_user:dev_password_2024@localhost:5432/peptides_db`

### Redis Cache
- **Host**: localhost
- **Port**: 6379
- **Connection URL**: `redis://localhost:6379`

## Database Management

### Run Prisma Migrations
```bash
cd nodejs-api
npx prisma migrate dev
npx prisma generate
```

### Seed Database
```bash
# Using the development script
./dev-db.sh seed

# Or manually
cd nodejs-api
npm run seed
```

### Access Database
```bash
# Connect to PostgreSQL
docker exec -it peptides_dev_db psql -U peptides_user -d peptides_db

# Or use psql locally if installed
psql postgresql://peptides_user:dev_password_2024@localhost:5432/peptides_db
```

### Access Redis
```bash
# Connect to Redis CLI
docker exec -it peptides_dev_redis redis-cli

# Or use redis-cli locally if installed
redis-cli -h localhost -p 6379
```

### Prisma Studio
```bash
cd nodejs-api
npx prisma studio
```

## Development Workflow

### 1. Start Development Environment
```bash
# Start database services
./dev-db.sh start

# Verify services are running
./dev-db.sh status
```

### 2. Set Up Application
```bash
# Backend setup
cd nodejs-api
npm install
cp ../dev.env.example .env
# Edit .env with your values

# Frontend setup
cd ../nextjs-frontend
npm install
cp ../dev.env.example .env
# Edit .env with your values
```

### 3. Seed Database (Optional)
```bash
# Seed database with default users and sample data
./dev-db.sh seed
```

### 4. Run Applications
```bash
# Terminal 1: API
cd nodejs-api
npm run dev

# Terminal 2: Frontend
cd nextjs-frontend
npm run dev
```

### 5. Access Applications
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Prisma Studio**: http://localhost:5555

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :5432
   lsof -i :6379
   
   # Stop the dev-db services first
   ./dev-db.sh stop
   ```

2. **Database Connection Issues**
   ```bash
   # Check if database is running
   ./dev-db.sh status
   
   # Restart services
   ./dev-db.sh restart
   ```

3. **Permission Issues**
   ```bash
   # Make script executable
   chmod +x dev-db.sh
   ```

4. **Data Persistence Issues**
   ```bash
   # Check volumes
   docker volume ls | grep peptides_dev
   
   # Reset if needed (⚠️ removes all data)
   ./dev-db.sh reset
   ```

### Useful Commands

```bash
# View container logs
docker logs -f peptides_dev_db
docker logs -f peptides_dev_redis

# Check container status
docker ps -a | grep peptides_dev

# View volume information
docker volume inspect peptides_dev_postgres_data
docker volume inspect peptides_dev_redis_data

# Execute commands in containers
docker exec -it peptides_dev_db bash
docker exec -it peptides_dev_redis sh
```

## Environment Variables

The `dev.env.example` file contains all necessary environment variables for local development:

- **Database**: Configured to connect to the Docker PostgreSQL container
- **Redis**: Configured to connect to the Docker Redis container
- **JWT**: Development secret (change for production)
- **Stripe**: Test keys for development
- **Email**: Optional for development
- **CORS**: Configured for localhost development

## Default Users

After seeding the database, you can login with these default users:

- **Admin**: admin@example.com / SecurePass123!
- **Manager**: manager@example.com / SecurePass123!
- **Staff**: staff@example.com / SecurePass123!

Each user has different permission levels:
- **Admin**: Full access to all modules (CREATE, READ, UPDATE, DELETE)
- **Manager**: Access to customers, products, orders, payments, analytics (CREATE, READ, UPDATE)
- **Staff**: Limited access to customers, products, orders (READ, UPDATE)

## Data Persistence

Your data is stored in Docker volumes:
- **PostgreSQL**: `peptides_dev_postgres_data`
- **Redis**: `peptides_dev_redis_data`

Data persists between container restarts. To completely reset:
```bash
./dev-db.sh reset
```

## Performance Tips

1. **Use Docker volumes** for data persistence
2. **Run services in background** with `./dev-db.sh start`
3. **Use Prisma Studio** for database management
4. **Monitor logs** for debugging
5. **Restart services** when making schema changes

## Security Notes

- Development environment uses simple passwords
- JWT secrets are development-only
- CORS is configured for localhost
- **Never use development settings in production**

## Next Steps

1. Set up your IDE/editor
2. Configure debugging
3. Set up testing environment
4. Configure CI/CD pipeline
5. Prepare for production deployment

For production deployment, see the main `README.md` and `DOCKER_SETUP.md` files. 