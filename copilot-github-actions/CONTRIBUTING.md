# Contributing to Editorial Workflow GitHub Actions

Thank you for your interest in contributing to this project! This document provides guidelines and information for contributors.

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/editorial-workflow.git
   cd editorial-workflow/copilot-github-actions
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build and Test**
   ```bash
   npm run build
   npm run lint
   npm test
   ```

## Code Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- Provide explicit return types for functions
- Use interfaces for data structures
- Avoid `any` types when possible

### Code Style
- Use ESLint configuration provided
- Format code with consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Error Handling
- Always handle errors gracefully
- Provide meaningful error messages
- Update file status to "Error" on failures
- Log errors with appropriate context

## Testing

### Unit Tests
Create unit tests for:
- Client classes (GitHub, Perplexity, Claude)
- Utility functions
- Action logic

### Integration Tests
Test:
- Complete workflows end-to-end
- Error scenarios and recovery
- GitHub API interactions

### Test Structure
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  it('should handle normal case', () => {
    // Test implementation
  });

  it('should handle error case', () => {
    // Error test implementation
  });
});
```

## Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow code standards
   - Add tests for new functionality
   - Update documentation

3. **Test Changes**
   ```bash
   npm run build
   npm run lint
   npm test
   ```

4. **Update Documentation**
   - Update README.md if needed
   - Add or update code comments
   - Update CHANGELOG.md

5. **Submit Pull Request**
   - Provide clear description
   - Reference related issues
   - Include testing details

## Commit Message Format

Use conventional commit format:
```
type(scope): description

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/tooling changes

Examples:
```
feat(research): add support for custom search domains
fix(github): handle rate limiting properly
docs(readme): update installation instructions
```

## Issue Guidelines

### Bug Reports
Include:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Action logs if applicable

### Feature Requests
Include:
- Clear description of the feature
- Use cases and benefits
- Proposed implementation approach
- Any breaking changes

### Issue Labels
- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `documentation`: Documentation improvements
- `help wanted`: Good for contributors
- `good first issue`: Good for new contributors

## Development Guidelines

### Adding New AI Clients
1. Create client class in `src/clients/`
2. Implement standard interface:
   ```typescript
   class NewAIClient {
     constructor(config: NewAIConfig) {}
     async generateContent(prompt: string): Promise<Result> {}
   }
   ```
3. Add configuration types to `src/types/index.ts`
4. Update main workflow to use new client
5. Add comprehensive tests

### Adding New Workflow Steps
1. Create action class in `src/actions/`
2. Implement `execute()` method returning `ProcessingResult[]`
3. Handle status transitions properly
4. Add error handling and logging
5. Update main workflow orchestration

### Modifying File Processing
1. Update status validation in `src/utils/helpers.ts`
2. Ensure backward compatibility
3. Update documentation
4. Add migration guides if needed

## Release Process

1. **Version Bump**
   ```bash
   npm version [major|minor|patch]
   ```

2. **Update Changelog**
   - Add new version section
   - List all changes
   - Credit contributors

3. **Create Release**
   ```bash
   git tag v1.x.x
   git push origin v1.x.x
   ```

4. **GitHub Release**
   - Create release from tag
   - Include changelog
   - Attach build artifacts

## Support

- **Documentation**: Check README.md and inline comments
- **Issues**: Use GitHub Issues for bugs and features
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report security issues privately to maintainers

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment
- Follow GitHub Community Guidelines

Thank you for contributing!
