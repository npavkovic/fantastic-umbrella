import { Octokit } from '@octokit/rest';
import matter from 'gray-matter';
import { GitHubConfig, FrontMatter, FileContent } from '../types';

export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(token: string, config: GitHubConfig) {
    this.octokit = new Octokit({ auth: token });
    this.config = config;
  }

  async getFileContent(path: string): Promise<FileContent> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      });

      if ('content' in response.data) {
        const content = Buffer.from(response.data.content, 'base64').toString();
        const { data: frontMatter, content: bodyContent } = matter(content);
        return {
          path,
          content: bodyContent,
          frontMatter: frontMatter as FrontMatter,
        };
      }
      throw new Error(`File ${path} is not a file`);
    } catch (error) {
      console.error(`Error getting file content for ${path}:`, error);
      throw error;
    }
  }

  async updateFile(path: string, content: string, message: string): Promise<void> {
    try {
      const { data: existingFile } = await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      });

      if (!('sha' in existingFile)) {
        throw new Error(`File ${path} is not a file`);
      }

      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha: existingFile.sha,
        branch: this.config.branch,
      });
    } catch (error) {
      console.error(`Error updating file ${path}:`, error);
      throw error;
    }
  }

  async createFile(path: string, content: string, message: string): Promise<void> {
    try {
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch: this.config.branch,
      });
    } catch (error) {
      console.error(`Error creating file ${path}:`, error);
      throw error;
    }
  }

  async updateFrontMatter(path: string, updates: Partial<FrontMatter>, message: string): Promise<void> {
    try {
      const fileContent = await this.getFileContent(path);
      const updatedFrontMatter = { ...fileContent.frontMatter, ...updates };
      const updatedContent = matter.stringify(fileContent.content, updatedFrontMatter);
      await this.updateFile(path, updatedContent, message);
    } catch (error) {
      console.error(`Error updating front matter for ${path}:`, error);
      throw error;
    }
  }
} 