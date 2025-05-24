// Core types for the editorial workflow
export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  contentDirBlog: string;
  contentDirResearch: string;
}

export interface FrontMatter {
  title: string;
  status: WorkflowStatus;
  date_researched?: string;
  date_drafted?: string;
  error_message?: string;
  blog_post_filePath?: string;
  research_brief_filePath?: string;
  draft_filePath?: string;
  tags?: string[];
  category?: string;
  author?: string;
  description?: string;
  [key: string]: any;
}

export interface FileContent {
  path: string;
  content: string;
  frontMatter: FrontMatter;
  bodyContent: string;
  sha: string;
}

export interface ResearchResult {
  content: string;
  citations: string[];
  summary: string;
}

export interface DraftResult {
  content: string;
  wordCount: number;
  title: string;
}

export type WorkflowStatus = 
  | 'Ready for Research'
  | 'Research In Progress'
  | 'Ready for Draft'
  | 'Draft In Progress'
  | 'Ready for Review'
  | 'Draft Complete'
  | 'Error'
  | 'Published';

export interface PerplexityConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  searchDomains?: string[];
}

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface WorkflowContext {
  github: GitHubConfig;
  perplexity?: PerplexityConfig;
  claude?: ClaudeConfig;
  changedFiles: string[];
  eventType: 'push' | 'pull_request';
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  filePath: string;
  newStatus?: WorkflowStatus;
  error?: Error;
}
