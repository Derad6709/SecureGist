# 🔐 SecureGist

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**SecureGist** is a secure, privacy-focused code snippet sharing platform with **client-side end-to-end encryption**. Share code snippets, configuration files, or sensitive text with confidence that your data is encrypted before it leaves your browser.

## ✨ Features

- 🔒 **Client-Side Encryption**: AES-256-GCM encryption happens in your browser - the server never sees plaintext
- 🔥 **Burn After Reading**: Set maximum read limits (default: 100 reads)
- ⏰ **Auto-Expiration**: Automatic deletion after 1, 7, 30, or 90 days
- 📦 **Multi-File Support**: Bundle multiple files in a single gist
- 📱 **QR Code Sharing**: Generate QR codes for easy mobile sharing
- 🎨 **Syntax Highlighting**: Support for 100+ programming languages
- 🚀 **High Performance**: Built with FastAPI (async) and React
- 📊 **S3 Storage**: Scalable object storage for encrypted blobs
- 🐳 **Container Ready**: Docker and Kubernetes/Helm deployment support

## 🏗️ Architecture

SecureGist follows a **zero-knowledge architecture** where encryption happens entirely client-side:

```
┌─────────────┐           ┌──────────────┐         ┌──────────┐
│   Browser   │           │   FastAPI    │         │PostgreSQL│
│  (React)    │◄─────────►│   Backend    │◄───────►│  + S3    │
│             │  Encrypted │              │ Metadata│          │
│ Crypto Keys │   Blobs    │ No Plaintext │  Only   │ Encrypted│
└─────────────┘           └──────────────┘         └──────────┘
      │
      └─► Encryption Key shared via URL fragment (#key)
          Never sent to server
```

**Key Components:**
- **Frontend**: React + TypeScript with Web Crypto API for AES-GCM encryption
- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL for metadata
- **Storage**: S3-compatible object storage (MinIO) for encrypted blobs
- **Reverse Proxy**: Traefik for routing and load balancing

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- OR: Node.js 18+, Python 3.14+, PostgreSQL 16+

### Using Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Derad6709/SecureGist.git
   cd SecureGist
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Frontend: http://localhost
   - Backend API: http://localhost/api
   - API Docs: http://localhost/api/docs
   - Traefik Dashboard: http://localhost:8080

### Local Development

See detailed setup instructions:
- [Frontend Setup](./frontend/README.md)
- [Backend Setup](./backend/README.md)

## 📖 Documentation

- [Security & Encryption Design](./SECURITY.md) - How we protect your data
- [Deployment Guide](./DEPLOYMENT.md) - Docker, Kubernetes/Helm instructions
- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute
- [Backend API Documentation](./backend/README.md) - API reference and examples
- [Frontend Architecture](./frontend/README.md) - React components and crypto utilities

## 🔒 Security Model

SecureGist implements **client-side end-to-end encryption**:

1. **Encryption**: User creates a gist → Browser generates random AES-256 key → Content encrypted locally → Encrypted blob sent to server
2. **Key Sharing**: Encryption key shared via URL fragment (`#key`), which never reaches the server
3. **Decryption**: Recipient opens link → Key extracted from URL fragment → Encrypted blob fetched → Content decrypted in browser

**What the server stores:**
- ✅ Encrypted blobs (unreadable binary data)
- ✅ Metadata (UUID, expiration, read count)
- ❌ Plaintext content
- ❌ Encryption keys

For detailed security analysis, see [SECURITY.md](./SECURITY.md).

## 🧪 Testing

### Backend Tests
```bash
cd backend
uv run pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/gists` | Create encrypted gist |
| GET | `/api/gists/{id}` | Get gist metadata |
| DELETE | `/api/gists/{id}` | Delete gist |
| GET | `/api/health` | Health check |

Interactive API documentation: http://localhost/api/docs

## 🛠️ Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Web Crypto API (encryption)
- React Router (navigation)
- Highlight.js (syntax highlighting)

**Backend:**
- FastAPI (web framework)
- SQLAlchemy + asyncpg (async ORM)
- PostgreSQL 16 (database)
- boto3 (S3 client)
- Pydantic (data validation)

**Infrastructure:**
- Docker + Docker Compose
- Kubernetes + Helm
- Traefik (reverse proxy)
- MinIO (S3-compatible storage)

## 📦 Deployment

### Docker Compose
```bash
docker-compose up -d
```

### Kubernetes with Helm
```bash
helm install securegist ./helm/securegist
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details on:
- Code of conduct
- Development workflow
- Pull request process
- Coding standards

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Inspired by [PrivateBin](https://privatebin.info/)
- Icons by [Lucide](https://lucide.dev/)

## 📧 Support

- 🐛 Report bugs: [GitHub Issues](https://github.com/Derad6709/SecureGist/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Derad6709/SecureGist/discussions)
- 📖 Documentation: [Wiki](https://github.com/Derad6709/SecureGist/wiki)

---

**⚠️ Security Notice**: While SecureGist uses strong encryption, no system is 100% secure. Do not use this for storing highly sensitive information without proper security review. See [SECURITY.md](./SECURITY.md) for details.
