import * as core from '@actions/core';
import { GitHubClient } from '../clients/github-client';
import { PerplexityClient } from '../clients/perplexity-client';
import { 
  WorkflowContext, 
  ProcessingResult, 
  FrontMatter, 
  PerplexityConfig 
} from '../types';
import {
  logWithTimestamp,
  createCommitMessage,
  createErrorFrontMatter,
  isValidStatusTransition,
  extractTitleFromContent
} from '../utils/helpers';

export class ResearchAction {
  private githubClient: GitHubClient;
  private perplexityClient: PerplexityClient;
  private context: WorkflowContext;

  constructor(githubClient: GitHubClient, perplexityConfig: PerplexityConfig, context: WorkflowContext) {
    this.githubClient = githubClient;
    this.perplexityClient = new PerplexityClient(perplexityConfig);
    this.context = context;
  }

  /**
   * Process research files that are ready for research
   */
  async execute(): Promise<ProcessingResult[]> {
    logWithTimestamp('Starting research action execution');
    const results: ProcessingResult[] = [];

    try {
      // Get all markdown files in the research directory
      const researchFiles = await this.githubClient.getDirectoryContents(
        this.context.github.contentDirResearch
      );

      // Filter for files that need research
      const filesToProcess = await this.getFilesReadyForResearch(researchFiles);
      
      if (filesToProcess.length === 0) {
        logWithTimestamp('No files found ready for research');
        return results;
      }

      logWithTimestamp(`Found ${filesToProcess.length} files ready for research`);

      // Process each file
      for (const filePath of filesToProcess) {
        try {
          const result = await this.processResearchFile(filePath);
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

      logWithTimestamp(`Research action completed. Processed ${results.length} files`);
      return results;

    } catch (error) {
      const errorMessage = `Research action failed: ${error instanceof Error ? error.message : String(error)}`;
      logWithTimestamp(errorMessage, 'error');
      core.setFailed(errorMessage);
      return results;
    }
  }

  /**
   * Get files that are ready for research
   */
  private async getFilesReadyForResearch(filePaths: string[]): Promise<string[]> {
    const readyFiles: string[] = [];

    for (const filePath of filePaths) {
      try {
        const fileContent = await this.githubClient.getFileContent(filePath);
        
        if (fileContent.frontMatter.status === 'Ready for Research') {
          readyFiles.push(filePath);
        }
      } catch (error) {
        logWithTimestamp(`Skipping ${filePath} due to error: ${error instanceof Error ? error.message : String(error)}`, 'warn');
      }
    }

    return readyFiles;
  }

  /**
   * Process a single research file
   */
  private async processResearchFile(filePath: string): Promise<ProcessingResult> {
    logWithTimestamp(`Processing research file: ${filePath}`);

    try {
      // Get current file content
      const fileContent = await this.githubClient.getFileContent(filePath);
      const title = extractTitleFromContent(fileContent.content, fileContent.frontMatter);

      // Validate status transition
      if (!isValidStatusTransition(fileContent.frontMatter.status, 'Research In Progress')) {
        throw new Error(`Invalid status transition from ${fileContent.frontMatter.status} to Research In Progress`);
      }

      // Update status to "Research In Progress"
      await this.updateFileStatus(
        fileContent,
        'Research In Progress',
        `Start research for ${title}`,
        filePath
      );

      logWithTimestamp(`Updated status to "Research In Progress" for: ${title}`);

      // Generate research content
      const researchResult = await this.perplexityClient.generateResearch(
        title,
        fileContent.bodyContent
      );

      // Update file with research content and new status
      const updatedContent = this.buildUpdatedContent(
        fileContent.bodyContent,
        researchResult.content
      );

      const updatedFrontMatter: Partial<FrontMatter> = {
        status: 'Ready for Draft',
        date_researched: new Date().toISOString(),
      };

      await this.githubClient.updateFrontMatter(
        filePath,
        updatedFrontMatter,
        createCommitMessage('Complete research', title, 'Research In Progress', 'Ready for Draft'),
        fileContent.sha,
        updatedContent
      );

      logWithTimestamp(`Research completed for: ${title}`);

      return {
        success: true,
        message: `Research completed successfully for ${title}`,
        filePath,
        newStatus: 'Ready for Draft'
      };

    } catch (error) {
      // Handle error by updating the file status
      await this.handleResearchError(filePath, error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        message: `Research failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
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
    newStatus: 'Research In Progress' | 'Ready for Draft' | 'Error',
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
   * Build updated content with research
   */
  private buildUpdatedContent(originalContent: string, researchContent: string): string {
    // Add research section to the content
    const researchSection = `\n\n## Research\n\n${researchContent}\n`;
    
    // If there's already a research section, replace it
    if (originalContent.includes('## Research')) {
      return originalContent.replace(
        /## Research[\s\S]*?(?=\n## |$)/,
        researchSection.trim()
      );
    }
    
    // Otherwise, append it
    return originalContent + researchSection;
  }

  /**
   * Handle research errors by updating file status
   */
  private async handleResearchError(filePath: string, error: Error): Promise<void> {
    try {
      const fileContent = await this.githubClient.getFileContent(filePath);
      const errorFrontMatter = createErrorFrontMatter(fileContent.frontMatter, error);
      
      await this.githubClient.updateFrontMatter(
        filePath,
        errorFrontMatter,
        `Research error: ${error.message}`,
        fileContent.sha,
        fileContent.bodyContent
      );
      
      logWithTimestamp(`Updated file status to Error: ${filePath}`, 'error');
    } catch (updateError) {
      logWithTimestamp(`Failed to update error status for ${filePath}: ${updateError instanceof Error ? updateError.message : String(updateError)}`, 'error');
    }
  }
}
