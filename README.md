# 🔐 SecureGist

Secure code snippet sharing with **client-side end-to-end encryption** or even in URL mode. Server never sees your plaintext data.

The backend and frontend were all vibecoded.

## Features

- 🔒 **AES-256-GCM encryption** in browser
- 🔥 **Burn after reading** with configurable read limits
- ⏰ **Auto-expiration** (1-90 days)
- 📦 **Multi-file support**
- 🎨 **Syntax highlighting** for 100+ languages

## Quick Start

```bash
git clone https://github.com/Derad6709/SecureGist.git
cd SecureGist
docker-compose up -d
```

Access at: <http://localhost>

## Architecture

```txt
┌─────────────┐           ┌──────────────┐         ┌──────────┐
│   Browser   │           │   FastAPI    │         │PostgreSQL│
│  (React)    │◄─────────►│   Backend    │◄───────►│  + S3    │
│             │  Encrypted│              │ Metadata│          │
│ Crypto Keys │   Blobs   │ No Plaintext │  Only   │ Encrypted│
└─────────────┘           └──────────────┘         └──────────┘
      │
      └─► Encryption Key shared via URL fragment (#key)
          Never sent to server
```

### Components

#### Frontend (React + TypeScript)

- Client-side AES-256-GCM encryption using Web Crypto API
- Multi-file code editor with syntax highlighting
- QR code generation for easy sharing
- No plaintext ever leaves the browser

#### Backend (FastAPI)

- Async Python API with SQLAlchemy ORM
- Handles only encrypted blobs and metadata
- Presigned S3 URLs for direct client uploads
- Access control: read limits and expiration

#### Database (PostgreSQL)

- Stores gist metadata (UUID, timestamps, read count)
- Tracks expiration and access limits
- No plaintext content stored

#### Storage (MinIO/S3)

- Object storage for encrypted blobs
- CORS-enabled for browser direct upload
- Automatic cleanup of expired gists

#### Reverse Proxy (Traefik)

- Routes requests to frontend/backend/S3
- Load balancing and SSL termination
- Dashboard for monitoring

## How It Works

### URL Mode

1. Create gist -> browser compresses it
2. Share URL with data in fragment: `/gist/abc123#CompressedData`
3. Recipient uncompress data in browser

### Remote Mode

1. Create gist → Browser encrypts with random AES-256 key
2. Encrypted blob uploaded to S3, metadata to PostgreSQL
3. Share URL with key in fragment: `/gist/abc123#key`
4. Recipient decrypts in browser using key from URL

**Server stores**: Encrypted blobs + metadata only  
**Server never sees**: Plaintext content or encryption keys

## Stack

**Frontend**: React + TypeScript + Web Crypto API  
**Backend**: FastAPI + PostgreSQL + S3 (MinIO)  
**Deploy**: Docker Compose or Kubernetes/Helm

## Deployment

### Docker Compose

```bash
docker-compose up -d
```

Services included:

- Frontend (React on nginx)
- Backend (FastAPI)
- PostgreSQL database
- MinIO (S3 storage)
- Traefik (reverse proxy)

### Kubernetes with Helm

**Install dependencies:**

```bash
cd helm/securegist
helm dependency update
```

**Deploy to dev:**

```bash
helm install securegist . \
  -f values.yaml \
  -f values-dev.yaml \
  --create-namespace \
  --namespace securegist-dev
```

**Deploy to production:**

```bash
helm install securegist . \
  -f values.yaml \
  -f values-prod.yaml \
  --create-namespace \
  --namespace securegist-prod
```

**Check status:**

```bash
kubectl get pods -n securegist-prod
kubectl get svc -n securegist-prod
```

**Upgrade:**

```bash
helm upgrade securegist . \
  -f values-prod.yaml \
  --namespace securegist-prod
```

**Helm chart includes:**

- Backend and frontend deployments with configurable replicas
- PostgreSQL via Bitnami chart (with persistence)
- MinIO for S3-compatible storage
- Traefik ingress controller
- Horizontal pod autoscaling support
- Resource limits and health checks

## Development

**Backend**:

```bash
cd backend
uv sync
uv run uvicorn src.main:app --reload
```

**Frontend**:

```bash
cd frontend
npm install
npm run dev
```

See [backend/README.md](./backend/README.md) and [frontend/README.md](./frontend/README.md) for details.

## GitHub Pages (Frontend, URL-only)

You can deploy the frontend to GitHub Pages in URL-only mode (no backend).

Set these env vars for the frontend build:

```bash
VITE_LOCAL_ONLY=true
VITE_USE_HASH_ROUTER=false
VITE_BASE_PATH=/<your-repo-name>/
```

Then build the frontend and publish the `dist/` folder to GitHub Pages.

## API

- `POST /api/gists` - Create gist
- `GET /api/gists/{id}` - Get metadata
- `DELETE /api/gists/{id}` - Delete gist

Docs: <http://localhost/api/docs>

## Security

- AES-256-GCM encryption
- Keys shared via URL fragments (never sent to server)
- Zero-knowledge architecture
- Read limits and expiration for access control

## Support

- 🐛 [GitHub Issues](https://github.com/Derad6709/SecureGist/issues)
- 💬 [Discussions](https://github.com/Derad6709/SecureGist/discussions)
