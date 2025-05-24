# Editorial Workflow GitHub Action

An event-driven GitHub Actions workflow that automates blog content creation through research and draft writing stages using Perplexity AI and Claude AI.

## 🚀 Features

- **Event-Driven Architecture**: Replaces polling with GitHub Actions triggers
- **AI-Powered Research**: Uses Perplexity AI for comprehensive topic research
- **Intelligent Draft Generation**: Leverages Claude AI for high-quality content creation
- **Status-Based Workflow**: Manages content through `draft → research → draft → published` stages
- **Type-Safe Implementation**: Built with TypeScript for reliability and maintainability
- **No External Dependencies**: Eliminates JSON file dependencies and polling mechanisms

## 📋 Prerequisites

- GitHub repository with content files
- Perplexity AI API key
- Anthropic Claude API key
- GitHub Actions enabled

## ⚙️ Setup

### 1. Add API Keys as Repository Secrets

```bash
# In your GitHub repository settings > Secrets and variables > Actions
PERPLEXITY_API_KEY=your_perplexity_api_key
CLAUDE_API_KEY=your_claude_api_key
```

### 2. Create Workflow File

Create `.github/workflows/editorial-workflow.yml`:

```yaml
name: Editorial Workflow

on:
  push:
    paths:
      - 'content/**/*.md'
      - 'blog/**/*.md'
      - 'posts/**/*.md'
  workflow_dispatch:
    inputs:
      action_type:
        description: 'Action to perform'
        required: true
        default: 'both'
        type: choice
        options:
          - research
          - draft
          - both

jobs:
  editorial-workflow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Run Editorial Workflow
        uses: ./copilot-github-actions
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          perplexity-api-key: ${{ secrets.PERPLEXITY_API_KEY }}
          claude-api-key: ${{ secrets.CLAUDE_API_KEY }}
          action-type: ${{ github.event.inputs.action_type || 'both' }}
```

### 3. Create Content Files

Create content files with frontmatter:

```markdown
---
title: "Your Article Title"
status: "draft"
tags: ["technology", "ai", "programming"]
created: "2024-01-01T00:00:00Z"
author: "Author Name"
---

# Your Article Title

Your initial content here...
```

## 🔄 Workflow Stages

### Stage 1: Research (`draft` → `research`)
- Automatically triggered when content files have `status: "draft"`
- Uses Perplexity AI to conduct research based on title and tags
- Adds research findings, sources, and summary to content
- Updates status to `research`

### Stage 2: Draft Generation (`research` → `draft`)
- Automatically triggered when content files have `status: "research"`
- Uses Claude AI to generate comprehensive draft from research
- Creates structured, publication-ready content
- Updates status to `draft` with enhanced metadata

## 📁 Project Structure

```
copilot-github-actions/
├── src/
│   ├── index.ts                 # Main workflow orchestration
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── clients/
│   │   ├── github-client.ts    # GitHub API integration
│   │   ├── perplexity-client.ts # Perplexity AI client
│   │   └── claude-client.ts    # Claude AI client
│   ├── actions/
│   │   ├── research-action.ts  # Research workflow logic
│   │   └── draft-action.ts     # Draft generation logic
│   └── utils/
│       └── helpers.ts          # Utility functions
├── dist/                       # Bundled action (generated)
├── examples/                   # Example content files
└── docs/                       # Documentation
```

## 🧪 Building

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Create distribution bundle
npm run package

# Lint code
npm run lint
```

## 🔧 Configuration

### Input Parameters

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | `${{ secrets.GITHUB_TOKEN }}` |
| `perplexity-api-key` | Perplexity AI API key | Yes | - |
| `claude-api-key` | Claude AI API key | Yes | - |
| `action-type` | Type of action to perform | No | `both` |
| `content-paths` | Paths to scan for content | No | `content/**,blog/**,posts/**` |

### Content File Format

Content files must include frontmatter with at minimum:

```yaml
---
title: "Article Title"
status: "draft" | "research" | "published"
---
```

Optional frontmatter fields:
- `tags`: Array of keywords for research
- `created`: ISO timestamp
- `author`: Author name
- `wordCount`: Word count (auto-generated)
- `sections`: Content sections (auto-generated)

## 🚀 Usage Examples

### Basic Usage
```yaml
- name: Run Editorial Workflow
  uses: ./copilot-github-actions
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    perplexity-api-key: ${{ secrets.PERPLEXITY_API_KEY }}
    claude-api-key: ${{ secrets.CLAUDE_API_KEY }}
```

### Research Only
```yaml
- name: Conduct Research
  uses: ./copilot-github-actions
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    perplexity-api-key: ${{ secrets.PERPLEXITY_API_KEY }}
    claude-api-key: ${{ secrets.CLAUDE_API_KEY }}
    action-type: 'research'
```

### Draft Generation Only
```yaml
- name: Generate Drafts
  uses: ./copilot-github-actions
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    perplexity-api-key: ${{ secrets.PERPLEXITY_API_KEY }}
    claude-api-key: ${{ secrets.CLAUDE_API_KEY }}
    action-type: 'draft'
```

## 🔍 Output

The action provides detailed output including:
- Number of files processed
- Status transitions performed
- Any errors encountered
- Links to updated content

## 🛠️ Development

### Building from Source

```bash
# Clone the repository
git clone <repository-url>
cd copilot-github-actions

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create distribution bundle
npm run package
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure code builds successfully
5. Submit a pull request

## 📖 API Documentation

### GitHubClient
- `findContentFiles(status)`: Find content files with specific status
- `getFileContent(path)`: Retrieve file content and SHA
- `updateFile(path, content, message, sha?)`: Update or create file

### PerplexityClient
- `conductResearch(topic, keywords)`: Conduct AI research on topic

### ClaudeClient
- `generateDraft(research, contentType)`: Generate draft from research

## 🚨 Troubleshooting

### Common Issues

1. **API Rate Limits**: Implement delays between API calls
2. **Large Files**: Action has size limits for file processing
3. **Token Permissions**: Ensure GitHub token has repository write access
4. **API Keys**: Verify all API keys are correctly configured

### Debug Mode

Enable debug output by setting the `ACTIONS_STEP_DEBUG` secret to `true`.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Support

- Create an issue for bug reports
- Submit pull requests for contributions
- Check the [CONTRIBUTING.md](CONTRIBUTING.md) guide

## 🔗 Related Projects

- [Original Polling System](../scripts/git-timed-workflow.js) - The system this action replaces
- [Manual Commands](../src/commands/) - Individual command implementations
