# 🎨 SecureGist Frontend

A modern React + TypeScript frontend for SecureGist, implementing **client-side end-to-end encryption** for secure code snippet sharing.

## 🚀 Features

- 🔐 **Client-Side Encryption**: AES-256-GCM encryption using Web Crypto API
- 📝 **Multi-File Support**: Create gists with multiple files
- 🎨 **Syntax Highlighting**: Support for 100+ programming languages via highlight.js
- 📱 **QR Code Generation**: Easy link sharing via QR codes
- 🔥 **Access Control UI**: Configure read limits and expiration
- 📊 **Real-time Compression**: LZ-String compression before encryption
- 🌐 **Responsive Design**: Mobile-friendly TailwindCSS interface
- ⚡ **Fast & Modern**: Built with Vite for optimal performance

## 🏗️ Architecture

### Component Structure

```
src/
├── components/
│   ├── Home.tsx           # Main landing page, gist creation
│   ├── Gist.tsx           # Gist viewing and decryption
│   ├── CodeEditor.tsx     # Syntax-highlighted code editor
│   ├── FileManager.tsx    # Multi-file management
│   └── QRCode.tsx         # QR code generation
├── lib/
│   ├── crypto.ts          # Encryption/decryption utilities
│   ├── api.ts             # Backend API client
│   └── utils.ts           # Helper functions
├── config.ts              # Configuration
├── App.tsx                # Main app component with routing
└── main.tsx               # Entry point
```

### Key Technologies

- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **React Router**: Client-side routing
- **TailwindCSS**: Utility-first CSS framework
- **Highlight.js**: Syntax highlighting
- **Web Crypto API**: Native browser encryption
- **LZ-String**: Text compression

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```bash
   # API endpoint (relative or absolute)
   VITE_API_URL=/api
   # For development with backend on different port:
   # VITE_API_URL=http://localhost:8000
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```
   
   Access at: http://localhost:5173

## 🛠️ Development

### Available Scripts

```bash
# Start development server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

### Development Server

The dev server supports:
- ⚡ Hot Module Replacement (HMR)
- 🔄 Fast Refresh for React
- 📊 Error overlay
- 🔍 Source maps

## 🔒 Encryption Implementation

### Crypto Utilities (`src/lib/crypto.ts`)

```typescript
import { compressToBase64, decompressFromBase64 } from 'lz-string';

// Generate random 256-bit encryption key
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt text with compression
export async function encryptText(
  text: string, 
  key: CryptoKey
): Promise<Uint8Array> {
  // 1. Compress
  const compressed = compressToBase64(text);
  
  // 2. Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // 3. Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(compressed)
  );
  
  // 4. Combine IV + ciphertext
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  
  return result;
}

// Decrypt with decompression
export async function decryptText(
  encrypted: Uint8Array,
  key: CryptoKey
): Promise<string> {
  // 1. Extract IV and ciphertext
  const iv = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  
  // 2. Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  // 3. Decompress
  const compressed = new TextDecoder().decode(decrypted);
  return decompressFromBase64(compressed);
}

// Export key as base64 for URL sharing
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

// Import key from base64
export async function importKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64);
  return await crypto.subtle.importKey(
    'raw',
    buffer,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}
```

### Encryption Flow

#### Creating a Gist

```typescript
// 1. Generate encryption key
const key = await generateKey();

// 2. Encrypt each file
const encryptedFiles = await Promise.all(
  files.map(async (file) => {
    const encrypted = await encryptText(file.content, key);
    return {
      name: file.name,
      language: file.language,
      encryptedData: encrypted
    };
  })
);

// 3. Upload to S3 via backend
const gistId = await api.createGist(encryptedFiles);

// 4. Generate shareable URL with key
const keyStr = await exportKey(key);
const url = `${window.location.origin}/gist/${gistId}#${keyStr}`;
```

#### Viewing a Gist

```typescript
// 1. Extract key from URL fragment
const keyStr = window.location.hash.slice(1);
const key = await importKey(keyStr);

// 2. Fetch gist metadata
const gist = await api.getGist(gistId);

// 3. Download encrypted files from S3
const encryptedFiles = await Promise.all(
  gist.files.map(file => api.downloadFile(file.s3_key))
);

// 4. Decrypt each file
const decryptedFiles = await Promise.all(
  encryptedFiles.map(async (encrypted, i) => ({
    name: gist.files[i].name,
    language: gist.files[i].language,
    content: await decryptText(encrypted, key)
  }))
);
```

## 🎨 UI Components

### Home Component

Main landing page with gist creation form:

```typescript
function Home() {
  const [files, setFiles] = useState([{ name: '', content: '', language: 'text' }]);
  const [maxReads, setMaxReads] = useState(100);
  const [expiresInDays, setExpiresInDays] = useState(7);
  
  const handleCreate = async () => {
    // Encryption and upload logic
  };
  
  return (
    <div>
      <FileManager files={files} onChange={setFiles} />
      <AccessControl 
        maxReads={maxReads}
        expiresInDays={expiresInDays}
        onMaxReadsChange={setMaxReads}
        onExpiresChange={setExpiresInDays}
      />
      <button onClick={handleCreate}>Create Secure Gist</button>
    </div>
  );
}
```

### Gist Component

Displays decrypted gist with syntax highlighting:

```typescript
function Gist() {
  const { id } = useParams();
  const [gist, setGist] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadGist = async () => {
      try {
        const key = await importKey(window.location.hash.slice(1));
        const gistData = await api.getGist(id);
        const decrypted = await decryptGist(gistData, key);
        setGist(decrypted);
      } catch (err) {
        setError('Failed to decrypt gist');
      }
    };
    loadGist();
  }, [id]);
  
  return gist ? <GistViewer gist={gist} /> : <ErrorDisplay error={error} />;
}
```

## 🧪 Testing

### Unit Tests

Test crypto utilities:

```typescript
// src/lib/__tests__/crypto.test.ts
import { describe, it, expect } from 'vitest';
import { generateKey, encryptText, decryptText } from '../crypto';

describe('Crypto utilities', () => {
  it('encrypts and decrypts text correctly', async () => {
    const key = await generateKey();
    const plaintext = 'Hello, SecureGist!';
    
    const encrypted = await encryptText(plaintext, key);
    const decrypted = await decryptText(encrypted, key);
    
    expect(decrypted).toBe(plaintext);
  });
  
  it('produces different ciphertext for same plaintext', async () => {
    const key = await generateKey();
    const plaintext = 'Same text';
    
    const encrypted1 = await encryptText(plaintext, key);
    const encrypted2 = await encryptText(plaintext, key);
    
    // Different IVs should produce different ciphertext
    expect(encrypted1).not.toEqual(encrypted2);
  });
});
```

### Component Tests

Test React components:

```typescript
// src/components/__tests__/Home.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Home } from '../Home';

describe('Home component', () => {
  it('renders create gist form', () => {
    render(<Home />);
    expect(screen.getByText(/create secure gist/i)).toBeInTheDocument();
  });
  
  it('adds new file when clicking add file', () => {
    render(<Home />);
    const addButton = screen.getByText(/add file/i);
    fireEvent.click(addButton);
    
    const fileInputs = screen.getAllByPlaceholderText(/filename/i);
    expect(fileInputs).toHaveLength(2);
  });
});
```

### Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

## 🏗️ Building for Production

### Build

```bash
npm run build
```

This creates an optimized production build in `dist/`:
- Minified JavaScript
- CSS purging (unused TailwindCSS removed)
- Asset optimization
- Source maps

### Build Configuration

Key Vite configuration (`vite.config.ts`):

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'crypto': ['lz-string'],
          'highlight': ['highlight.js']
        }
      }
    }
  }
});
```

## 🚢 Deployment

### Docker

The included `Dockerfile` builds a production-ready image:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Build and run:
```bash
docker build -t securegist-frontend --build-arg VITE_API_URL=/api .
docker run -p 80:80 securegist-frontend
```

### Static Hosting

Can be deployed to:
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **AWS S3 + CloudFront**: Upload `dist/` folder
- **GitHub Pages**: Via GitHub Actions

### Environment Variables

Configure at build time:

```bash
# Production API URL
VITE_API_URL=https://api.securegist.com

# Build
npm run build
```

## 🔧 Configuration

### API Configuration (`src/config.ts`)

```typescript
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 20,
  supportedLanguages: [
    'javascript', 'typescript', 'python', 'java', 
    'go', 'rust', 'c', 'cpp', 'csharp',
    // ... more
  ]
};
```

### TailwindCSS (`tailwind.config.js`)

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
};
```

## 🐛 Debugging

### Browser DevTools

1. **Sources Tab**: View TypeScript source maps
2. **Network Tab**: Inspect API calls and S3 uploads
3. **Console**: Check for crypto errors
4. **Application Tab**: Verify no keys in storage

### Common Issues

**Issue**: Crypto API not available
- **Solution**: Ensure using HTTPS (or localhost for dev)

**Issue**: CORS errors
- **Solution**: Check backend CORS configuration includes your origin

**Issue**: Decryption fails
- **Solution**: Verify key in URL hash, check browser compatibility

## 📖 Additional Resources

- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)

## 🤝 Contributing

See the main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## 📄 License

Part of the SecureGist project, licensed under MIT License.

---

For more information, see the [main README](../README.md).
