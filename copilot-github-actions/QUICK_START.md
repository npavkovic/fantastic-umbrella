# Quick Start Guide

## Test the Editorial Workflow Action

This guide helps you quickly test the GitHub Actions editorial workflow in your repository.

### 1. Prerequisites Setup

First, ensure you have the required API keys:

```bash
# Get Perplexity AI API key from: https://docs.perplexity.ai/docs/getting-started
# Get Claude API key from: https://console.anthropic.com/

# Add to your GitHub repository secrets:
# Settings > Secrets and variables > Actions > New repository secret
```

### 2. Copy Action to Your Repository

```bash
# Copy the entire copilot-github-actions directory to your repository root
cp -r /path/to/copilot-github-actions /path/to/your-repo/

# Or clone and copy specific files
git clone <this-repo>
cp -r copilot-github-actions /path/to/your-repo/
```

### 3. Create Test Content

Create a simple test file:

```bash
mkdir -p content
cat > content/test-article.md << 'EOF'
---
title: "Testing the Editorial Workflow"
status: "draft"
tags: ["test", "automation", "github-actions"]
created: "2024-01-01T10:00:00Z"
author: "Test Author"
---

# Testing the Editorial Workflow

This is a test article to validate the automated editorial workflow.

## What We Want to Learn

- How effective is AI-powered research?
- Can we automate content creation?
- What are the best practices for editorial automation?

## Expected Outcomes

After processing, this article should:
1. Have comprehensive research added
2. Be transformed into a full blog post
3. Maintain quality and readability

*Note: This content will be processed by AI to add research and generate a full draft.*
EOF
```

### 4. Create Workflow File

```bash
mkdir -p .github/workflows
cat > .github/workflows/test-editorial.yml << 'EOF'
name: Test Editorial Workflow

on:
  push:
    paths:
      - 'content/**/*.md'
  workflow_dispatch:

jobs:
  editorial-workflow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd copilot-github-actions
          npm install

      - name: Build action
        run: |
          cd copilot-github-actions
          npm run build

      - name: Run Editorial Workflow
        uses: ./copilot-github-actions
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          perplexity-api-key: ${{ secrets.PERPLEXITY_API_KEY }}
          claude-api-key: ${{ secrets.CLAUDE_API_KEY }}
          action-type: 'both'

      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "Editorial Workflow"
          git add .
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "Automated editorial workflow test [skip ci]"
            git push
          fi
EOF
```

### 5. Test the Workflow

```bash
# Commit and push to trigger the workflow
git add .
git commit -m "Add test content for editorial workflow"
git push origin main

# Or manually trigger via GitHub UI:
# Go to Actions tab > Test Editorial Workflow > Run workflow
```

### 6. Monitor Progress

1. Go to your repository's Actions tab
2. Click on the running workflow
3. Monitor the logs for each step
4. Check for any errors in the action output

### 7. Verify Results

After successful completion, check:

1. **Research Phase**: Your test file should have:
   - Status changed to `research`
   - Added research findings section
   - Added sources section
   - Research summary

2. **Draft Phase**: Your test file should have:
   - Status changed to `draft`
   - Full article content generated
   - Enhanced metadata (word count, sections)
   - Publication-ready format

### 8. Troubleshooting

**Common Issues:**

1. **Secrets not set**: Verify API keys are added to repository secrets
2. **Permissions error**: Ensure Actions have write permissions
3. **Build failures**: Check Node.js version and dependencies
4. **API failures**: Verify API keys are valid and have sufficient quota

**Debug Steps:**

```bash
# Enable debug logging
# Add ACTIONS_STEP_DEBUG = true to repository secrets

# Check action logs for detailed error messages
# Review API responses in the workflow logs
# Verify file changes in the repository
```

### 9. Next Steps

Once testing is successful:

1. **Add More Content**: Create additional test files with different topics
2. **Customize Workflow**: Modify triggers and configuration as needed
3. **Set Up Production**: Configure for your actual content workflow
4. **Monitor Performance**: Track API usage and workflow efficiency

## Example Expected Output

### Before Processing (Draft Status):
```yaml
---
title: "Testing the Editorial Workflow"
status: "draft"
tags: ["test", "automation", "github-actions"]
---

# Testing the Editorial Workflow
Basic content...
```

### After Research Phase:
```yaml
---
title: "Testing the Editorial Workflow"
status: "research"
tags: ["test", "automation", "github-actions"]
---

# Testing the Editorial Workflow

## Research Findings
- Finding 1: Detailed research insight
- Finding 2: Another key insight

## Sources
- Source 1: Reference link
- Source 2: Another reference

## Research Summary
Comprehensive summary of research findings...

Original content...
```

### After Draft Phase:
```yaml
---
title: "Testing the Editorial Workflow: A Comprehensive Guide"
status: "draft"
tags: ["test", "automation", "github-actions", "ai", "workflow"]
wordCount: 1500
sections: ["Introduction", "Key Benefits", "Implementation", "Conclusion"]
---

# Testing the Editorial Workflow: A Comprehensive Guide

## Introduction
Full introduction with context...

## Key Benefits
Detailed benefits section...

## Implementation
Step-by-step implementation guide...

## Conclusion
Comprehensive conclusion...
```

This demonstrates the complete transformation from basic draft to research-enhanced, AI-generated publication-ready content.
