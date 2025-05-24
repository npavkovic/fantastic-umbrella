// Jules-github-actions/fileUtils.js
const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const github = require('@actions/github'); // For octokit if needed, but git CLI is often better for commits
const exec = require('@actions/exec');
const yaml = require('js-yaml'); // Added js-yaml

/**
 * Parses YAML frontmatter from a file content string.
 * @param {string} fileContent Content of the file.
 * @returns {object} Parsed frontmatter object, or empty object if no frontmatter.
 */
function getFrontmatter(fileContent) {
  try {
    const match = fileContent.match(/^---\s*([\s\S]*?)\s*---/);
    if (match && match[1]) {
      return yaml.load(match[1]) || {};
    }
  } catch (e) {
    core.warning(`Error parsing YAML frontmatter: ${e.message}`);
  }
  return {};
}

/**
 * Updates the YAML frontmatter and optionally the content of a file.
 * @param {string} filePath Absolute path to the file.
 * @param {object} frontmatterObject The new frontmatter object.
 * @param {string|null} newBodyContent The new body content (after frontmatter). 
 *                                     If null, existing body content is preserved.
 * @returns {string} The full new content written to the file.
 */
function updateFrontmatterAndContent(filePath, frontmatterObject, newBodyContent) {
  core.info(`Updating frontmatter (and potentially content) for: ${filePath}`);
  const currentFileContent = fs.readFileSync(filePath, 'utf8');
  let body = '';

  if (newBodyContent === null) {
    // Preserve existing content after frontmatter
    const match = currentFileContent.match(/^---\s*([\s\S]*?)\s*---([\s\S]*)$/);
    if (match && match[2]) {
      body = match[2].trimStart(); // .trimStart() to remove leading newline if any after ---
    } else {
      // No frontmatter found, or no content after it.
      // If there was no frontmatter, currentFileContent is the body.
      // This case needs care: if no frontmatter, should we prepend?
      // For this workflow, files are expected to have frontmatter if they are processed.
      // If a file somehow lost its frontmatter, this will effectively treat all its content as 'body'.
      body = currentFileContent.trimStart();
    }
  } else {
    body = newBodyContent.trimStart();
  }

  const newYamlFrontmatter = yaml.dump(frontmatterObject, { skipInvalid: true, lineWidth: -1 }).trim();
  const finalContent = `---
${newYamlFrontmatter}
---
${body}`; // Ensure a newline after --- if body is not empty, or if it is. YAML dump might handle this.

  fs.writeFileSync(filePath, finalContent, 'utf8');
  core.info(`Successfully updated file: ${filePath}`);
  return finalContent;
}


/**
 * Commits changes to the repository using Git CLI.
 * @param {string[]} filePaths Array of relative file paths (from repo root) to commit.
 * @param {string} message Commit message.
 * @param {string} gitUserName Git user name for the commit.
 * @param {string} gitUserEmail Git user email for the commit.
 * @param {boolean} ignoreFailures If true, will not throw an error on commit failure (used for error reporting commits).
 */
async function commitChanges(filePaths, message, gitUserName, gitUserEmail, ignoreFailures = false) {
  core.info(`Attempting to commit files: ${filePaths.join(', ')} with message: "${message}"`);

  try {
    // Configure git user
    await exec.exec('git', ['config', '--global', 'user.name', gitUserName]);
    await exec.exec('git', ['config', '--global', 'user.email', gitUserEmail]);

    // Add files
    // GITHUB_WORKSPACE is the root of the repository checkout
    const workspace = process.env.GITHUB_WORKSPACE || '.';
    for (const relativeFilePath of filePaths) {
      const absoluteFilePath = path.resolve(workspace, relativeFilePath);
      // Ensure file exists before trying to add it, especially for newly created files.
      if (fs.existsSync(absoluteFilePath)) {
         // Check if the file is already tracked and modified or if it's a new file
        let statusOutput = '';
        try {
            await exec.exec('git', ['status', '--porcelain', relativeFilePath], {
                listeners: { stdout: (data) => { statusOutput += data.toString(); } },
                silent: true // Don't output git status to the main log unless debugging
            });
        } catch (e) {
            core.warning(`Could not get git status for ${relativeFilePath}: ${e.message}. Proceeding to add.`);
        }

        // If statusOutput is empty, it might mean the file is not changed or not tracked.
        // If it's a new file, `git add` is needed. If modified, `git add` is also needed.
        // `git add --force` could be used but is generally not recommended.
        // A simple `git add` should work for new or modified files.
        core.info(`Adding file to git: ${relativeFilePath}`);
        await exec.exec('git', ['add', relativeFilePath]);
      } else {
        core.warning(`File ${relativeFilePath} (abs: ${absoluteFilePath}) not found for commit. Skipping add.`);
      }
    }

    // Check for changes to commit
    let statusOutput = '';
    await exec.exec('git', ['status', '--porcelain'], {
        listeners: { stdout: (data) => { statusOutput += data.toString(); } }
    });

    if (!statusOutput.trim()) {
        core.info('No changes to commit after adding files.');
        return true; // Nothing to commit
    }
    core.info('Git status before commit:
' + statusOutput);


    // Commit
    core.info('Committing changes...');
    await exec.exec('git', ['commit', '-m', message]);

    // Push changes
    // Assumes the GITHUB_TOKEN has push permissions and the runner is configured by actions/checkout
    // Need to know the current branch.
    const branch = github.context.ref.replace('refs/heads/', '');
    core.info(`Pushing changes to branch: ${branch}...`);
    await exec.exec('git', ['push', 'origin', branch]);

    core.info('Changes committed and pushed successfully.');
    return true;
  } catch (error) {
    core.error(`Failed to commit and push changes: ${error.message}
${error.stack}`);
    if (ignoreFailures) {
      core.warning(`Commit/push failed but ignoring due to ignoreFailures=true (message: ${message})`);
      return false;
    }
    throw error; // Re-throw to fail the action step
  }
}

module.exports = { getFrontmatter, updateFrontmatterAndContent, commitChanges };
