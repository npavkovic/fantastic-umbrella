import { Octokit } from '@octokit/rest';
import matter from 'gray-matter';
import { FrontMatter, FileContent, GitHubConfig } from '../types';

export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(token: string, config: GitHubConfig) {
    this.octokit = new Octokit({ auth: token });
    this.config = config;
  }

  /**
   * Get file content from GitHub repository
   */
  async getFileContent(filePath: string): Promise<FileContent> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: filePath,
        ref: this.config.branch,
      });

      if (Array.isArray(response.data) || !('content' in response.data)) {
        throw new Error(`Expected file but got directory or invalid response`);
      }

      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      const parsed = matter(content);

      return {
        path: filePath,
        content,
        frontMatter: parsed.data as FrontMatter,
        bodyContent: parsed.content,
        sha: response.data.sha,
      };
    } catch (error) {
      throw new Error(`Failed to get file content for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update file content in GitHub repository
   */
  async updateFile(
    filePath: string, 
    content: string, 
    message: string, 
    sha: string
  ): Promise<void> {
    try {
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: filePath,
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch: this.config.branch,
      });
    } catch (error) {
      throw new Error(`Failed to update file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new file in GitHub repository
   */
  async createFile(filePath: string, content: string, message: string): Promise<void> {
    try {
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: filePath,
        message,
        content: Buffer.from(content).toString('base64'),
        branch: this.config.branch,
      });
    } catch (error) {
      throw new Error(`Failed to create file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update YAML frontmatter while preserving the content
   */
  async updateFrontMatter(
    filePath: string,
    updates: Partial<FrontMatter>,
    commitMessage: string,
    sha: string,
    bodyContent: string
  ): Promise<void> {
    try {
      const fileContent = await this.getFileContent(filePath);
      const updatedFrontMatter = { ...fileContent.frontMatter, ...updates };
      
      // Serialize the frontmatter and content
      const newContent = matter.stringify(bodyContent, updatedFrontMatter);
      
      await this.updateFile(filePath, newContent, commitMessage, sha);
    } catch (error) {
      throw new Error(`Failed to update frontmatter for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a file exists in the repository
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: filePath,
        ref: this.config.branch,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of files in a directory
   */
  async getDirectoryContents(directoryPath: string): Promise<string[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: directoryPath,
        ref: this.config.branch,
      });

      if (!Array.isArray(response.data)) {
        throw new Error(`Expected directory but got file`);
      }

      return response.data
        .filter(item => item.type === 'file' && item.name.endsWith('.md'))
        .map(item => item.path);
    } catch (error) {
      throw new Error(`Failed to get directory contents for ${directoryPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
