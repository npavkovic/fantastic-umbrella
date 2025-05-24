export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  contentDirBlog: string;
  contentDirResearch: string;
}

export interface FrontMatter {
  title: string;
  status: string;
  date_researched?: string;
  date_drafted?: string;
  error_message?: string;
  blog_post_filePath?: string;
  research_brief_filePath?: string;
  draft_filePath?: string;
  tags?: string[];
  category?: string;
  [key: string]: any;
}

export interface FileContent {
  path: string;
  content: string;
  frontMatter: FrontMatter;
}

export interface ResearchResult {
  content: string;
  citations: string[];
}

export interface DraftResult {
  content: string;
} 