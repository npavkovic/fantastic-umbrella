// Jules-github-actions/index.js
const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
// We'll need a YAML parser later, e.g., js-yaml
// For now, let's assume a simple frontmatter parsing or add it in the file operations step.

async function run() {
  try {
    core.info('Starting Blog Content Workflow Action...');

    // Get inputs
    const token = core.getInput('GITHUB_TOKEN', { required: true });
    // const perplexityApiKey = core.getInput('PERPLEXITY_API_KEY'); // We'll use these later
    const { researchStage } = require('./researchStage');
    const { draftStage } = require('./draftStage');
    // const claudeApiKey = core.getInput('CLAUDE_API_KEY');       // We'll use these later
    const contentDir = core.getInput('CONTENT_DIR') || '.';
    const gitUserName = core.getInput('GIT_USER_NAME');
    const gitUserEmail = core.getInput('GIT_USER_EMAIL');

    core.info(`Content directory: ${contentDir}`);
    core.info(`Git User Name: ${gitUserName}`);
    core.info(`Git User Email: ${gitUserEmail}`);


    // Setup Octokit
    const octokit = github.getOctokit(token);

    // Get event context
    const { eventName, payload } = github.context;
    core.info(`Event name: ${eventName}`);

    let changedFiles = [];

    if (eventName === 'push') {
      const pushPayload = payload;
      if (!pushPayload.commits) {
        core.warning('No commits found in push payload. Exiting.');
        return;
      }

      for (const commit of pushPayload.commits) {
        core.info(`Processing commit: ${commit.id} by ${commit.author.name}`);
        // Get files modified in this commit
        // The github.context.payload for a push event doesn't directly list files per commit in a simple array.
        // It's better to use the compare endpoint or look at `added`, `modified` arrays in the commit data.
        // `commit.added`, `commit.modified` are the simplest if they exist and are populated.
        
        const addedFiles = commit.added || [];
        const modifiedFiles = commit.modified || [];
        
        changedFiles.push(...addedFiles, ...modifiedFiles);
      }
      // Filter out duplicates that might occur if a file is added and modified in different commits of the same push
      changedFiles = [...new Set(changedFiles)];

      core.info(`Files changed in push: ${changedFiles.join(', ')}`);

    } else if (eventName === 'workflow_dispatch') {
      core.info('Workflow dispatched manually. Consider how to select files for processing.');
      // For workflow_dispatch, we might need an input to specify a file or a directory,
      // or we could decide to scan all files in contentDir.
      // For now, this action is primarily designed for 'push' events.
      // We could potentially scan all files in `contentDir` if needed for `workflow_dispatch`.
      core.setFailed("workflow_dispatch is not fully supported for targeted file processing yet. Please trigger on push.");
      return;
    } else {
      core.setFailed(`Unsupported event: ${eventName}. This action is designed for 'push' events.`);
      return;
    }

    if (changedFiles.length === 0) {
      core.info('No relevant files changed or event is not a push with file changes. Exiting.');
      return;
    }

    for (const relativeFilePath of changedFiles) {
      const filePath = path.resolve(process.env.GITHUB_WORKSPACE || '.', relativeFilePath);
      core.info(`Processing file: ${filePath}`);

      // Filter for markdown files and files within the contentDir
      if (!relativeFilePath.startsWith(contentDir) || (!filePath.endsWith('.md') && !filePath.endsWith('.markdown') && !filePath.endsWith('.yaml') && !filePath.endsWith('.yml'))) {
          core.info(`Skipping ${relativeFilePath} as it's not a relevant content file or not in the specified content directory.`);
          continue;
      }
      
      if (!fs.existsSync(filePath)) {
        core.warning(`File ${filePath} not found in workspace. It might have been deleted or moved.`);
        continue;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // TODO: Parse frontmatter (Step 5)
      // For now, just log. We'll need a robust YAML parser.
      core.info(`--- Simulating Frontmatter Parsing for ${filePath} ---`);
      const frontmatter = getFrontmatter(fileContent); // Placeholder
      const status = frontmatter.status || 'No Status'; // Placeholder
      core.info(`File: ${filePath}, Status: ${status}`);
      core.info(`--- End Simulation ---`);


      // TODO: Implement status checking and call appropriate stage (Steps 3 & 4)
      if (status === 'Ready for Research') {
        core.info(`File ${filePath} is Ready for Research. Triggering research stage... (Not implemented yet)`);
        await researchStage(filePath, octokit, core.getInput('PERPLEXITY_API_KEY'), gitUserName, gitUserEmail, contentDir);
      } else if (status === 'Ready for Draft') {
        core.info(`File ${filePath} is Ready for Draft. Triggering draft stage... (Not implemented yet)`);
        await draftStage(filePath, octokit, core.getInput('CLAUDE_API_KEY'), gitUserName, gitUserEmail, contentDir);
      } else {
        core.info(`File ${filePath} has status '${status}', no action taken at this time.`);
      }
    }

    core.info('Blog Content Workflow Action finished.');

  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}
${error.stack}`);
  }
}

// Placeholder for frontmatter parsing - will be properly implemented in Step 5
function getFrontmatter(content) {
  const match = content.match(/^---\s*([\s\S]*?)\s*---/);
  if (match) {
    // This is a very naive parser. For robustness, js-yaml should be used.
    const frontmatterText = match[1];
    const lines = frontmatterText.split('\n');
    const fmObject = {};
    lines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        fmObject[key] = value;
      }
    });
    return fmObject;
  }
  return {}; // No frontmatter found
}


run();
