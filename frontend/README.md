# SecureGist Frontend

React + TypeScript frontend with **client-side AES-256-GCM encryption**.

## Features

- 🔐 Web Crypto API encryption
- 📝 Multi-file gist support
- 🎨 Syntax highlighting (highlight.js)
- 📱 QR code generation
- ⚡ Built with Vite + React 18

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Access at: http://localhost:5173

## Environment

```bash
# .env
VITE_API_URL=/api
```

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm test         # Run tests
npm run lint     # Lint code
```

## Encryption

### Create Gist

```typescript
// Generate key
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

// Encrypt content
const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  new TextEncoder().encode(content)
);

// Combine IV + ciphertext
const blob = new Uint8Array(iv.length + encrypted.byteLength);
blob.set(iv, 0);
blob.set(new Uint8Array(encrypted), iv.length);
```

### View Gist

```typescript
// Extract key from URL fragment
const keyStr = window.location.hash.slice(1);
const key = await importKey(keyStr);

// Fetch and decrypt
const response = await fetch(`/api/gists/${id}/download`);
const arrayBuffer = await response.arrayBuffer();
const data = new Uint8Array(arrayBuffer);

const iv = data.slice(0, 12);
const ciphertext = data.slice(12);

const decrypted = await crypto.subtle.decrypt(
  { name: 'AES-GCM', iv },
  key,
  ciphertext
);
```

## Structure

```
src/
├── components/
│   ├── Home.tsx      # Gist creation
│   └── Gist.tsx      # Gist viewing
├── lib/
│   ├── crypto.ts     # Encryption utils
│   └── api.ts        # API client
├── App.tsx           # Routing
└── main.tsx          # Entry point
```

## Build

```bash
npm run build
# Output: dist/
```

### Docker

```bash
docker build -t securegist-frontend \
  --build-arg VITE_API_URL=/api .
docker run -p 80:80 securegist-frontend
```

## Stack

- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS
- Web Crypto API
- React Router
- Highlight.js
- LZ-String (compression)
