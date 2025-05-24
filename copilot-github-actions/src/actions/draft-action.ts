import * as core from '@actions/core';
import { GitHubClient } from '../clients/github-client';
import { ClaudeClient } from '../clients/claude-client';
import { 
  WorkflowContext, 
  ProcessingResult, 
  FrontMatter, 
  ClaudeConfig 
} from '../types';
import {
  logWithTimestamp,
  createCommitMessage,
  createErrorFrontMatter,
  createBlogPostFrontMatter,
  generateBlogPostPath,
  isValidStatusTransition,
  extractTitleFromContent
} from '../utils/helpers';

export class DraftAction {
  private githubClient: GitHubClient;
  private claudeClient: ClaudeClient;
  private context: WorkflowContext;

  constructor(githubClient: GitHubClient, claudeConfig: ClaudeConfig, context: WorkflowContext) {
    this.githubClient = githubClient;
    this.claudeClient = new ClaudeClient(claudeConfig);
    this.context = context;
  }

  /**
   * Process research files that are ready for draft writing
   */
  async execute(): Promise<ProcessingResult[]> {
    logWithTimestamp('Starting draft action execution');
    const results: ProcessingResult[] = [];

    try {
      // Get all markdown files in the research directory
      const researchFiles = await this.githubClient.getDirectoryContents(
        this.context.github.contentDirResearch
      );

      // Filter for files that need draft writing
      const filesToProcess = await this.getFilesReadyForDraft(researchFiles);
      
      if (filesToProcess.length === 0) {
        logWithTimestamp('No files found ready for draft writing');
        return results;
      }

      logWithTimestamp(`Found ${filesToProcess.length} files ready for draft writing`);

      // Process each file
      for (const filePath of filesToProcess) {
        try {
          const result = await this.processDraftFile(filePath);
          results.push(result);
        } catch (error) {
          const errorResult: ProcessingResult = {
            success: false,
            message: `Failed to process ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
            filePath,
            error: error instanceof Error ? error : new Error(String(error))
          };
          results.push(errorResult);
          logWithTimestamp(errorResult.message, 'error');
        }
      }

      logWithTimestamp(`Draft action completed. Processed ${results.length} files`);
      return results;

    } catch (error) {
      const errorMessage = `Draft action failed: ${error instanceof Error ? error.message : String(error)}`;
      logWithTimestamp(errorMessage, 'error');
      core.setFailed(errorMessage);
      return results;
    }
  }

  /**
   * Get files that are ready for draft writing
   */
  private async getFilesReadyForDraft(filePaths: string[]): Promise<string[]> {
    const readyFiles: string[] = [];

    for (const filePath of filePaths) {
      try {
        const fileContent = await this.githubClient.getFileContent(filePath);
        
        if (fileContent.frontMatter.status === 'Ready for Draft') {
          readyFiles.push(filePath);
        }
      } catch (error) {
        logWithTimestamp(`Skipping ${filePath} due to error: ${error instanceof Error ? error.message : String(error)}`, 'warn');
      }
    }

    return readyFiles;
  }

  /**
   * Process a single research file for draft writing
   */
  private async processDraftFile(filePath: string): Promise<ProcessingResult> {
    logWithTimestamp(`Processing draft file: ${filePath}`);

    try {
      // Get current file content
      const fileContent = await this.githubClient.getFileContent(filePath);
      const title = extractTitleFromContent(fileContent.content, fileContent.frontMatter);

      // Validate status transition
      if (!isValidStatusTransition(fileContent.frontMatter.status, 'Draft In Progress')) {
        throw new Error(`Invalid status transition from ${fileContent.frontMatter.status} to Draft In Progress`);
      }

      // Update status to "Draft In Progress"
      await this.updateFileStatus(
        fileContent,
        'Draft In Progress',
        `Start draft writing for ${title}`,
        filePath
      );

      logWithTimestamp(`Updated status to "Draft In Progress" for: ${title}`);

      // Generate draft content
      const draftResult = await this.claudeClient.generateDraft(
        title,
        fileContent.bodyContent,
        fileContent.frontMatter.category // Optional target audience
      );

      // Create blog post file
      const blogPostPath = fileContent.frontMatter.blog_post_filePath || 
        generateBlogPostPath(title, this.context.github.contentDirBlog);

      const blogPostFrontMatter = createBlogPostFrontMatter(title, filePath);
      const blogPostContent = this.buildBlogPostContent(blogPostFrontMatter, draftResult.content);

      // Create the blog post file
      await this.githubClient.createFile(
        blogPostPath,
        blogPostContent,
        createCommitMessage('Create draft', title, undefined, 'Ready for Review')
      );

      // Update original research file status
      const updatedFrontMatter: Partial<FrontMatter> = {
        status: 'Draft Complete',
        date_drafted: new Date().toISOString(),
        blog_post_filePath: blogPostPath,
      };

      await this.githubClient.updateFrontMatter(
        filePath,
        updatedFrontMatter,
        createCommitMessage('Complete draft', title, 'Draft In Progress', 'Draft Complete'),
        fileContent.sha,
        fileContent.bodyContent
      );

      logWithTimestamp(`Draft completed for: ${title} -> ${blogPostPath}`);

      return {
        success: true,
        message: `Draft created successfully for ${title} at ${blogPostPath}`,
        filePath,
        newStatus: 'Draft Complete'
      };

    } catch (error) {
      // Handle error by updating the file status
      await this.handleDraftError(filePath, error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        message: `Draft failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        filePath,
        newStatus: 'Error',
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Update file status
   */
  private async updateFileStatus(
    fileContent: { frontMatter: FrontMatter; sha: string; bodyContent: string },
    newStatus: 'Draft In Progress' | 'Draft Complete' | 'Error',
    commitMessage: string,
    filePath: string
  ): Promise<void> {
    const updatedFrontMatter: Partial<FrontMatter> = {
      status: newStatus,
    };
    
    await this.githubClient.updateFrontMatter(
      filePath,
      updatedFrontMatter,
      commitMessage,
      fileContent.sha,
      fileContent.bodyContent
    );
  }

  /**
   * Build blog post content with frontmatter
   */
  private buildBlogPostContent(frontMatter: FrontMatter, content: string): string {
    const yaml = require('js-yaml');
    const frontMatterString = yaml.dump(frontMatter);
    return `---\n${frontMatterString}---\n\n${content}`;
  }

  /**
   * Handle draft errors by updating file status
   */
  private async handleDraftError(filePath: string, error: Error): Promise<void> {
    try {
      const fileContent = await this.githubClient.getFileContent(filePath);
      const errorFrontMatter = createErrorFrontMatter(fileContent.frontMatter, error);
      
      await this.githubClient.updateFrontMatter(
        filePath,
        errorFrontMatter,
        `Draft error: ${error.message}`,
        fileContent.sha,
        fileContent.bodyContent
      );
      
      logWithTimestamp(`Updated file status to Error: ${filePath}`, 'error');
    } catch (updateError) {
      logWithTimestamp(`Failed to update error status for ${filePath}: ${updateError instanceof Error ? updateError.message : String(updateError)}`, 'error');
    }
  }
}
