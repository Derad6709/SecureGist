# 🚀 Deployment Guide

This guide covers various deployment options for SecureGist, from local development to production Kubernetes deployments.

## Table of Contents

- [Quick Start (Docker Compose)](#quick-start-docker-compose)
- [Production Deployment (Kubernetes + Helm)](#production-deployment-kubernetes--helm)
- [Manual Deployment](#manual-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [S3 Storage Configuration](#s3-storage-configuration)
- [HTTPS/TLS Configuration](#httpstls-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Scaling](#scaling)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Quick Start (Docker Compose)

The fastest way to get SecureGist running locally or for small deployments.

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Derad6709/SecureGist.git
   cd SecureGist
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

   This starts:
   - PostgreSQL database
   - MinIO (S3-compatible storage)
   - Backend API (FastAPI)
   - Frontend (React)
   - Traefik reverse proxy

3. **Verify services are running**:
   ```bash
   docker-compose ps
   ```

4. **Access the application**:
   - **Frontend**: http://localhost
   - **Backend API**: http://localhost/api
   - **API Docs**: http://localhost/api/docs
   - **Traefik Dashboard**: http://localhost:8080

5. **View logs**:
   ```bash
   docker-compose logs -f
   ```

6. **Stop services**:
   ```bash
   docker-compose down
   ```

7. **Stop and remove data**:
   ```bash
   docker-compose down -v
   ```

### Docker Compose Architecture

```
                    ┌──────────┐
                    │ Traefik  │
                    │  :80     │
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │Frontend │    │Backend  │    │ MinIO   │
    │ React   │    │ FastAPI │    │ (S3)    │
    └─────────┘    └────┬────┘    └─────────┘
                        │
                   ┌────▼────┐
                   │PostgreSQL
                   │   DB    │
                   └─────────┘
```

## Production Deployment (Kubernetes + Helm)

For production environments requiring high availability and scalability.

### Prerequisites

- Kubernetes 1.25+
- Helm 3.10+
- kubectl configured with cluster access
- Persistent volume provisioner
- (Optional) Ingress controller if not using Traefik

### Install with Helm

#### 1. Add Helm Dependencies

```bash
cd helm/securegist
helm dependency update
```

#### 2. Review Configuration

Three value files are provided:

- **`values.yaml`**: Base configuration
- **`values-dev.yaml`**: Development overrides
- **`values-prod.yaml`**: Production overrides

#### 3. Development Deployment

```bash
helm install securegist ./helm/securegist \
  -f ./helm/securegist/values.yaml \
  -f ./helm/securegist/values-dev.yaml \
  --create-namespace \
  --namespace securegist-dev
```

#### 4. Production Deployment

```bash
helm install securegist ./helm/securegist \
  -f ./helm/securegist/values.yaml \
  -f ./helm/securegist/values-prod.yaml \
  --create-namespace \
  --namespace securegist-prod
```

#### 5. Verify Deployment

```bash
kubectl get pods -n securegist-prod
kubectl get services -n securegist-prod
kubectl get ingress -n securegist-prod
```

#### 6. Upgrade Deployment

```bash
helm upgrade securegist ./helm/securegist \
  -f ./helm/securegist/values-prod.yaml \
  --namespace securegist-prod
```

#### 7. Uninstall

```bash
helm uninstall securegist --namespace securegist-prod
```

### Helm Chart Structure

```
helm/securegist/
├── Chart.yaml              # Chart metadata
├── values.yaml             # Default values
├── values-dev.yaml         # Dev environment overrides
├── values-prod.yaml        # Prod environment overrides
└── templates/
    ├── backend-deployment.yaml
    ├── backend-service.yaml
    ├── frontend-deployment.yaml
    ├── frontend-service.yaml
    └── ingress.yaml
```

### Key Helm Values

```yaml
# Backend configuration
backend:
  replicaCount: 3
  image:
    repository: your-registry/securegist-backend
    tag: "1.0.0"
  database:
    url: "postgresql+asyncpg://user:pass@host:5432/db"
  s3:
    endpoint: "http://minio:9000"
    bucket: "securegist"

# Frontend configuration
frontend:
  replicaCount: 2
  image:
    repository: your-registry/securegist-frontend
    tag: "1.0.0"

# PostgreSQL (Bitnami chart)
postgresql:
  enabled: true
  auth:
    database: securegist
    username: securegist
    password: changeme

# MinIO
minio:
  enabled: true
  rootUser: admin
  rootPassword: changeme123

# Traefik
traefik:
  enabled: true
  ports:
    web:
      exposedPort: 80
```

## Manual Deployment

For custom environments or when Docker/K8s aren't available.

### Backend Setup

1. **Install Python 3.14+**
2. **Install dependencies**:
   ```bash
   cd backend
   pip install uv
   uv sync
   ```
3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```
4. **Run migrations** (tables auto-created on startup)
5. **Start server**:
   ```bash
   uv run uvicorn src.main:app --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Install Node.js 18+**
2. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```
3. **Configure API URL**:
   ```bash
   cp .env.example .env
   # Set VITE_API_URL
   ```
4. **Build for production**:
   ```bash
   npm run build
   ```
5. **Serve with nginx**:
   ```nginx
   server {
       listen 80;
       server_name securegist.example.com;
       
       root /path/to/frontend/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## Environment Configuration

### Backend Environment Variables

Create `/backend/.env`:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/securegist

# S3 Storage
S3_ENDPOINT_URL=http://localhost:9000
S3_PUBLIC_ENDPOINT_URL=http://localhost:9000  # Public-facing URL
S3_BUCKET_NAME=securegist
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1

# Application
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend Environment Variables

Create `/frontend/.env`:

```bash
# API endpoint (relative or absolute)
VITE_API_URL=/api
# For development: VITE_API_URL=http://localhost:8000
```

## Database Setup

### PostgreSQL Installation

#### Using Docker:
```bash
docker run -d \
  --name securegist-db \
  -e POSTGRES_DB=securegist \
  -e POSTGRES_USER=securegist \
  -e POSTGRES_PASSWORD=changeme \
  -p 5432:5432 \
  postgres:16
```

#### Using package manager (Ubuntu):
```bash
sudo apt install postgresql-16
sudo -u postgres psql -c "CREATE DATABASE securegist;"
sudo -u postgres psql -c "CREATE USER securegist WITH PASSWORD 'changeme';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE securegist TO securegist;"
```

### Database Schema

Tables are automatically created by SQLAlchemy on startup:

- **gists**: Metadata (id, created_at, expires_at, max_reads, read_count)
- **files**: Individual files within gists (name, language, s3_key)

### Database Backups

```bash
# Backup
pg_dump -U securegist -h localhost securegist > backup.sql

# Restore
psql -U securegist -h localhost securegist < backup.sql
```

## S3 Storage Configuration

### MinIO (Development)

```bash
docker run -d \
  --name securegist-minio \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=changeme123 \
  -p 9000:9000 -p 9001:9001 \
  minio/minio server /data --console-address ":9001"

# Create bucket
mc alias set local http://localhost:9000 admin changeme123
mc mb local/securegist
mc anonymous set public local/securegist
```

### AWS S3 (Production)

1. **Create S3 bucket**:
   ```bash
   aws s3 mb s3://securegist-prod
   ```

2. **Configure CORS**:
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://securegist.example.com"],
         "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```
   ```bash
   aws s3api put-bucket-cors --bucket securegist-prod --cors-configuration file://cors.json
   ```

3. **Configure lifecycle policy** (auto-delete expired objects):
   ```json
   {
     "Rules": [
       {
         "Id": "DeleteExpired",
         "Status": "Enabled",
         "Expiration": {
           "Days": 90
         }
       }
     ]
   }
   ```

4. **Set environment variables**:
   ```bash
   S3_ENDPOINT_URL=https://s3.amazonaws.com
   S3_PUBLIC_ENDPOINT_URL=https://securegist-prod.s3.amazonaws.com
   S3_BUCKET_NAME=securegist-prod
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1
   ```

## HTTPS/TLS Configuration

### Using Traefik with Let's Encrypt

Edit `docker-compose.yml` to add HTTPS:

```yaml
traefik:
  command:
    - "--certificatesresolvers.le.acme.email=admin@example.com"
    - "--certificatesresolvers.le.acme.storage=/letsencrypt/acme.json"
    - "--certificatesresolvers.le.acme.httpchallenge.entrypoint=web"
    - "--entrypoints.web.address=:80"
    - "--entrypoints.websecure.address=:443"
  ports:
    - "443:443"
  volumes:
    - "./letsencrypt:/letsencrypt"
```

### Using nginx with Certbot

```bash
sudo certbot --nginx -d securegist.example.com
```

## Monitoring & Logging

### Application Logs

**Docker Compose**:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Kubernetes**:
```bash
kubectl logs -f deployment/securegist-backend -n securegist-prod
kubectl logs -f deployment/securegist-frontend -n securegist-prod
```

### Health Checks

- **Backend**: `GET /api/health`
- **Frontend**: Check HTTP 200 on `/`

### Metrics (Future Enhancement)

Consider adding:
- Prometheus for metrics collection
- Grafana for visualization
- OpenTelemetry for distributed tracing

## Scaling

### Horizontal Scaling

**Backend** (stateless - can scale freely):
```bash
# Docker Compose
docker-compose up -d --scale backend=3

# Kubernetes
kubectl scale deployment/securegist-backend --replicas=5 -n securegist-prod
```

**Frontend** (static files - can scale freely):
```bash
# Kubernetes
kubectl scale deployment/securegist-frontend --replicas=3 -n securegist-prod
```

### Vertical Scaling

Increase resource limits in `values-prod.yaml`:

```yaml
backend:
  resources:
    requests:
      cpu: 1000m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi
```

### Database Scaling

- **Read replicas**: Add PostgreSQL read replicas for read-heavy workloads
- **Connection pooling**: Use PgBouncer for connection management
- **Partitioning**: Partition gists table by creation date

### S3 Scaling

- AWS S3 scales automatically
- MinIO: Use distributed mode with multiple nodes

## Backup & Recovery

### Database Backups

**Automated with CronJob** (Kubernetes):

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: securegist-db-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16
            command:
            - /bin/sh
            - -c
            - pg_dump $DATABASE_URL > /backup/backup-$(date +%Y%m%d).sql
```

### S3 Backups

- Enable S3 versioning
- Use S3 replication to another region
- Regular snapshots to Glacier for long-term storage

## Troubleshooting

### Backend Issues

**Issue**: Database connection failed
```bash
# Check database is running
docker-compose ps db
# Check connection string
grep DATABASE_URL backend/.env
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**Issue**: S3 upload fails
```bash
# Check MinIO is running
docker-compose ps minio
# Check bucket exists
mc ls local/securegist
# Verify credentials
env | grep AWS_
```

### Frontend Issues

**Issue**: API calls fail (CORS)
- Check `VITE_API_URL` in `.env`
- Verify backend CORS configuration
- Check browser console for CORS errors

**Issue**: Build fails
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Network Issues

**Issue**: Services can't communicate (Docker Compose)
```bash
# Check networks
docker network ls
docker network inspect securegist_default

# Check service IPs
docker-compose exec backend ping -c 3 db
```

### Performance Issues

**Issue**: Slow responses
- Check database query performance: Enable PostgreSQL slow query log
- Monitor S3 presigned URL generation time
- Check network latency between services
- Review backend logs for bottlenecks

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Connection refused` | Service not running | `docker-compose ps` and restart |
| `Access denied` | Wrong credentials | Verify environment variables |
| `404 Not Found` | Routing issue | Check Traefik labels/Ingress rules |
| `CORS error` | Origin not allowed | Add origin to backend CORS config |

## Production Checklist

Before going to production:

- [ ] Enable HTTPS/TLS with valid certificates
- [ ] Change all default passwords
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure S3 bucket policies
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Review security headers (CSP, HSTS)
- [ ] Configure log aggregation
- [ ] Test disaster recovery procedures
- [ ] Document incident response plan
- [ ] Set up health checks and auto-restart

## Support

For deployment issues:
- 📖 [GitHub Discussions](https://github.com/Derad6709/SecureGist/discussions)
- 🐛 [Report Issues](https://github.com/Derad6709/SecureGist/issues)

---

**Last Updated**: February 2026  
**Version**: 1.0
