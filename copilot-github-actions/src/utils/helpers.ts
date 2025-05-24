import * as core from '@actions/core';
import slugify from 'slugify';
import { FrontMatter, WorkflowStatus } from '../types';

/**
 * Safely get an environment variable or action input
 */
export function getInput(name: string, required: boolean = false): string {
  let value: string;
  
  // Try to get from GitHub Actions input first
  try {
    value = core.getInput(name);
  } catch {
    value = '';
  }
  
  // Fall back to environment variable
  if (!value) {
    value = process.env[name] || '';
  }
  
  if (required && !value) {
    throw new Error(`Required input '${name}' is missing`);
  }
  
  return value;
}

/**
 * Log a message with timestamp
 */
export function logWithTimestamp(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  switch (level) {
    case 'warn':
      core.warning(logMessage);
      console.warn(logMessage);
      break;
    case 'error':
      core.error(logMessage);
      console.error(logMessage);
      break;
    default:
      core.info(logMessage);
      console.log(logMessage);
  }
}

/**
 * Check if a file path should be processed based on its location
 */
export function shouldProcessFile(filePath: string, contentDirs: { research: string; blog: string }): {
  shouldProcess: boolean;
  type: 'research' | 'blog' | 'other';
} {
  if (filePath.startsWith(contentDirs.research) && filePath.endsWith('.md')) {
    return { shouldProcess: true, type: 'research' };
  }
  
  if (filePath.startsWith(contentDirs.blog) && filePath.endsWith('.md')) {
    return { shouldProcess: true, type: 'blog' };
  }
  
  return { shouldProcess: false, type: 'other' };
}

/**
 * Generate a slug from a title
 */
export function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });
}

/**
 * Generate file path for blog post based on title
 */
export function generateBlogPostPath(title: string, contentDir: string): string {
  const slug = generateSlug(title);
  return `${contentDir}/${slug}.md`;
}

/**
 * Create frontmatter for a new blog post
 */
export function createBlogPostFrontMatter(
  title: string,
  researchFilePath: string,
  status: WorkflowStatus = 'Ready for Review'
): FrontMatter {
  return {
    title,
    status,
    date_drafted: new Date().toISOString(),
    research_brief_filePath: researchFilePath,
    tags: [],
    category: '',
  };
}

/**
 * Update frontmatter with error information
 */
export function createErrorFrontMatter(
  currentFrontMatter: FrontMatter,
  error: Error
): FrontMatter {
  return {
    ...currentFrontMatter,
    status: 'Error' as WorkflowStatus,
    error_message: error.message,
  };
}

/**
 * Parse changed files from GitHub event payload
 */
export function parseChangedFiles(payload: any): string[] {
  const files: string[] = [];
  
  // Handle push events
  if (payload.commits) {
    for (const commit of payload.commits) {
      if (commit.added) files.push(...commit.added);
      if (commit.modified) files.push(...commit.modified);
    }
  }
  
  // Handle pull request events
  if (payload.pull_request && payload.pull_request.changed_files) {
    // Note: This would require additional API call to get actual changed files
    // For now, we'll rely on the workflow triggers to filter relevant paths
  }
  
  return [...new Set(files)]; // Remove duplicates
}

/**
 * Create a commit message for status updates
 */
export function createCommitMessage(
  action: string,
  title: string,
  oldStatus?: WorkflowStatus,
  newStatus?: WorkflowStatus
): string {
  let message = `${action}: ${title}`;
  
  if (oldStatus && newStatus) {
    message += ` (${oldStatus} → ${newStatus})`;
  } else if (newStatus) {
    message += ` (status: ${newStatus})`;
  }
  
  return message;
}

/**
 * Validate frontmatter has required fields
 */
export function validateFrontMatter(frontMatter: any): frontMatter is FrontMatter {
  return (
    typeof frontMatter === 'object' &&
    frontMatter !== null &&
    typeof frontMatter.title === 'string' &&
    typeof frontMatter.status === 'string'
  );
}

/**
 * Extract title from file content if not in frontmatter
 */
export function extractTitleFromContent(content: string, frontMatter: FrontMatter): string {
  if (frontMatter.title) {
    return frontMatter.title;
  }
  
  // Try to extract from first H1 heading
  const h1Match = content.match(/^#\s+(.+)/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  
  // Try to extract from filename
  const pathMatch = content.match(/(?:^|\/)([^/]+)\.md$/);
  if (pathMatch) {
    return pathMatch[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  return 'Untitled';
}

/**
 * Check if status transition is valid
 */
export function isValidStatusTransition(
  from: WorkflowStatus,
  to: WorkflowStatus
): boolean {
  const validTransitions: Record<WorkflowStatus, WorkflowStatus[]> = {
    'Ready for Research': ['Research In Progress', 'Error'],
    'Research In Progress': ['Ready for Draft', 'Error'],
    'Ready for Draft': ['Draft In Progress', 'Error'],
    'Draft In Progress': ['Ready for Review', 'Draft Complete', 'Error'],
    'Ready for Review': ['Published', 'Error'],
    'Draft Complete': ['Ready for Review', 'Error'],
    'Error': ['Ready for Research', 'Ready for Draft', 'Ready for Review'],
    'Published': []
  };
  
  return validTransitions[from]?.includes(to) || false;
}
