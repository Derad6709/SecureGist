# 🎡 SecureGist Helm Chart

Kubernetes Helm chart for deploying SecureGist with high availability and production-ready configuration.

## Overview

This Helm chart deploys a complete SecureGist stack including:
- Frontend (React app served by nginx)
- Backend (FastAPI application)
- PostgreSQL database (via Bitnami chart)
- MinIO object storage (via MinIO chart)
- Traefik reverse proxy/ingress (via Traefik chart)

## Prerequisites

- Kubernetes 1.25+
- Helm 3.10+
- kubectl configured with cluster access
- Persistent volume provisioner (for databases and storage)
- (Optional) LoadBalancer service support or Ingress controller

## Installation

### Quick Start

1. **Add Helm dependencies**:
   ```bash
   cd helm/securegist
   helm dependency update
   ```

2. **Install for development**:
   ```bash
   helm install securegist . \
     -f values.yaml \
     -f values-dev.yaml \
     --create-namespace \
     --namespace securegist-dev
   ```

3. **Install for production**:
   ```bash
   helm install securegist . \
     -f values.yaml \
     -f values-prod.yaml \
     --create-namespace \
     --namespace securegist-prod
   ```

### Verify Installation

```bash
# Check pod status
kubectl get pods -n securegist-prod

# Check services
kubectl get svc -n securegist-prod

# Check ingress
kubectl get ingress -n securegist-prod

# View logs
kubectl logs -f deployment/securegist-backend -n securegist-prod
```

### Access the Application

Depending on your ingress configuration:

```bash
# Get ingress IP/hostname
kubectl get ingress -n securegist-prod

# Port-forward for testing (if no ingress)
kubectl port-forward svc/traefik 8080:80 -n securegist-prod
# Then access: http://localhost:8080
```

## Configuration

### Values Files

Three configuration files are provided:

1. **`values.yaml`** - Base configuration (required)
2. **`values-dev.yaml`** - Development overrides (optional)
3. **`values-prod.yaml`** - Production overrides (optional)

### Key Configuration Options

#### Backend Configuration

```yaml
backend:
  # Number of replicas for high availability
  replicaCount: 3
  
  # Container image
  image:
    repository: ghcr.io/derad6709/securegist-backend
    tag: "latest"
    pullPolicy: IfNotPresent
  
  # Resource limits
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  
  # Environment variables
  env:
    DATABASE_URL: "postgresql+asyncpg://securegist:password@postgresql:5432/securegist"
    S3_ENDPOINT_URL: "http://minio:9000"
    S3_BUCKET_NAME: "securegist"
    CORS_ORIGINS: "https://securegist.example.com"
  
  # Service configuration
  service:
    type: ClusterIP
    port: 8000
```

#### Frontend Configuration

```yaml
frontend:
  # Number of replicas
  replicaCount: 2
  
  # Container image
  image:
    repository: ghcr.io/derad6709/securegist-frontend
    tag: "latest"
    pullPolicy: IfNotPresent
  
  # Build-time API URL
  buildArgs:
    VITE_API_URL: "/api"
  
  # Resource limits
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
  
  # Service configuration
  service:
    type: ClusterIP
    port: 80
```

#### PostgreSQL Configuration (Bitnami Chart)

```yaml
postgresql:
  enabled: true
  
  auth:
    database: securegist
    username: securegist
    password: changeme-in-production
    # Use existing secret:
    # existingSecret: securegist-db-secret
  
  # Primary configuration
  primary:
    persistence:
      enabled: true
      size: 10Gi
      storageClass: "standard"
    
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2000m
        memory: 2Gi
  
  # Read replicas (for scaling reads)
  readReplicas:
    replicaCount: 0  # Set to 1+ for read replicas
    persistence:
      enabled: true
      size: 10Gi
```

#### MinIO Configuration

```yaml
minio:
  enabled: true
  
  # Access credentials
  rootUser: admin
  rootPassword: changeme-in-production
  
  # Mode: standalone or distributed
  mode: standalone
  
  # Persistence
  persistence:
    enabled: true
    size: 50Gi
    storageClass: "standard"
  
  # Resources
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi
  
  # Buckets to create automatically
  buckets:
    - name: securegist
      policy: public  # For presigned URLs
      purge: false
  
  # Service configuration
  service:
    type: ClusterIP
    port: 9000
```

#### Traefik Configuration

```yaml
traefik:
  enabled: true
  
  # Deployment configuration
  deployment:
    replicas: 2
  
  # Ports
  ports:
    web:
      port: 80
      exposedPort: 80
    websecure:
      port: 443
      exposedPort: 443
  
  # Service type
  service:
    type: LoadBalancer
    # type: ClusterIP  # Use with existing ingress controller
  
  # TLS configuration
  ingressRoute:
    dashboard:
      enabled: false  # Disable in production
```

#### Ingress Configuration

```yaml
ingress:
  enabled: true
  className: traefik
  
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  
  hosts:
    - host: securegist.example.com
      paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: frontend
              port: 80
        - path: /api
          pathType: Prefix
          backend:
            service:
              name: backend
              port: 8000
  
  tls:
    - secretName: securegist-tls
      hosts:
        - securegist.example.com
```

## Upgrading

### Upgrade Release

```bash
helm upgrade securegist . \
  -f values-prod.yaml \
  --namespace securegist-prod
```

### Rollback

```bash
# List releases
helm history securegist -n securegist-prod

# Rollback to previous version
helm rollback securegist -n securegist-prod

# Rollback to specific revision
helm rollback securegist 3 -n securegist-prod
```

## Scaling

### Horizontal Scaling

Scale backend replicas:
```bash
kubectl scale deployment/securegist-backend --replicas=5 -n securegist-prod
```

Or update values and upgrade:
```yaml
backend:
  replicaCount: 5
```

### Vertical Scaling

Update resource limits in values file:
```yaml
backend:
  resources:
    requests:
      cpu: 2000m
      memory: 2Gi
    limits:
      cpu: 4000m
      memory: 4Gi
```

Then upgrade the release.

## Monitoring

### Health Checks

Built-in readiness and liveness probes:

```yaml
backend:
  readinessProbe:
    httpGet:
      path: /api/health
      port: 8000
    initialDelaySeconds: 10
    periodSeconds: 5
  
  livenessProbe:
    httpGet:
      path: /api/health
      port: 8000
    initialDelaySeconds: 30
    periodSeconds: 10
```

### Logs

```bash
# Backend logs
kubectl logs -f deployment/securegist-backend -n securegist-prod

# Frontend logs
kubectl logs -f deployment/securegist-frontend -n securegist-prod

# Database logs
kubectl logs -f statefulset/postgresql -n securegist-prod

# All logs
kubectl logs -f -l app.kubernetes.io/name=securegist -n securegist-prod
```

### Metrics

Consider adding:
- **Prometheus**: For metrics collection
- **Grafana**: For visualization
- **Loki**: For log aggregation

## Backup & Recovery

### Database Backup

Create a CronJob for automated backups:

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
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgresql
                  key: password
            command:
            - /bin/sh
            - -c
            - pg_dump -h postgresql -U securegist securegist > /backup/backup-$(date +\%Y\%m\%d).sql
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

### S3 Backup

MinIO supports:
- Bucket replication to another MinIO/S3
- Versioning for object recovery
- Lifecycle policies for automatic archival

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n securegist-prod

# Describe pod for events
kubectl describe pod <pod-name> -n securegist-prod

# Check logs
kubectl logs <pod-name> -n securegist-prod
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:16 --restart=Never -n securegist-prod -- \
  psql postgresql://securegist:password@postgresql:5432/securegist -c "SELECT 1"
```

#### Storage Issues

```bash
# Check PVCs
kubectl get pvc -n securegist-prod

# Describe PVC
kubectl describe pvc <pvc-name> -n securegist-prod
```

#### Ingress Not Working

```bash
# Check ingress
kubectl get ingress -n securegist-prod
kubectl describe ingress securegist -n securegist-prod

# Check Traefik logs
kubectl logs -f deployment/traefik -n securegist-prod
```

## Security Considerations

### Secrets Management

Use Kubernetes secrets for sensitive data:

```bash
# Create database secret
kubectl create secret generic securegist-db-secret \
  --from-literal=password=your-secure-password \
  -n securegist-prod

# Create S3 credentials secret
kubectl create secret generic securegist-s3-secret \
  --from-literal=access-key=your-access-key \
  --from-literal=secret-key=your-secret-key \
  -n securegist-prod
```

Reference in values:
```yaml
postgresql:
  auth:
    existingSecret: securegist-db-secret

backend:
  envFrom:
    - secretRef:
        name: securegist-s3-secret
```

### Network Policies

Restrict pod-to-pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: securegist-backend-policy
spec:
  podSelector:
    matchLabels:
      app: securegist-backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: traefik
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgresql
    ports:
    - protocol: TCP
      port: 5432
```

### Pod Security Standards

Enable Pod Security Admission:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: securegist-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Production Checklist

Before deploying to production:

- [ ] Update all default passwords
- [ ] Configure TLS/HTTPS with valid certificates
- [ ] Set appropriate resource limits
- [ ] Enable database backups
- [ ] Configure monitoring and alerting
- [ ] Set up log aggregation
- [ ] Enable pod autoscaling (HPA)
- [ ] Configure network policies
- [ ] Review security policies
- [ ] Test disaster recovery procedures
- [ ] Set up CI/CD pipelines
- [ ] Configure rate limiting

## Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Bitnami PostgreSQL Chart](https://github.com/bitnami/charts/tree/main/bitnami/postgresql)
- [MinIO Helm Chart](https://github.com/minio/minio/tree/master/helm/minio)
- [Traefik Helm Chart](https://github.com/traefik/traefik-helm-chart)

## Support

For Helm chart issues:
- 🐛 [GitHub Issues](https://github.com/Derad6709/SecureGist/issues)
- 💬 [Discussions](https://github.com/Derad6709/SecureGist/discussions)

---

**Chart Version**: 0.1.0  
**App Version**: 1.16.0  
**Last Updated**: February 2026
