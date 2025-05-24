# Blog Content Workflow GitHub Action

This GitHub Action, authored by Jules, automates a blog content pipeline involving research and drafting stages, driven by YAML frontmatter status changes in your content files. It is designed to be event-driven, reacting to pushes to your repository.

## Overview

The action monitors content files (typically Markdown) for specific `status` fields in their YAML frontmatter. Based on the status, it performs automated steps:

1.  **Research Stage**: For files marked `status: Ready for Research`, it simulates a research process, adds findings and citations to the file, and updates its status to `Ready for Draft`.
2.  **Draft Writing Stage**: For files marked `status: Ready for Draft`, it simulates AI-powered content generation, creates a new draft file (e.g., `draft-original-filename.md`) with `status: Ready for Review`, and updates the original file's status to `Draft Complete`.

All changes are committed back to your repository.

## Architecture

*   **Event-Driven**: Triggered by `push` events (or `workflow_dispatch`).
*   **Status Tracking**: Relies on a `status` field in the YAML frontmatter of each content file.
*   **AI Integration**: Currently simulates calls to Perplexity AI (for research) and Claude AI (for drafting). API key inputs are provided for future real integration.
*   **File Operations**: Reads and writes to content files, updating frontmatter and appending content.
*   **Git Integration**: Commits changes (status updates, new content, new draft files) back to the repository using the provided `GITHUB_TOKEN`.
*   **Technology**: Built with Node.js, using `js-yaml` for frontmatter parsing, and `@actions/core`, `@actions/github`, `@actions/exec` for GitHub Actions integration.

## `action.yml` Details

The behavior of this action is defined in `action.yml`.

### Inputs

*   `GITHUB_TOKEN`: **Required**. The GitHub token used to authenticate and make commits. Usually `{{ secrets.GITHUB_TOKEN }}`.
*   `PERPLEXITY_API_KEY`: Optional. API key for Perplexity AI. Not used by the current simulated version but reserved for actual integration.
*   `CLAUDE_API_KEY`: Optional. API key for Claude AI. Not used by the current simulated version but reserved for actual integration.
*   `GIT_USER_NAME`: Optional. Username for commits made by the action. Defaults to `github-actions[bot]`.
*   `GIT_USER_EMAIL`: Optional. Email for commits made by the action. Defaults to `github-actions[bot]@users.noreply.github.com`.
*   `CONTENT_DIR`: Optional. The directory within your repository where content files are located (e.g., `posts`, `articles`). Defaults to `.` (repository root). The action will only process files within this directory.

### Runs

*   Uses `node20`.
*   Main entry point: `dist/index.js` (This means the action must be built/bundled before use).

## Setup and Installation

1.  **Place Action Code**:
    *   If using this as a local action within your repository: Copy the entire `Jules-github-actions` directory (containing `action.yml`, `dist/index.js` after building, `package.json`, etc.) into your repository.
    *   If this action is published (e.g., to GitHub Marketplace or its own repo): You'll use a reference like `YourOrg/Jules-github-actions@v1`.

2.  **Build the Action (for local use)**:
    This action uses Node.js dependencies (`js-yaml`, etc.) and needs to be bundled into a single file for performance and portability within GitHub Actions.
    Navigate to the `Jules-github-actions` directory in your terminal:
    ```bash
    cd Jules-github-actions
    npm install
    npm run build
    ```
    This will use `@vercel/ncc` (listed in `devDependencies` in `package.json`) to create a `dist/index.js` file and `dist/licenses.txt`. The `action.yml` is already configured to use `dist/index.js`. Remember to commit the `dist` directory if you are using the action locally from the same repository.

3.  **Create Workflow File**:
    Create a YAML file in your repository's `.github/workflows/` directory (e.g., `.github/workflows/content_pipeline.yml`). See the example `content_pipeline.yml` provided within the `Jules-github-actions` directory for a template.
    Here's a snippet:
    ```yaml
    name: 'Blog Content Processing Pipeline'
    on:
      push:
        branches: [ main ]
        paths:
          - 'posts/**.md' # Customize this
    jobs:
      process_content:
        runs-on: ubuntu-latest
        permissions:
          contents: write # Essential for committing changes
        steps:
          - uses: actions/checkout@v4
            with:
              fetch-depth: 0 # Recommended for git operations
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
          - name: Run Blog Content Workflow
            uses: ./Jules-github-actions # If local, or YourOrg/Jules-github-actions@v1 if published
            with:
              GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
              PERPLEXITY_API_KEY: ${{ secrets.PERPLEXITY_API_KEY_SECRET }}
              CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY_SECRET }}
              CONTENT_DIR: 'posts' # Your content directory
              GIT_USER_NAME: 'Content Bot'
              GIT_USER_EMAIL: 'bot@yourdomain.com'
    ```

4.  **Set Up Secrets**:
    In your GitHub repository, go to `Settings` > `Secrets and variables` > `Actions`. Create secrets for:
    *   `PERPLEXITY_API_KEY_SECRET`: Your Perplexity AI API key.
    *   `CLAUDE_API_KEY_SECRET`: Your Claude AI API key.
    (These are not used by the current simulated version but are good practice to set up for future use).

## File Preparation

For a file to be processed by this action, it must:
*   Be a Markdown file (`.md`, `.markdown`) or YAML file (`.yml`, `.yaml`) - current filtering in `index.js`.
*   Reside within the specified `CONTENT_DIR`.
*   Contain YAML frontmatter with at least a `status` field. A `title` field is also recommended.

**Initial Status**: To begin the workflow, a file should have `status: Ready for Research`.

Example frontmatter:
```yaml
---
title: "My New Blog Post Idea"
date: YYYY-MM-DD
status: "Ready for Research"
author: "Your Name"
---

Initial content or notes can go here.
```

## Workflow Process

1.  **Research Stage**:
    *   **Trigger**: File has `status: Ready for Research`.
    *   Action:
        1.  Status changes to `Research In Progress` (committed).
        2.  (Simulated) Perplexity AI research is performed.
        3.  Research summary and citations are appended to the file content.
        4.  Status changes to `Ready for Draft` (committed with content).
    *   Error: If an error occurs, status may be set to `Research Error` and the error message logged.

2.  **Draft Writing Stage**:
    *   **Trigger**: File has `status: Ready for Draft`.
    *   Action:
        1.  Status of original file changes to `Draft In Progress` (committed).
        2.  (Simulated) Claude AI generates a draft.
        3.  A new file `draft-<original-filename>.md` is created in the same directory.
        4.  The new draft file's frontmatter includes `status: Ready for Review` and `title: "Draft: <original-title>"`.
        5.  The original file's status changes to `Draft Complete`, and a link to `draft_file` is added to its frontmatter.
        6.  Both the updated original file and the new draft file are committed.
    *   Error: If an error occurs, status may be set to `Draft Error` and the error message logged.

## Programming Decisions

*   **Event-Driven**: Chosen over polling for efficiency and immediate response, aligning with GitHub Actions best practices.
*   **No JSON Database**: Status and metadata are managed directly in the frontmatter of content files, simplifying the system and keeping content self-contained.
*   **Error Handling**:
    *   Uses `core.setFailed()` to clearly mark action steps as failed in the GitHub UI.
    *   Logs errors using `core.error()`.
    *   Attempts to update the file's frontmatter to an error status (e.g., `Research Error`, `Draft Error`) and commit this change for visibility directly in the content.
*   **Git Commits**: Uses `git` CLI commands (via `@actions/exec`) for robust control over committing and pushing changes, including configuring the committer's name and email. Each significant status change or content addition results in a separate commit for traceability.

## Future Enhancements

*   **Real AI Integration**: Replace simulated AI calls with actual API calls to Perplexity, Claude, or other services.
*   **Advanced Error Handling**: Implement retry mechanisms for transient errors (e.g., network issues when calling AIs).
*   **Configurability**:
    *   Allow customization of draft file naming conventions and output directory.
    *   Support for more frontmatter fields or custom status names.
*   **Pull Request Creation**: Option to create a Pull Request with changes instead of committing directly to the branch, allowing for review before merging.
*   **Logging**: Introduce configurable logging levels (debug, info, warn).
*   **Frontmatter Validation**: Add schema validation for frontmatter to catch errors early.
*   **Batching**: For `workflow_dispatch`, allow processing of all eligible files in `CONTENT_DIR` rather than just changed files.

## Development

*   **Dependencies**: Managed in `package.json`. Key dependencies include `@actions/core`, `@actions/github`, `@actions/exec`, and `js-yaml`.
*   **Building**: The action must be bundled before it can be reliably used by GitHub Actions. The `npm run build` script uses `@vercel/ncc` for this:
    ```bash
    # From within Jules-github-actions directory
    npm install # To install dependencies, including ncc
    npm run build # To bundle index.js into dist/index.js
    ```
    Commit the `dist` directory along with your action source if you are using it as a local action.
*   **Testing**:
    *   Manually trigger the workflow on a test repository with sample content files.
    *   Examine action logs and commit history to verify behavior.
    *   Test different status transitions and error conditions.

---
Authored by Jules.
