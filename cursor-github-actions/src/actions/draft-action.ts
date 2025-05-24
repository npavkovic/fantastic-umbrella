import { GitHubClient } from '../utils/github-client';
import { GitHubConfig, DraftResult } from '../types';
import matter from 'gray-matter';
import slugify from 'slugify';

async function generateDraft(title: string, researchContent: string): Promise<DraftResult> {
  // TODO: Implement Claude API integration
  // This is a placeholder that should be replaced with actual Claude API calls
  return {
    content: `Draft content for ${title} based on research:\n\n${researchContent}`,
  };
}

async function main() {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const claudeApiKey = process.env.CLAUDE_API_KEY;

    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }
    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEY is required');
    }

    const config: GitHubConfig = {
      owner: process.env.GITHUB_REPOSITORY_OWNER || '',
      repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || '',
      branch: process.env.GITHUB_REF?.replace('refs/heads/', '') || 'main',
      contentDirBlog: 'content/blog',
      contentDirResearch: 'content/research',
    };

    const githubClient = new GitHubClient(githubToken, config);

    // Get the list of modified files from the event
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      throw new Error('GITHUB_EVENT_PATH is required');
    }

    const event = require(eventPath);
    const modifiedFiles = event.head_commit?.modified || [];
    const addedFiles = event.head_commit?.added || [];
    const allFiles = [...modifiedFiles, ...addedFiles];

    // Filter for blog files
    const blogFiles = allFiles.filter(file => 
      file.startsWith(config.contentDirBlog) && file.endsWith('.md')
    );

    for (const filePath of blogFiles) {
      try {
        const fileContent = await githubClient.getFileContent(filePath);
        
        if (fileContent.frontMatter.status !== 'Ready for Draft') {
          console.log(`Skipping ${filePath}: status is not 'Ready for Draft'`);
          continue;
        }

        // Update status to 'Draft In Progress'
        await githubClient.updateFrontMatter(
          filePath,
          { status: 'Draft In Progress' },
          `WIP: Start drafting for ${fileContent.frontMatter.title}`
        );

        // Generate draft content
        const draftResult = await generateDraft(
          fileContent.frontMatter.title,
          fileContent.content
        );

        // Create draft file
        const draftSlug = slugify(fileContent.frontMatter.title);
        const draftPath = `${config.contentDirBlog}/${draftSlug}-draft.md`;
        
        const draftFrontMatter = {
          title: `Draft: ${fileContent.frontMatter.title}`,
          original_title: fileContent.frontMatter.title,
          research_brief_filePath: filePath,
          blog_post_filePath: filePath,
          status: 'Ready for Review',
          date_drafted: new Date().toLocaleDateString('en-CA'),
          ...(fileContent.frontMatter.tags && { tags: fileContent.frontMatter.tags }),
          ...(fileContent.frontMatter.category && { category: fileContent.frontMatter.category }),
        };

        const draftContent = matter.stringify(draftResult.content, draftFrontMatter);
        await githubClient.createFile(
          draftPath,
          draftContent,
          `Feat: Create draft for ${fileContent.frontMatter.title}`
        );

        // Update original file status
        await githubClient.updateFrontMatter(
          filePath,
          { 
            status: 'Draft Complete',
            draft_filePath: draftPath
          },
          `Done: Complete draft for ${fileContent.frontMatter.title}, draft at ${draftPath}`
        );

        console.log(`Successfully processed draft for ${fileContent.frontMatter.title}`);
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
        try {
          await githubClient.updateFrontMatter(
            filePath,
            { 
              status: 'Error',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            },
            `Error: Drafting failed for ${filePath}`
          );
        } catch (updateError) {
          console.error(`Failed to update error status for ${filePath}:`, updateError);
        }
      }
    }
  } catch (error) {
    console.error('Fatal error in draft action:', error);
    process.exit(1);
  }
}

main(); 