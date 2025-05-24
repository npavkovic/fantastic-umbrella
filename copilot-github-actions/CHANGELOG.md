# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-05-23

### Added
- Initial release of event-driven GitHub Actions implementation
- Research action using Perplexity AI for content research
- Draft action using Claude AI for blog post generation
- TypeScript implementation with full type safety
- Comprehensive error handling and status management
- GitHub Actions workflow configuration
- Modular client architecture for AI services
- Status-based workflow transitions
- Frontmatter-based content management
- Automatic file processing on git changes
- Configurable AI model parameters
- Built-in logging and debugging support

### Changed
- Replaced polling-based workflow with event-driven architecture
- Eliminated dependency on JSON file management
- Migrated from JavaScript to TypeScript
- Implemented GitHub Actions native logging

### Removed
- Polling mechanism and timed intervals
- blog.json and research.json dependencies
- Dry run and single item processing modes (not applicable to event-driven model)

### Technical Details
- **Architecture**: Event-driven GitHub Actions with modular TypeScript implementation
- **AI Integration**: Perplexity AI for research, Claude AI for content generation
- **Status Management**: YAML frontmatter with validated state transitions
- **Error Handling**: File-based error tracking with detailed logging
- **Deployment**: Self-contained GitHub Action with npm build process

### Migration Notes
- Content files should use YAML frontmatter for status tracking
- Remove references to blog.json and research.json files
- Update repository structure to use content/research and content/blog directories
- Configure GitHub repository secrets for API keys

## [Unreleased]

### Planned
- Enhanced error recovery mechanisms
- Parallel processing of multiple files
- Content quality validation
- Custom AI prompt templates
- Performance optimization and caching
- Advanced workflow customization options
