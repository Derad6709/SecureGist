# 🔒 Security & Encryption Design

This document describes the security architecture and encryption design of SecureGist.

## Table of Contents

- [Overview](#overview)
- [Threat Model](#threat-model)
- [Encryption Design](#encryption-design)
- [Key Management](#key-management)
- [Data Flow](#data-flow)
- [Security Features](#security-features)
- [Known Limitations](#known-limitations)
- [Security Best Practices](#security-best-practices)
- [Reporting Vulnerabilities](#reporting-vulnerabilities)

## Overview

SecureGist implements **client-side end-to-end encryption** using industry-standard cryptographic algorithms. The server operates on a **zero-knowledge principle**: it never has access to plaintext content or encryption keys.

### Core Principle

> **The server stores only encrypted blobs and metadata. Decryption keys never leave the client.**

## Threat Model

### What SecureGist Protects Against

✅ **Server-side data breaches**: Even if the server is compromised, encrypted data remains unreadable  
✅ **Network eavesdropping**: Data transmitted is already encrypted before leaving the client  
✅ **Database leaks**: PostgreSQL stores only encrypted blobs and metadata  
✅ **Unauthorized access**: Access controls via read limits and expiration  
✅ **Man-in-the-middle attacks**: HTTPS transport encryption (when deployed with TLS)

### What SecureGist Does NOT Protect Against

❌ **Client-side attacks**: Malicious browser extensions, keyloggers, XSS vulnerabilities  
❌ **URL interception**: Anyone with the full URL (including fragment) can decrypt  
❌ **Phishing**: Users sharing links with malicious actors  
❌ **Browser vulnerabilities**: Exploitation of Web Crypto API bugs  
❌ **Side-channel attacks**: Timing attacks, cache attacks on client device

## Encryption Design

### Algorithm: AES-256-GCM

SecureGist uses **AES-256-GCM** (Galois/Counter Mode) for authenticated encryption:

- **Key size**: 256 bits (32 bytes)
- **IV size**: 96 bits (12 bytes)
- **Authentication**: Built-in AEAD (Authenticated Encryption with Associated Data)
- **Implementation**: Browser's native Web Crypto API (`crypto.subtle`)

**Why AES-GCM?**
- ✅ Industry standard (NIST approved)
- ✅ Hardware acceleration available on modern CPUs
- ✅ Authenticated encryption prevents tampering
- ✅ Fast and efficient for web applications

### Encryption Process

```javascript
// 1. Generate random 256-bit encryption key
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,  // extractable
  ['encrypt', 'decrypt']
);

// 2. Generate random 96-bit IV (Initialization Vector)
const iv = crypto.getRandomValues(new Uint8Array(12));

// 3. Encrypt content
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: iv },
  key,
  textEncoder.encode(plaintext)
);

// 4. Combine IV + ciphertext for storage
const blob = new Uint8Array(iv.length + encrypted.byteLength);
blob.set(iv, 0);
blob.set(new Uint8Array(encrypted), iv.length);
```

### Decryption Process

```javascript
// 1. Extract key from URL fragment
const keyData = urlFragment.split('#')[1];
const key = await importKey(keyData);

// 2. Fetch encrypted blob from server
const blob = await fetch(`/api/gists/${id}/download`);

// 3. Extract IV and ciphertext
const iv = blob.slice(0, 12);
const ciphertext = blob.slice(12);

// 4. Decrypt
const plaintext = await crypto.subtle.decrypt(
  { name: 'AES-GCM', iv: iv },
  key,
  ciphertext
);
```

## Key Management

### Key Generation

- Keys are generated using `crypto.getRandomValues()`, which provides cryptographically secure random numbers
- Key generation happens entirely in the browser
- Keys are never transmitted to the server

### Key Distribution

SecureGist uses **URL fragments** (hash) for key distribution:

```
https://securegist.example.com/gist/abc123#base64EncodedKey
                                         ↑
                        This part never reaches the server
```

**Why URL fragments?**
- RFC 3986: Fragments are client-side only
- Browsers do NOT send fragments in HTTP requests
- Fragments are excluded from Referer headers
- Simple, no additional key exchange protocol needed

### Key Storage

🚫 **Keys are NEVER stored**:
- Not in localStorage
- Not in sessionStorage
- Not in cookies
- Not on the server

Keys exist only:
- In memory during encryption/decryption
- In the URL fragment (user's responsibility to share securely)

## Data Flow

### Creating a Gist

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Enter content
     ▼
┌──────────────────────┐
│  Browser (Frontend)  │
├──────────────────────┤
│ 2. Generate key      │
│ 3. Encrypt content   │
│ 4. Create S3 upload  │
└────┬─────────────────┘
     │ POST /api/gists (metadata only)
     ▼
┌──────────────────────┐
│  Backend API         │
├──────────────────────┤
│ 5. Create gist record│
│ 6. Return presigned  │
│    S3 upload URL     │
└────┬─────────────────┘
     │ 7. Upload encrypted blob
     ▼
┌──────────────────────┐
│  S3 Storage          │
└──────────────────────┘
     │
     ▼
┌──────────────────────┐
│ Return URL with key: │
│ /gist/abc#key123     │
└──────────────────────┘
```

### Reading a Gist

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Open URL with key
     ▼
┌──────────────────────┐
│  Browser (Frontend)  │
├──────────────────────┤
│ 2. Extract key from  │
│    URL fragment      │
└────┬─────────────────┘
     │ GET /api/gists/{id}
     ▼
┌──────────────────────┐
│  Backend API         │
├──────────────────────┤
│ 3. Check access count│
│ 4. Increment counter │
│ 5. Return metadata + │
│    presigned S3 URL  │
└────┬─────────────────┘
     │ 6. Fetch encrypted blob
     ▼
┌──────────────────────┐
│  S3 Storage          │
└──────────────────────┘
     │
     ▼
┌──────────────────────┐
│  Browser (Frontend)  │
├──────────────────────┤
│ 7. Decrypt with key  │
│ 8. Display content   │
└──────────────────────┘
```

## Security Features

### 1. Access Control

**Read Limits ("Burn After Reading")**:
- Configurable maximum read count (default: 100)
- Server increments counter on each access
- Gist automatically deleted when limit reached
- Prevents unlimited data harvesting

**Time-Based Expiration**:
- Options: 1 day, 7 days, 30 days, 90 days
- Server automatically purges expired gists
- Reduces attack window for brute-force attempts

### 2. Data Separation

- **Metadata** (PostgreSQL): UUID, timestamps, access counts, expiration
- **Encrypted Blobs** (S3): Ciphertext only, no metadata
- Compromise of one component doesn't expose complete data

### 3. No Plaintext Logging

- Backend never logs or stores plaintext content
- Error messages never expose decrypted data
- Audit logs contain only metadata (IDs, timestamps)

### 4. Compression Before Encryption

- Content is compressed (LZ-String) before encryption
- Prevents traffic analysis based on size
- Reduces storage costs

### 5. Presigned URLs

- Backend generates time-limited S3 presigned URLs
- Frontend never needs direct S3 credentials
- URL expiration adds additional access control layer

## Known Limitations

### 1. Key Distribution via URL

**Risk**: Anyone with the complete URL (including fragment) can decrypt the gist.

**Mitigation**:
- Use secure communication channels (Signal, encrypted email)
- Don't post links publicly unless content is meant to be public
- Use short expiration times for sensitive data

### 2. Browser Requirement

**Risk**: Requires modern browser with Web Crypto API support.

**Mitigation**:
- Feature detection with graceful degradation
- Clear error messages for unsupported browsers
- Minimum versions: Chrome 37+, Firefox 34+, Safari 11+

### 3. No Password Protection

**Risk**: Unlike some competitors, gists are not additionally password-protected.

**Future Enhancement**: Could add optional password-based encryption (PBKDF2 + AES)

### 4. No Perfect Forward Secrecy

**Risk**: If a key is compromised, past encrypted data can be decrypted.

**Design Choice**: Trade-off for simplicity and performance

### 5. Browser Extension Risks

**Risk**: Malicious browser extensions can access page content and keys.

**User Responsibility**: Only use trusted extensions, especially when handling sensitive data

## Security Best Practices

### For Users

1. **Share Links Securely**: Use encrypted channels (Signal, ProtonMail)
2. **Use Short Expirations**: For sensitive data, use 1-day expiration
3. **Enable Read Limits**: Use "burn after reading" (max reads = 1) for highly sensitive data
4. **Verify HTTPS**: Ensure you're using SecureGist over HTTPS
5. **Trusted Environment**: Only access sensitive gists on trusted devices
6. **Clear Browser Cache**: Close browser tabs after viewing sensitive gists

### For Administrators

1. **Enable HTTPS/TLS**: Always deploy with valid TLS certificates
2. **Regular Updates**: Keep dependencies updated for security patches
3. **Database Encryption**: Enable encryption at rest for PostgreSQL
4. **S3 Security**: Configure S3 bucket policies and encryption
5. **Rate Limiting**: Implement API rate limits to prevent abuse
6. **Monitor Logs**: Watch for suspicious access patterns
7. **Backup Strategy**: Regular encrypted backups of database

### For Developers

1. **Code Review**: All crypto code changes require security review
2. **Dependency Scanning**: Use `npm audit` and `pip check` regularly
3. **CSP Headers**: Configure Content Security Policy headers
4. **Input Validation**: Sanitize all user inputs
5. **Error Handling**: Never expose sensitive data in error messages

## Reporting Vulnerabilities

We take security seriously. If you discover a security vulnerability:

1. Open a [GitHub Issue](https://github.com/Derad6709/SecureGist/issues) with "[SECURITY]" in the title
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. Maintainers will respond within 48 hours
4. For sensitive issues, discussion may be moved to a private channel

We will work with you to address the issue and coordinate disclosure.

### Security Hall of Fame

We recognize security researchers who responsibly disclose vulnerabilities:
- (List will be updated as reports are received)

## Compliance

### Standards

- **OWASP**: Follows OWASP Top 10 best practices
- **CWE**: Addresses common weakness enumeration
- **NIST**: Uses NIST-approved cryptographic algorithms

### Privacy

SecureGist implements privacy-by-design:
- No user accounts or tracking
- No analytics or telemetry
- No IP address logging
- No cookie tracking

## Audit History

| Date | Auditor | Scope | Findings | Status |
|------|---------|-------|----------|--------|
| TBD  | -       | Full  | -        | Pending |

We welcome independent security audits. Please contact us if you'd like to perform an audit.

## References

- [Web Crypto API Specification](https://www.w3.org/TR/WebCryptoAPI/)
- [AES-GCM NIST Publication](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [RFC 3986 - URI Fragment Identifier](https://tools.ietf.org/html/rfc3986#section-3.5)

---

**Last Updated**: February 2026  
**Version**: 1.0
