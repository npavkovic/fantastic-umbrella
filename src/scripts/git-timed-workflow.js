#!/usr/bin/env node
import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import { GitResearchCommand } from '../commands/git/GitResearchCommand.js';
import { GitDraftwriterCommand } from '../commands/git/GitDraftwriterCommand.js';

// --- Configuration Loading ---
const INTERVAL_MINUTES = parseInt(process.env.INTERVAL_MINUTES, 10) || 5;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

const commandOptions = {
  dryRun: process.env.DRY_RUN === 'true' || false,
  singleItem: process.env.SINGLE_ITEM === 'false' ? false : true, // Default true
  // Add other command-specific options from process.env if needed
  // e.g., model: process.env.MODEL_NAME
};

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const githubConfig = {
  owner: process.env.GITHUB_OWNER,
  repo: process.env.GITHUB_REPO,
  branch: process.env.GITHUB_BRANCH || 'main',
  blogJsonPath: process.env.GITHUB_BLOG_JSON_PATH || 'blog.json', // Example default
  researchJsonPath: process.env.GITHUB_RESEARCH_JSON_PATH || 'research.json', // Example default
  contentDirBlog: process.env.GITHUB_CONTENT_DIR_BLOG || 'content/blog', // Example default
  contentDirResearch: process.env.GITHUB_CONTENT_DIR_RESEARCH || 'content/research', // Example default
};

// --- Basic Validation ---
if (!GITHUB_TOKEN || !githubConfig.owner || !githubConfig.repo) {
  console.error('Error: Missing essential GitHub configuration (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO). Exiting.');
  process.exit(1);
}
if (!PERPLEXITY_API_KEY) {
  console.warn('Warning: Missing PERPLEXITY_API_KEY. GitResearchCommand may fail or operate in a limited capacity.');
}
if (!CLAUDE_API_KEY) {
  console.warn('Warning: Missing CLAUDE_API_KEY. GitDraftwriterCommand may fail or operate in a limited capacity.');
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// --- Logging ---
console.log('--- Git Timed Workflow ---');
console.log(`Target Repository: ${githubConfig.owner}/${githubConfig.repo} (Branch: ${githubConfig.branch})`);
console.log(`Interval: ${INTERVAL_MINUTES} minutes`);
console.log('Command Options:', commandOptions);
console.log('--------------------------');

let workflowIntervalId = null;
let isRunning = false; // To prevent concurrent runs if a cycle takes longer than the interval

// --- runGitWorkflow Function ---
async function runGitWorkflow() {
  if (isRunning) {
    console.log('Workflow cycle already in progress. Skipping this interval.');
    return;
  }
  isRunning = true;
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting workflow cycle...`);

  try {
    // 1. Research Stage
    if (PERPLEXITY_API_KEY) {
      console.log(`[${new Date().toISOString()}] --- Starting Research Stage ---`);
      const researchCommand = new GitResearchCommand(octokit, {
        ...githubConfig,
        blogJsonPath: githubConfig.researchJsonPath // Use research.json for the research command
      }, PERPLEXITY_API_KEY, commandOptions);
      await researchCommand.execute();
      console.log(`[${new Date().toISOString()}] --- Completed Research Stage ---`);
    } else {
      console.log(`[${new Date().toISOString()}] --- Skipping Research Stage (PERPLEXITY_API_KEY not set) ---`);
    }

    // 2. Draft Writing Stage
    if (CLAUDE_API_KEY) {
      console.log(`[${new Date().toISOString()}] --- Starting Draft Writing Stage ---`);
      const draftwriterCommand = new GitDraftwriterCommand(octokit, githubConfig, CLAUDE_API_KEY, commandOptions);
      await draftwriterCommand.execute();
      console.log(`[${new Date().toISOString()}] --- Completed Draft Writing Stage ---`);
    } else {
      console.log(`[${new Date().toISOString()}] --- Skipping Draft Writing Stage (CLAUDE_API_KEY not set) ---`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during workflow cycle:`, error);
  } finally {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // seconds
    console.log(`[${new Date().toISOString()}] Workflow cycle finished. Duration: ${duration.toFixed(2)}s.`);
    isRunning = false;
    const nextRunTime = new Date(Date.now() + INTERVAL_MS);
    console.log(`[${new Date().toISOString()}] Next workflow run scheduled for: ${nextRunTime.toISOString()}`);
  }
}

// --- Main Execution Logic ---
console.log(`[${new Date().toISOString()}] Initializing workflow. First run will start immediately.`);
runGitWorkflow(); // Run once immediately

workflowIntervalId = setInterval(runGitWorkflow, INTERVAL_MS);
console.log(`[${new Date().toISOString()}] Workflow scheduled to run every ${INTERVAL_MINUTES} minutes.`);

// --- Graceful Shutdown ---
function gracefulShutdown(signal) {
  console.log(`\n[${new Date().toISOString()}] Received ${signal}. Shutting down gracefully...`);
  if (workflowIntervalId) {
    clearInterval(workflowIntervalId);
    console.log(`[${new Date().toISOString()}] Cleared workflow interval.`);
  }
  // Add any other cleanup tasks here
  console.log(`[${new Date().toISOString()}] Exiting now.`);
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

console.log(`[${new Date().toISOString()}] Script setup complete. Waiting for scheduled runs or signals.`);
