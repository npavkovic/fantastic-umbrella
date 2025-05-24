// Jules-github-actions/researchStage.js
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
// Placeholder for actual file/git utilities - will be implemented in Step 5
const { getFrontmatter, updateFrontmatterAndContent, commitChanges } = require('./fileUtils'); 

async function researchStage(filePath, octokit, perplexityApiKey, gitUserName, gitUserEmail, contentDir) {
  core.info(`RESEARCH STAGE: Starting for file ${filePath}`);
  try {
    const fileName = path.basename(filePath);
    let fileContent = fs.readFileSync(filePath, 'utf8');
    let frontmatter = getFrontmatter(fileContent); // Assumes getFrontmatter is robust (from Step 5)

    if (frontmatter.status !== 'Ready for Research') {
      core.info(`RESEARCH STAGE: File ${fileName} is not in 'Ready for Research' status. Current status: ${frontmatter.status}. Skipping.`);
      return false; // Not an error, but nothing to do for this stage
    }

    // 1. Update status to "Research In Progress" and commit
    core.info(`RESEARCH STAGE: Updating status to 'Research In Progress' for ${fileName}`);
    frontmatter.status = 'Research In Progress';
    // updateFrontmatterAndContent will update the local file.
    fileContent = updateFrontmatterAndContent(filePath, frontmatter, null); // null for content means only update frontmatter
    
    // Commit this status change
    // The commit message should be specific to the change.
    // The relative path from repo root is needed for commitChanges.
    const repoRelativePath = path.relative(process.env.GITHUB_WORKSPACE || '.', filePath);
    await commitChanges(octokit, [repoRelativePath], `Status: 'Research In Progress' for ${fileName}`, gitUserName, gitUserEmail);
    core.info(`RESEARCH STAGE: Committed 'Research In Progress' status for ${fileName}`);

    // 2. Simulate Perplexity AI call
    core.info(`RESEARCH STAGE: Simulating Perplexity AI call for ${fileName}...`);
    // In a real scenario, make API call using perplexityApiKey
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    const researchData = {
      summary: "This is a simulated summary of research findings for the topic: " + (frontmatter.title || "Untitled Topic"),
      citations: [
        { source: "Simulated Source 1", url: "http://example.com/source1" },
        { source: "Simulated Source 2", url: "http://example.com/source2" }
      ]
    };
    core.info(`RESEARCH STAGE: Simulated research complete for ${fileName}.`);

    // 3. Add research content and citations to the file
    //    This is a simplistic way to add content. A real implementation might involve more complex content manipulation.
    let newFileContent = fileContent; // content already updated by updateFrontmatterAndContent
    const researchBlock = `

## Research Findings

${researchData.summary}

### Citations
${researchData.citations.map(c => `- [${c.source}](${c.url})`).join('
')}
`;
    
    // We need to get the content part, excluding the frontmatter, to append to.
    // Or, more robustly, the updateFrontmatterAndContent function should handle adding content after frontmatter.
    // For now, let's assume updateFrontmatterAndContent can take new body content.

    // Re-read the file to ensure we have the latest version after the first commit.
    // OR, ensure updateFrontmatterAndContent returns the full new content.
    // For simplicity here, we'll assume the 'fileContent' variable has been correctly updated by the first call.
    // And the next call to updateFrontmatterAndContent will correctly place the new body.
    
    // 4. Update status to "Ready for Draft"
    core.info(`RESEARCH STAGE: Updating status to 'Ready for Draft' for ${fileName}`);
    frontmatter.status = 'Ready for Draft';
    frontmatter.research_completed_at = new Date().toISOString();
    // The 'researchBlock' will be appended after the frontmatter and existing content (if any post-frontmatter)
    // This requires `updateFrontmatterAndContent` to be smart.
    // A simpler model for `updateFrontmatterAndContent` might be:
    // updateFrontmatterAndContent(filePath, frontmatterObject, newBodyString)
    // where newBodyString replaces everything after the frontmatter.
    // Let's refine the placeholder `updateFrontmatterAndContent` to accept new body content.
    // For now, we'll assume it just updates the frontmatter and we manually construct the body.

    const currentBody = fileContent.split('---').slice(2).join('---').trim();
    const finalNewBody = currentBody + researchBlock;
    
    fileContent = updateFrontmatterAndContent(filePath, frontmatter, finalNewBody); // This updates the local file

    // Commit changes
    await commitChanges(octokit, [repoRelativePath], `Status: 'Ready for Draft' and research added for ${fileName}`, gitUserName, gitUserEmail);
    core.info(`RESEARCH STAGE: Committed 'Ready for Draft' status and research for ${fileName}`);
    core.info(`RESEARCH STAGE: Successfully completed for ${fileName}`);
    return true;

  } catch (error) {
    core.error(`RESEARCH STAGE: Error processing ${filePath}: ${error.message}
${error.stack}`);
    // Optionally, update status to "Error" in frontmatter and commit that.
    // For now, just fail the action step.
    core.setFailed(`Research stage failed for ${filePath}: ${error.message}`);
    // Attempt to update status to Error
    try {
        const fileName = path.basename(filePath);
        let fileContent = fs.readFileSync(filePath, 'utf8');
        let frontmatter = getFrontmatter(fileContent);
        frontmatter.status = 'Research Error';
        frontmatter.error_message = error.message;
        updateFrontmatterAndContent(filePath, frontmatter, null); // Update locally
        const repoRelativePath = path.relative(process.env.GITHUB_WORKSPACE || '.', filePath);
        await commitChanges(octokit, [repoRelativePath], `Status: 'Research Error' for ${fileName}`, gitUserName, gitUserEmail, true); // last param to ignore further errors during error reporting
        core.warning(`RESEARCH STAGE: Updated status to 'Research Error' for ${fileName}`);
    } catch (commitError) {
        core.error(`RESEARCH STAGE: Failed to commit error status for ${filePath}: ${commitError.message}`);
    }
    return false;
  }
}

module.exports = { researchStage };
