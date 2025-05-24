# Editorial Workflow GitHub Action

This GitHub Action automates the editorial workflow for blog content by processing markdown files through research and draft writing stages. It uses Perplexity AI for research and Claude AI for content generation.

## Architecture

The action consists of two main components:

1. **Research Stage**
   - Triggered when files in `content/research/` are modified or added
   - Processes files with status "Ready for Research"
   - Uses Perplexity AI to research the topic
   - Updates file status to "Ready for Draft" when complete

2. **Draft Writing Stage**
   - Triggered when files in `content/blog/` are modified or added
   - Processes files with status "Ready for Draft"
   - Uses Claude AI to generate a blog post based on research
   - Creates a new draft file with status "Ready for Review"
   - Updates original file status to "Draft Complete"

### Key Components

- `GitHubClient`: Handles all GitHub API interactions
- `research-action.ts`: Implements the research stage logic
- `draft-action.ts`: Implements the draft writing stage logic
- TypeScript interfaces for type safety
- Error handling and status management

## Installation

1. Add the workflow file to your repository:

```yaml
# .github/workflows/editorial-workflow.yml
name: Editorial Workflow

on:
  push:
    paths:
      - 'content/research/**'
      - 'content/blog/**'
  pull_request:
    paths:
      - 'content/research/**'
      - 'content/blog/**'

jobs:
  process-content:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd cursor-github-actions
          npm install

      - name: Process Research Stage
        if: contains(github.event.head_commit.modified, 'content/research/') || contains(github.event.head_commit.added, 'content/research/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PERPLEXITY_API_KEY: ${{ secrets.PERPLEXITY_API_KEY }}
        run: |
          cd cursor-github-actions
          node dist/actions/research-action.js

      - name: Process Draft Stage
        if: contains(github.event.head_commit.modified, 'content/blog/') || contains(github.event.head_commit.added, 'content/blog/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
        run: |
          cd cursor-github-actions
          node dist/actions/draft-action.js
```

2. Add required secrets to your repository:
   - `PERPLEXITY_API_KEY`: Your Perplexity AI API key
   - `CLAUDE_API_KEY`: Your Claude AI API key

3. Install the action dependencies:
```bash
cd cursor-github-actions
npm install
npm run build
```

## Usage

1. Create a research file in `content/research/` with status "Ready for Research":
```markdown
---
title: Your Research Topic
status: Ready for Research
---
```

2. The action will automatically:
   - Process the research file using Perplexity AI
   - Update the status to "Ready for Draft"
   - Add research content and citations

3. Create a blog file in `content/blog/` with status "Ready for Draft":
```markdown
---
title: Your Blog Post Title
status: Ready for Draft
---
```

4. The action will automatically:
   - Generate a draft using Claude AI
   - Create a new draft file with status "Ready for Review"
   - Update the original file status to "Draft Complete"

## Error Handling

- If an error occurs during processing, the file status is updated to "Error"
- Error details are stored in the frontmatter
- The action logs all errors for debugging
- Failed files can be retried by updating their status back to the appropriate stage

## Suggested Enhancements

1. **Parallel Processing**
   - Process multiple files concurrently to improve performance
   - Add rate limiting to respect API quotas

2. **Enhanced Error Recovery**
   - Add automatic retry logic for failed API calls
   - Implement exponential backoff for rate limits

3. **Content Validation**
   - Add validation for research and draft content
   - Implement quality checks before status updates

4. **Notification System**
   - Add Slack/Discord notifications for status changes
   - Send email notifications for completed drafts

5. **Content Templates**
   - Add support for different content templates
   - Allow customization of research and draft formats

6. **Analytics**
   - Track processing times and success rates
   - Generate reports on content production

7. **Review System**
   - Add support for reviewer assignments
   - Implement review feedback collection

8. **Version Control**
   - Add support for content versioning
   - Track changes between drafts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details 