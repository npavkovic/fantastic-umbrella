import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHubClient } from './clients/github-client';
import { ResearchAction } from './actions/research-action';
import { DraftAction } from './actions/draft-action';
import { 
  WorkflowContext,
  PerplexityConfig,
  ClaudeConfig
} from './types';
import {
  getInput,
  logWithTimestamp,
  shouldProcessFile,
  parseChangedFiles
} from './utils/helpers';

/**
 * Main entry point for the GitHub Action
 */
async function run(): Promise<void> {
  try {
    logWithTimestamp('Starting Editorial Workflow GitHub Action');

    // Get configuration from inputs and environment
    const config = getConfiguration();
    const context = await buildWorkflowContext(config);

    // Initialize GitHub client
    const githubClient = new GitHubClient(config.github.token, config.github);

    // Determine which files to process
    const filesToProcess = await getFilesToProcess(context);
    
    if (filesToProcess.length === 0) {
      logWithTimestamp('No relevant files found to process');
      return;
    }

    logWithTimestamp(`Found ${filesToProcess.length} files to process`);

    // Process research files if Perplexity is configured
    if (config.perplexity) {
      const researchAction = new ResearchAction(githubClient, config.perplexity, context);
      const researchResults = await researchAction.execute();
      
      // Log results
      for (const result of researchResults) {
        if (result.success) {
          logWithTimestamp(`✅ Research: ${result.message}`);
        } else {
          logWithTimestamp(`❌ Research: ${result.message}`, 'error');
        }
      }
    } else {
      logWithTimestamp('Skipping research stage - Perplexity API key not configured', 'warn');
    }

    // Process draft files if Claude is configured
    if (config.claude) {
      const draftAction = new DraftAction(githubClient, config.claude, context);
      const draftResults = await draftAction.execute();
      
      // Log results
      for (const result of draftResults) {
        if (result.success) {
          logWithTimestamp(`✅ Draft: ${result.message}`);
        } else {
          logWithTimestamp(`❌ Draft: ${result.message}`, 'error');
        }
      }
    } else {
      logWithTimestamp('Skipping draft stage - Claude API key not configured', 'warn');
    }

    logWithTimestamp('Editorial Workflow GitHub Action completed successfully');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logWithTimestamp(`Editorial Workflow failed: ${errorMessage}`, 'error');
    core.setFailed(errorMessage);
  }
}

/**
 * Get configuration from GitHub Action inputs and environment variables
 */
function getConfiguration() {
  const githubToken = getInput('github-token', true) || process.env.GITHUB_TOKEN;
  const perplexityApiKey = getInput('perplexity-api-key') || process.env.PERPLEXITY_API_KEY;
  const claudeApiKey = getInput('claude-api-key') || process.env.CLAUDE_API_KEY;

  if (!githubToken) {
    throw new Error('GitHub token is required');
  }

  const config = {
    github: {
      token: githubToken,
      owner: getInput('github-owner', true) || github.context.repo.owner,
      repo: getInput('github-repo', true) || github.context.repo.repo,
      branch: getInput('github-branch') || 'main',
      contentDirBlog: getInput('content-dir-blog') || 'content/blog',
      contentDirResearch: getInput('content-dir-research') || 'content/research',
    },
    perplexity: perplexityApiKey ? {
      apiKey: perplexityApiKey,
      model: getInput('perplexity-model') || 'sonar-deep-research',
      temperature: parseFloat(getInput('perplexity-temperature') || '0.2'),
      maxTokens: parseInt(getInput('perplexity-max-tokens') || '7000', 10),
      searchDomains: getInput('perplexity-search-domains')?.split(',') || [
        '-reddit.com',
        '-pinterest.com',
        '-quora.com',
        '-medium.com',
        '-wikipedia.org'
      ],
    } as PerplexityConfig : undefined,
    claude: claudeApiKey ? {
      apiKey: claudeApiKey,
      model: getInput('claude-model') || 'claude-3-sonnet-20240229',
      temperature: parseFloat(getInput('claude-temperature') || '0.7'),
      maxTokens: parseInt(getInput('claude-max-tokens') || '4000', 10),
    } as ClaudeConfig : undefined,
  };

  return config;
}

/**
 * Build workflow context from GitHub event and configuration
 */
async function buildWorkflowContext(config: any): Promise<WorkflowContext> {
  const payload = github.context.payload;
  const eventName = github.context.eventName;
  
  // Get changed files from the event payload
  const changedFiles = parseChangedFiles(payload);
  
  const context: WorkflowContext = {
    github: config.github,
    perplexity: config.perplexity,
    claude: config.claude,
    changedFiles,
    eventType: eventName as 'push' | 'pull_request',
  };

  return context;
}

/**
 * Determine which files should be processed based on the context
 */
async function getFilesToProcess(context: WorkflowContext): Promise<string[]> {
  const filesToProcess: string[] = [];
  
  // If we have specific changed files from the event, use those
  if (context.changedFiles.length > 0) {
    for (const file of context.changedFiles) {
      const shouldProcess = shouldProcessFile(file, {
        research: context.github.contentDirResearch,
        blog: context.github.contentDirBlog,
      });
      
      if (shouldProcess.shouldProcess) {
        filesToProcess.push(file);
      }
    }
  }
  
  // If no specific files or this is a scheduled run, scan directories
  if (filesToProcess.length === 0) {
    logWithTimestamp('No specific changed files detected, scanning content directories');
    
    const githubClient = new GitHubClient(process.env.GITHUB_TOKEN || '', context.github);
    
    try {
      // Get all files from research directory
      const researchFiles = await githubClient.getDirectoryContents(context.github.contentDirResearch);
      filesToProcess.push(...researchFiles);
    } catch (error) {
      logWithTimestamp(`Could not scan research directory: ${error instanceof Error ? error.message : String(error)}`, 'warn');
    }
  }
  
  return filesToProcess;
}

// Run the action
if (require.main === module) {
  run();
}

export { run };
