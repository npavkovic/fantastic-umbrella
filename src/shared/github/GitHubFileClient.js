import matter from 'gray-matter';
import axios from 'axios';
import 'dotenv/config';
import { getFileSha } from './getFileSha.js';

export class GitHubFileClient {
  constructor(octokit, owner, repo, branch, config = {}) {
    this.octokit = octokit;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.config = {
      ...config,
      serverBaseUrl: process.env.SERVER_BASE_URL || 'http://localhost:8080'
    };
  }

  async readFile(filePath) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        ref: this.branch,
      });

      if (data.type !== 'file') {
        throw new Error(`Path ${filePath} is not a file.`);
      }

      const content = Buffer.from(data.content, 'base64').toString('utf8');
      return content;
    } catch (error) {
      const status = error.status || error.response?.status;
      const message = error.message || error.response?.data?.message;
      console.error(`Error reading file ${filePath}: ${status} ${message}`);
      throw error;
    }
  }

  async writeFile(filePath, content, { sha, message }) {
    // If sha is not provided, try to fetch it (for update); if not found, proceed without sha (for create)
    if (!sha) {
      try {
        sha = await getFileSha(this.octokit, this.owner, this.repo, this.branch, filePath);
      } catch (e) {
        // File does not exist, so this will be a create operation
        sha = undefined;
      }
    }
    try {
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: message,
        content: Buffer.from(content).toString('base64'),
        sha: sha,
        branch: this.branch,
      });
    } catch (error) {
      const status = error.status || error.response?.status;
      const message = error.message || error.response?.data?.message;
      console.error(`Error writing file ${filePath}: ${status} ${message}`);
      throw error;
    }
  }

  async createFile(filePath, content, { message }) {
    try {
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: message,
        content: Buffer.from(content).toString('base64'),
        branch: this.branch,
      });
    } catch (error) {
      const status = error.status || error.response?.status;
      const message = error.message || error.response?.data?.message;
      console.error(`Error creating file ${filePath}: ${status} ${message}`);
      throw error;
    }
  }

  async readJson(path) {
    const baseUrl = this.config.serverBaseUrl;
    try {
      const response = await axios.get(`${baseUrl}${path}`);
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      console.error(`Failed to fetch ${path}: ${status} ${statusText}`);
      return null;
    }
  }

  async updateYamlFrontMatter(filePath, updates, { message }) {
    const fileContent = await this.readFile(filePath);
    const { data: frontMatter, content } = matter(fileContent);

    // Apply updates
    for (const key in updates) {
      if (updates[key] === null) {
        delete frontMatter[key];
      } else {
        frontMatter[key] = updates[key];
      }
    }

    // Convert back to YAML using gray-matter's stringify
    const updatedFileContent = matter.stringify(content, frontMatter);

    // Update the file (sha will be handled automatically)
    await this.writeFile(filePath, updatedFileContent, { message });
  }
}
