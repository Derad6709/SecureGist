# 🔐 SecureGist

Secure code snippet sharing with **client-side end-to-end encryption**. Server never sees your plaintext data.

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

Access at: http://localhost

## How It Works

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

## API

- `POST /api/gists` - Create gist
- `GET /api/gists/{id}` - Get metadata
- `DELETE /api/gists/{id}` - Delete gist

Docs: http://localhost/api/docs

## Security

- AES-256-GCM encryption
- Keys shared via URL fragments (never sent to server)
- Zero-knowledge architecture
- Read limits and expiration for access control

## Support

- 🐛 [GitHub Issues](https://github.com/Derad6709/SecureGist/issues)
- 💬 [Discussions](https://github.com/Derad6709/SecureGist/discussions)
