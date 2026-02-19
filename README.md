# Peptides Website Docker Setup

This repository contains a full-stack peptides e-commerce website with a Node.js API backend and Next.js frontend.

## Architecture

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express and Prisma ORM
- **Database**: PostgreSQL
- **Caching**: Redis (optional)
- **Reverse Proxy**: Nginx (optional)

## 🚀 Server Migration

If you need to migrate your services to a new AWS account or server, we provide an automated migration script:

- **Quick Start**: See [MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md) for a condensed guide
- **Full Guide**: See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for comprehensive instructions
- **Script**: `migrate-to-new-server.sh` - Automates database backup, S3 migration, and configuration

**Quick Migration:**
```bash
chmod +x migrate-to-new-server.sh
./migrate-to-new-server.sh
```

The script handles:
- ✅ PostgreSQL database backup and restore
- ✅ S3 bucket object migration
- ✅ Database URL updates (pointing to new S3 bucket)
- ✅ Docker Compose configuration generation
- ✅ Environment variable templates

## Prerequisites

- Docker and Docker Compose installed
- Git

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd peptides_website
   ```

2. **Configure environment variables**
   
   Update the environment variables in `docker-compose.yaml`:
   ```yaml
   # In the 'api' service section
   environment:
     JWT_SECRET: your_jwt_secret_key_here_change_in_production
     STRIPE_SECRET_KEY: your_stripe_secret_key_here
     STRIPE_WEBHOOK_SECRET: your_stripe_webhook_secret_here
     EMAIL_USER: your_email@gmail.com
     EMAIL_PASSWORD: your_app_password_here
   ```

3. **Build and run the application**
   ```bash
   # Build and start all services
   docker-compose up --build

   # Or run in detached mode
   docker-compose up -d --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - Database: localhost:5432
   - Redis: localhost:6379
   - Nginx (if enabled): http://localhost:80

## Services

### Database (PostgreSQL)
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Credentials**: 
  - Database: `peptides_db`
  - User: `peptides_user`
  - Password: `peptides_password_2024`

### API Backend
- **Framework**: Express.js with Prisma ORM
- **Port**: 3001
- **Features**:
  - JWT authentication
  - Stripe payment integration
  - Email notifications
  - Database migrations
  - CORS configured

### Frontend
- **Framework**: Next.js with TypeScript
- **Port**: 3000
- **Features**:
  - Modern UI with Tailwind CSS
  - Responsive design
  - Theme support
  - Form validation

### Redis (Optional)
- **Image**: redis:7-alpine
- **Port**: 6379
- **Purpose**: Session management and caching

### Nginx (Optional)
- **Image**: nginx:alpine
- **Port**: 80, 443
- **Purpose**: Reverse proxy and load balancing

## Development Commands

```bash
# Start services
docker-compose up

# Start specific service
docker-compose up database api

# View logs
docker-compose logs -f api
docker-compose logs -f frontend

# Stop services
docker-compose down

# Rebuild services
docker-compose build
docker-compose up --build

# Remove all data (including volumes)
docker-compose down -v
```

## Database Management

```bash
# Run Prisma migrations
docker-compose exec api npx prisma migrate deploy

# Generate Prisma client
docker-compose exec api npx prisma generate

# Access database
docker-compose exec database psql -U peptides_user -d peptides_db

# View Prisma Studio
docker-compose exec api npx prisma studio
```

## Production Deployment

1. **Update environment variables** with production values
2. **Enable SSL** by configuring certificates in `./ssl/` directory
3. **Configure domain** in `nginx.conf`
4. **Set strong passwords** for database and JWT secrets
5. **Enable monitoring** and logging

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change port mappings in `docker-compose.yaml`
2. **Database connection**: Ensure database is healthy before API starts
3. **Build failures**: Check Docker logs and ensure all dependencies are correct
4. **Permission issues**: Verify file permissions and user ownership

### Useful Commands

```bash
# Check service status
docker-compose ps

# Restart a service
docker-compose restart api

# Execute command in container
docker-compose exec api npm run migrate

# View container logs
docker-compose logs -f --tail=100 api
```

## Security Considerations

- Change default passwords in production
- Use environment variables for sensitive data
- Enable SSL/TLS certificates
- Configure proper firewall rules
- Regular security updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker Compose
5. Submit a pull request

## License

This project is licensed under the MIT License. 