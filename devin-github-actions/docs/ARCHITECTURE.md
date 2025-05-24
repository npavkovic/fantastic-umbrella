# Editorial Workflow GitHub Actions Architecture

This document outlines the architecture of the Editorial Workflow GitHub Actions system, explaining the design decisions, event flows, and component interactions.

## System Overview

The Editorial Workflow GitHub Actions system is designed to automate the process of researching topics and generating blog drafts using AI. It replaces the original JavaScript-based timed workflow with an event-driven approach that triggers actions based on content status changes.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Monitoring     │────▶│  Research       │────▶│  Draft Writing  │
│  Workflow       │     │  Action         │     │  Action         │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         Notion Database                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Monitoring Workflow

The Monitoring Workflow (`editorial-monitor.yml`) is a scheduled GitHub Action that checks for content ready for processing. It runs periodically (every 15 minutes by default) and dispatches events to trigger the appropriate workflows when content is ready.

**Key Functions:**
- Queries Notion databases for content with specific status values
- Dispatches repository events to trigger the main workflow
- Replaces the polling aspect of the original timed workflow

### 2. Main Workflow

The Main Workflow (`editorial-workflow.yml`) is triggered by repository dispatch events and handles the execution of the research and draft writing actions.

**Key Functions:**
- Responds to `repository_dispatch` events with types `research-trigger` and `draft-trigger`
- Supports manual triggering via `workflow_dispatch` for testing
- Uses a matrix strategy to handle different workflow types
- Manages secret passing to actions

### 3. Research Action

The Research Action (`actions/research`) processes blog post topics and generates research briefs using Perplexity AI.

**Key Functions:**
- Queries Notion for items with status "Ready for Research"
- Updates status to "Research In Progress"
- Calls Perplexity AI to research the topic
- Creates a research brief in Notion
- Updates status to "Ready for Draft"
- Handles errors by setting status to "Error" with error details

### 4. Draft Writing Action

The Draft Writing Action (`actions/draft-writing`) processes research briefs and generates blog drafts using Claude AI.

**Key Functions:**
- Queries Notion for items with status "Ready for Draft"
- Updates status to "Draft In Progress"
- Calls Claude AI to generate a blog post based on research
- Creates a new draft with status "Ready for Review"
- Updates original research status to "Draft Complete"
- Handles errors appropriately

### 5. Monitor Action

The Monitor Action (`actions/monitor`) checks for content that needs processing and sets outputs that determine whether to trigger the main workflow.

**Key Functions:**
- Queries Notion databases for content with specific status values
- Sets outputs that indicate whether content is ready for processing
- Used by the Monitoring Workflow to determine when to trigger the main workflow

## Event Flow

1. **Monitoring Phase**:
   - The Monitoring Workflow runs on a schedule
   - It uses the Monitor Action to check for content ready for processing
   - If content is found, it dispatches a repository event

2. **Research Phase**:
   - The Main Workflow is triggered by a `research-trigger` event
   - It runs the Research Action
   - The Research Action processes the topic and updates its status

3. **Draft Writing Phase**:
   - The Main Workflow is triggered by a `draft-trigger` event
   - It runs the Draft Writing Action
   - The Draft Writing Action processes the research brief and creates a blog draft

## Data Flow

The system uses Notion databases for content management and status tracking. The workflow actions query the databases to find content ready for processing, update status values during processing, and create new content as needed.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Blog Posts DB  │────▶│  Research       │────▶│  Drafts DB      │
│  (Topics)       │     │  Action         │     │  (Research)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │                 │
                                               │  Draft Writing  │
                                               │  Action         │
                                               │                 │
                                               └─────────────────┘
                                                        │
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │                 │
                                               │  Drafts DB      │
                                               │  (Blog Drafts)  │
                                               │                 │
                                               └─────────────────┘
```

## Error Handling

The system includes comprehensive error handling at multiple levels:

1. **Action-Level Error Handling**:
   - Each action includes try-catch blocks to handle errors
   - Errors are logged using GitHub Actions core logging
   - Status values are updated to indicate errors

2. **Workflow-Level Error Handling**:
   - The Main Workflow includes error handling for action failures
   - Failed actions do not prevent future workflow runs

3. **Recovery Mechanisms**:
   - The system includes mechanisms to reset status values in case of errors
   - Error details are recorded in Notion for troubleshooting

## Security

The system uses GitHub Secrets for secure storage of API keys and sensitive information:

- `NOTION_API_KEY`: Notion API key
- `NOTION_BLOG_POSTS_ID`: Notion Blog Posts database ID
- `NOTION_DRAFTS_ID`: Notion Drafts database ID
- `PERPLEXITY_API_KEY`: Perplexity API key
- `ANTHROPIC_API_KEY`: Anthropic API key for Claude

These secrets are passed to actions as inputs and are never exposed in logs or outputs.
