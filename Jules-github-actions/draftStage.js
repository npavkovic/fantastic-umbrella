// Jules-github-actions/draftStage.js
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
// Using the same placeholder file/git utilities
const { getFrontmatter, updateFrontmatterAndContent, commitChanges } = require('./fileUtils');

async function draftStage(filePath, octokit, claudeApiKey, gitUserName, gitUserEmail, contentDir) {
  core.info(`DRAFT STAGE: Starting for file ${filePath}`);
  try {
    const researchFileName = path.basename(filePath);
    let researchFileContent = fs.readFileSync(filePath, 'utf8');
    let researchFrontmatter = getFrontmatter(researchFileContent);

    if (researchFrontmatter.status !== 'Ready for Draft') {
      core.info(`DRAFT STAGE: File ${researchFileName} is not 'Ready for Draft'. Current status: ${researchFrontmatter.status}. Skipping.`);
      return false;
    }

    // 1. Update research file status to "Draft In Progress" and commit
    core.info(`DRAFT STAGE: Updating status to 'Draft In Progress' for ${researchFileName}`);
    researchFrontmatter.status = 'Draft In Progress';
    researchFileContent = updateFrontmatterAndContent(filePath, researchFrontmatter, null); // Update local file
    
    const repoRelativeResearchFilePath = path.relative(process.env.GITHUB_WORKSPACE || '.', filePath);
    await commitChanges(octokit, [repoRelativeResearchFilePath], `Status: 'Draft In Progress' for ${researchFileName}`, gitUserName, gitUserEmail);
    core.info(`DRAFT STAGE: Committed 'Draft In Progress' status for ${researchFileName}`);

    // 2. Simulate Claude AI call to generate blog post
    core.info(`DRAFT STAGE: Simulating Claude AI call for ${researchFileName}...`);
    // In a real scenario, use claudeApiKey and content from researchFileContent
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    const blogPostContent = `---
title: "Draft: ${researchFrontmatter.title || 'Untitled Post'}"
date: ${new Date().toISOString()}
status: "Ready for Review"
original_research_file: "${researchFileName}"
---

## Introduction (Simulated from Claude AI)
This is the introduction to the blog post based on the research for "${researchFrontmatter.title || 'Untitled Post'}".

## Main Body (Simulated from Claude AI)
Here's the main content, discussing the findings and expanding on the research points.
The research summary was: ${researchFrontmatter.research_summary || "N/A"}

## Conclusion (Simulated from Claude AI)
This concludes the draft. It's now ready for review.
`;
    core.info(`DRAFT STAGE: Simulated blog post generation complete for ${researchFileName}.`);

    // 3. Create new draft file
    //    Draft file name: draft-original-filename.md (or similar)
    //    It should be placed in the same directory as the original file, or a specified 'drafts' subdirectory.
    //    For simplicity, let's place it alongside the original, prefixed with "draft-".
    const draftFileName = `draft-${researchFileName}`;
    const draftFilePath = path.join(path.dirname(filePath), draftFileName);
    core.info(`DRAFT STAGE: Creating new draft file: ${draftFilePath}`);
    fs.writeFileSync(draftFilePath, blogPostContent, 'utf8');
    core.info(`DRAFT STAGE: Successfully wrote draft file ${draftFileName}`);


    // 4. Update original research file status to "Draft Complete"
    core.info(`DRAFT STAGE: Updating status to 'Draft Complete' for research file ${researchFileName}`);
    researchFrontmatter.status = 'Draft Complete';
    researchFrontmatter.draft_created_at = new Date().toISOString();
    researchFrontmatter.draft_file = draftFileName; // Link to the draft file
    researchFileContent = updateFrontmatterAndContent(filePath, researchFrontmatter, null); // Update local file

    // 5. Commit both new draft file and updated original research file
    const repoRelativeDraftFilePath = path.relative(process.env.GITHUB_WORKSPACE || '.', draftFilePath);
    await commitChanges(
      octokit,
      [repoRelativeResearchFilePath, repoRelativeDraftFilePath], // Commit both files
      `Status: 'Draft Complete' for ${researchFileName} & created draft ${draftFileName}`,
      gitUserName,
      gitUserEmail
    );
    core.info(`DRAFT STAGE: Committed draft creation and status update for ${researchFileName}.`);
    core.info(`DRAFT STAGE: Successfully completed for ${researchFileName}`);
    return true;

  } catch (error) {
    core.error(`DRAFT STAGE: Error processing ${filePath}: ${error.message}
${error.stack}`);
    core.setFailed(`Draft stage failed for ${filePath}: ${error.message}`);
    // Attempt to update status to Error
    try {
        const researchFileName = path.basename(filePath);
        let researchFileContent = fs.readFileSync(filePath, 'utf8');
        let researchFrontmatter = getFrontmatter(researchFileContent);
        researchFrontmatter.status = 'Draft Error';
        researchFrontmatter.error_message = error.message;
        updateFrontmatterAndContent(filePath, researchFrontmatter, null); // Update locally
        const repoRelativeResearchFilePath = path.relative(process.env.GITHUB_WORKSPACE || '.', filePath);
        await commitChanges(octokit, [repoRelativeResearchFilePath], `Status: 'Draft Error' for ${researchFileName}`, gitUserName, gitUserEmail, true);
        core.warning(`DRAFT STAGE: Updated status to 'Draft Error' for ${researchFileName}`);
    } catch (commitError) {
        core.error(`DRAFT STAGE: Failed to commit error status for ${filePath}: ${commitError.message}`);
    }
    return false;
  }
}

module.exports = { draftStage };
