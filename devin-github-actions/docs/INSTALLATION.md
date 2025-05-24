# Editorial Workflow GitHub Actions Installation Guide

This guide provides step-by-step instructions for setting up the Editorial Workflow GitHub Actions system in your repository.

## Prerequisites

Before installing the system, ensure you have:

1. A GitHub repository where you want to implement the workflow
2. Access to the following API keys:
   - Notion API key
   - Perplexity API key
   - Anthropic API key (for Claude)
3. Notion databases set up for blog posts and drafts
4. Administrator access to the GitHub repository to configure secrets

## Installation Steps

### 1. Copy the Workflow Files

Copy the entire `devin-github-actions` directory to the root of your repository. This includes:

- `.github/workflows/` directory with workflow files
- `actions/` directory with action implementations
- `docs/` directory with documentation
- `utils/` directory with utility functions

### 2. Configure GitHub Secrets

1. Navigate to your GitHub repository
2. Go to "Settings" > "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Add the following secrets:

   | Name | Description |
   |------|-------------|
   | `NOTION_API_KEY` | Your Notion API key |
   | `NOTION_BLOG_POSTS_ID` | ID of your Notion Blog Posts database |
   | `NOTION_DRAFTS_ID` | ID of your Notion Drafts database |
   | `PERPLEXITY_API_KEY` | Your Perplexity API key |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude |

### 3. Configure Notion Databases

Ensure your Notion databases have the following properties:

#### Blog Posts Database

- `Title` (title): Title of the blog post
- `Status` (status): Status of the blog post (e.g., "Ready for Research", "Research In Progress", "Ready for Draft", "Draft In Progress", "Draft Created", "Error")
- `Error` (rich text): Error message if an error occurs

#### Drafts Database

- `Title` (title): Title of the draft
- `Status` (status): Status of the draft (e.g., "Ready to Start", "Writing in Progress", "Research Processed", "Ready for Review", "Error")
- `Type` (select): Type of the draft (e.g., "Research Brief", "Blog Draft")
- `Blog Posts` (relation): Relation to the Blog Posts database
- `Error` (rich text): Error message if an error occurs
- `Last Modified Date` (date): Date the draft was last modified

### 4. Install Dependencies

Each action requires its own dependencies. Navigate to each action directory and install the dependencies:

```bash
# Install dependencies for the research action
cd devin-github-actions/actions/research
npm install

# Install dependencies for the draft writing action
cd ../../actions/draft-writing
npm install

# Install dependencies for the monitor action
cd ../../actions/monitor
npm install
```

### 5. Commit and Push Changes

Commit the changes to your repository and push them to GitHub:

```bash
git add devin-github-actions
git commit -m "Add Editorial Workflow GitHub Actions"
git push
```

### 6. Enable Workflows

1. Navigate to your GitHub repository
2. Go to "Actions" tab
3. You should see the "Editorial Workflow" and "Editorial Workflow Monitor" workflows
4. Click on each workflow and enable it by clicking the "I understand my workflows, go ahead and enable them" button

## Testing the Workflow

### Manual Testing

You can manually trigger the workflow to test it:

1. Navigate to your GitHub repository
2. Go to "Actions" tab
3. Select "Editorial Workflow"
4. Click "Run workflow"
5. Select the workflow type (research or draft-writing)
6. Click "Run workflow"

### Monitoring

The Editorial Workflow Monitor runs automatically according to the schedule defined in the workflow file (every 15 minutes by default). You can also manually trigger it for testing.

## Troubleshooting

### Workflow Failures

If a workflow fails, check the following:

1. **API Keys**: Ensure all API keys are correctly configured as GitHub Secrets
2. **Notion Database IDs**: Verify the Notion database IDs are correct
3. **Notion Database Structure**: Ensure the Notion databases have the required properties
4. **Action Logs**: Check the action logs for error messages

### Permission Issues

If you encounter permission issues:

1. Ensure the GitHub token has the necessary permissions
2. Check that the Notion API key has access to the specified databases
3. Verify that the Perplexity and Anthropic API keys are valid

### Rate Limiting

If you encounter rate limiting issues:

1. Adjust the schedule in the Editorial Workflow Monitor to run less frequently
2. Consider implementing retry logic with exponential backoff

## Customization

You can customize the workflow by modifying the following files:

- `.github/workflows/editorial-monitor.yml`: Adjust the schedule or event triggers
- `.github/workflows/editorial-workflow.yml`: Modify the workflow steps or inputs
- `actions/research/index.js`: Customize the research process
- `actions/draft-writing/index.js`: Customize the draft writing process
- `actions/monitor/index.js`: Customize the monitoring process

## Support

If you encounter issues or have questions, please open an issue in the GitHub repository.
