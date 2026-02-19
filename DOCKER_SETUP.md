# Docker Setup Guide for Peptides Website

This guide helps you set up the complete Docker environment for the Peptides E-commerce website.

## Environment Variables Configuration

Before running the Docker setup, you need to configure the environment variables in the `docker-compose.yaml` file.

### Required Environment Variables

#### Database Configuration
- `POSTGRES_DB`: Database name (default: `peptides_db`)
- `POSTGRES_USER`: Database username (default: `peptides_user`)
- `POSTGRES_PASSWORD`: Database password (default: `peptides_password_2024`)
- `DATABASE_URL`: Full database connection string

#### JWT Security
- `JWT_SECRET`: Secret key for JWT tokens (⚠️ **Change in production**)

#### Stripe Payment Integration
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret

#### Email Configuration
- `EMAIL_HOST`: SMTP server (default: `smtp.gmail.com`)
- `EMAIL_PORT`: SMTP port (default: `587`)
- `EMAIL_USER`: Your email address
- `EMAIL_PASSWORD`: Your email password or app password

#### Frontend Configuration
- `NEXT_PUBLIC_API_URL`: API endpoint URL (default: `http://localhost:3001`)

## Quick Start Commands

### 1. Start All Services
```bash
# Start in foreground (see logs)
docker-compose up --build

# Start in background
docker-compose up -d --build
```

### 2. Start Individual Services
```bash
# Start only database
docker-compose up database

# Start database and API
docker-compose up database api

# Start all except nginx
docker-compose up database api frontend redis
```

### 3. Check Service Status
```bash
# View running services
docker-compose ps

# View logs
docker-compose logs -f api
docker-compose logs -f frontend
```

### 4. Database Operations
```bash
# Run migrations
docker-compose exec api npx prisma migrate deploy

# Generate Prisma client
docker-compose exec api npx prisma generate

# Access database directly
docker-compose exec database psql -U peptides_user -d peptides_db

# Open Prisma Studio
docker-compose exec api npx prisma studio
```

### 5. Stop Services
```bash
# Stop services
docker-compose down

# Stop and remove volumes (⚠️ This will delete all data)
docker-compose down -v
```

## Service Access Points

Once running, you can access:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Database**: localhost:5432
- **Redis**: localhost:6379
- **Nginx (if enabled)**: http://localhost:80

## Development vs Production

### Development Mode
```bash
# Use development command in docker-compose.yaml
command: npm run dev  # For API
command: npm run dev  # For Frontend
```

### Production Mode
```bash
# Use production commands (already configured)
command: npm start  # For API
command: npm start  # For Frontend
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3000
   lsof -i :3001
   lsof -i :5432
   
   # Kill process or change port in docker-compose.yaml
   ```

2. **Database Connection Issues**
   ```bash
   # Check if database is running
   docker-compose ps database
   
   # Check database logs
   docker-compose logs database
   
   # Restart database
   docker-compose restart database
   ```

3. **Build Failures**
   ```bash
   # Clean build
   docker-compose build --no-cache
   
   # Remove all containers and rebuild
   docker-compose down
   docker system prune -a
   docker-compose up --build
   ```

4. **Permission Issues**
   ```bash
   # Fix permission issues (Linux/Mac)
   sudo chown -R $USER:$USER .
   ```

### Useful Commands

```bash
# View resource usage
docker stats

# Clean up unused containers/images
docker system prune

# View detailed container info
docker inspect <container_name>

# Execute commands in running container
docker-compose exec api bash
docker-compose exec frontend sh

# Follow logs for specific service
docker-compose logs -f --tail=50 api
```

## Security Checklist for Production

- [ ] Change default database password
- [ ] Use strong JWT secret
- [ ] Configure proper CORS origins
- [ ] Set up SSL certificates
- [ ] Use environment variables for secrets
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Monitor logs and access

## Performance Optimization

### Database
- Configure PostgreSQL settings for your hardware
- Set up connection pooling
- Regular database maintenance

### API
- Enable caching with Redis
- Configure rate limiting
- Optimize queries

### Frontend
- Enable Next.js static optimization
- Configure CDN for assets
- Optimize images

## Monitoring and Logging

### Log Locations
- API logs: `docker-compose logs api`
- Frontend logs: `docker-compose logs frontend`
- Database logs: `docker-compose logs database`

### Health Checks
- API health: http://localhost:3001/health
- Frontend health: http://localhost:3000
- Database health: Built-in health check

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker-compose exec database pg_dump -U peptides_user peptides_db > backup.sql

# Restore backup
docker-compose exec database psql -U peptides_user -d peptides_db < backup.sql
```

### Volume Backup
```bash
# Backup PostgreSQL data
docker run --rm -v peptides_website_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker Compose
5. Submit a pull request

For more detailed information, see the main README.md file. 