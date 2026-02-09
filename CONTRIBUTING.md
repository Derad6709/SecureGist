# 🤝 Contributing to SecureGist

Thank you for considering contributing to SecureGist! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Security Contributions](#security-contributions)
- [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, gender identity, sexual orientation, disability, personal appearance, race, ethnicity, age, religion, or nationality.

### Our Standards

**Positive behaviors include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors include:**
- Harassment, trolling, or insulting/derogatory comments
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of unacceptable behavior may be reported to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:
1. **Check existing issues** to avoid duplicates
2. **Use the latest version** to ensure the bug hasn't been fixed
3. **Collect information** about the bug

When reporting a bug, include:
- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, browser, version)
- **Error messages** or logs

**Example bug report:**
```markdown
**Bug**: Gist decryption fails with special characters

**Steps to Reproduce:**
1. Create a gist with content containing emoji: 🔐
2. Save and copy the link
3. Open the link in a new browser tab
4. Observe decryption error

**Expected**: Content displays with emoji intact
**Actual**: Error message "Decryption failed"

**Environment**: Chrome 120, Windows 11
**Error**: TypeError: Failed to execute 'decode' on 'TextDecoder'
```

### Suggesting Features

Feature requests are welcome! Before submitting:
1. **Check if it's already requested**
2. **Describe the use case** - why is this needed?
3. **Provide examples** of how it would work
4. **Consider alternatives** - are there other ways to solve this?

**Example feature request:**
```markdown
**Feature**: Password-protected gists

**Use Case**: Add an extra layer of security by requiring a password 
in addition to the encryption key.

**Proposed Implementation**:
- User enters optional password when creating gist
- Password is used with PBKDF2 to derive encryption key
- Recipient must enter password to decrypt

**Alternatives Considered**:
- Using longer encryption keys (but harder to share)
- Two-factor authentication (too complex for anonymous app)
```

### Improving Documentation

Documentation improvements are always welcome:
- Fix typos or clarify unclear sections
- Add examples or use cases
- Translate documentation to other languages
- Create tutorials or guides

### Contributing Code

See [Development Workflow](#development-workflow) below.

## Development Setup

### Prerequisites

**Backend:**
- Python 3.14+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip
- PostgreSQL 16+
- Access to S3-compatible storage (MinIO for local dev)

**Frontend:**
- Node.js 18+
- npm or yarn

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/SecureGist.git
   cd SecureGist
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Derad6709/SecureGist.git
   ```

4. **Start dependencies** (PostgreSQL + MinIO):
   ```bash
   docker-compose up -d db minio createbuckets
   ```

5. **Backend setup**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your settings
   uv sync
   ```

6. **Frontend setup**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   ```

7. **Verify setup**:
   ```bash
   # Backend
   cd backend
   uv run pytest
   
   # Frontend
   cd frontend
   npm test
   ```

### Running Development Servers

**Backend** (with auto-reload):
```bash
cd backend
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** (with hot module replacement):
```bash
cd frontend
npm run dev
```

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Making Changes

1. **Sync with upstream**:
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   git push origin main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/add-password-protection
   ```

3. **Make your changes**:
   - Write code following [Coding Standards](#coding-standards)
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**:
   ```bash
   # Backend
   cd backend
   uv run pytest
   
   # Frontend
   cd frontend
   npm test
   npm run lint
   ```

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add password protection for gists"
   ```

   Use conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

6. **Push to your fork**:
   ```bash
   git push origin feature/add-password-protection
   ```

7. **Open a Pull Request** on GitHub

## Coding Standards

### Python (Backend)

**Style Guide**: PEP 8 with some modifications

```python
# Good: Clear function names, type hints, docstrings
async def create_gist(
    gist_data: GistCreate,
    db: AsyncSession
) -> Gist:
    """
    Create a new encrypted gist.
    
    Args:
        gist_data: Gist creation data
        db: Database session
        
    Returns:
        Created gist object
    """
    gist = Gist(**gist_data.dict())
    db.add(gist)
    await db.commit()
    return gist
```

**Key Points:**
- Use type hints for all function parameters and returns
- Write docstrings for public functions
- Maximum line length: 100 characters
- Use async/await for database operations
- Prefer explicit over implicit

**Linting:**
```bash
# Format code
black .

# Check types
mypy .

# Lint
ruff check .
```

### TypeScript/React (Frontend)

**Style Guide**: Airbnb React/JSX style guide

```typescript
// Good: Typed props, clear component structure
interface GistViewerProps {
  gistId: string;
  onDecryptionError?: (error: Error) => void;
}

export const GistViewer: React.FC<GistViewerProps> = ({
  gistId,
  onDecryptionError
}) => {
  const [content, setContent] = useState<string>('');
  
  // ... component logic
  
  return (
    <div className="gist-viewer">
      {/* JSX content */}
    </div>
  );
};
```

**Key Points:**
- Use TypeScript for all new code
- Define interfaces for props and state
- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks

**Linting:**
```bash
# Lint and fix
npm run lint

# Type check
npm run build
```

### Naming Conventions

- **Variables/Functions**: camelCase (`getUserData`)
- **Classes/Components**: PascalCase (`GistViewer`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_GIST_SIZE`)
- **Files**: kebab-case (`gist-viewer.tsx`)
- **Database tables**: snake_case (`gist_files`)

## Testing Guidelines

### Backend Testing

Use `pytest` with async support:

```python
# tests/test_api.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_gist(client: AsyncClient):
    """Test creating a new gist."""
    response = await client.post(
        "/api/gists",
        json={
            "max_reads": 100,
            "expires_in_days": 7,
            "files": [{
                "name": "test.txt",
                "language": "text",
                "s3_key": "test-key"
            }]
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["max_reads"] == 100
```

**Run tests:**
```bash
cd backend
uv run pytest
uv run pytest --cov=src  # With coverage
```

### Frontend Testing

Use Vitest and React Testing Library:

```typescript
// src/components/__tests__/GistViewer.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GistViewer } from '../GistViewer';

describe('GistViewer', () => {
  it('displays loading state initially', () => {
    render(<GistViewer gistId="test-id" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  
  it('displays error on decryption failure', async () => {
    render(<GistViewer gistId="invalid" />);
    expect(await screen.findByText(/failed to decrypt/i)).toBeInTheDocument();
  });
});
```

**Run tests:**
```bash
cd frontend
npm test
npm run test:coverage  # With coverage
```

### Test Coverage

Aim for:
- **Backend**: 80%+ coverage
- **Frontend**: 70%+ coverage
- **Critical paths** (encryption, API): 100% coverage

## Pull Request Process

### Before Submitting

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated (if applicable)
- [ ] No merge conflicts with main branch
- [ ] Commits follow conventional commit format

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All existing tests pass
- [ ] Added new tests for changes
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings introduced
```

### Review Process

1. **Automated checks** run (tests, linting)
2. **Code review** by maintainers
3. **Feedback addressed** by contributor
4. **Approval** by at least one maintainer
5. **Merge** to main branch

### After Merge

- Delete your feature branch
- Update your fork:
  ```bash
  git checkout main
  git pull upstream main
  git push origin main
  ```

## Security Contributions

Security is critical for SecureGist. Special guidelines apply:

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Email security@securegist.example.com
2. Include detailed description and reproduction steps
3. Wait for confirmation before public disclosure

### Security Code Review

All changes to cryptographic code require:
- Explanation of security impact
- References to standards/best practices
- Additional review by security-focused maintainer
- Extra scrutiny during code review

### Sensitive Areas

Extra care needed when modifying:
- `/frontend/src/lib/crypto.ts` - Encryption utilities
- `/backend/src/api.py` - API endpoints
- `/backend/src/models.py` - Database schema
- CORS configuration
- Environment variable handling

## Documentation

### Documentation Standards

- **Clear and concise** writing
- **Code examples** for complex features
- **Visual diagrams** where helpful
- **Keep updated** with code changes

### Documentation Types

1. **README files** - Quick start and overview
2. **API documentation** - Auto-generated from code (Swagger/JSDoc)
3. **Guides** - Step-by-step tutorials (DEPLOYMENT.md, SECURITY.md)
4. **Inline comments** - Explain complex logic only
5. **Commit messages** - Document what and why

### Where to Document

| Change Type | Documentation Location |
|-------------|------------------------|
| New API endpoint | OpenAPI schema + backend/README.md |
| New React component | JSDoc comments + inline prop types |
| Configuration change | README.md or DEPLOYMENT.md |
| Security change | SECURITY.md |
| Breaking change | CHANGELOG.md + README.md |

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Security hall of fame (for security reports)

Thank you for contributing to SecureGist! 🎉

## Questions?

- 💬 [GitHub Discussions](https://github.com/Derad6709/SecureGist/discussions)
- 📧 Email: contribute@securegist.example.com
- 📖 [Documentation](https://github.com/Derad6709/SecureGist/wiki)

---

**Last Updated**: February 2026  
**Version**: 1.0
