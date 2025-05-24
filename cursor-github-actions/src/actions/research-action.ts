import { GitHubClient } from '../utils/github-client';
import { GitHubConfig, ResearchResult } from '../types';
import matter from 'gray-matter';
import slugify from 'slugify';

async function researchTopic(title: string): Promise<ResearchResult> {
  // TODO: Implement Perplexity API integration
  // This is a placeholder that should be replaced with actual Perplexity API calls
  return {
    content: `Research content for ${title}`,
    citations: ['Citation 1', 'Citation 2'],
  };
}

async function main() {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is required');
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

    // Filter for research files
    const researchFiles = allFiles.filter(file => 
      file.startsWith(config.contentDirResearch) && file.endsWith('.md')
    );

    for (const filePath of researchFiles) {
      try {
        const fileContent = await githubClient.getFileContent(filePath);
        
        if (fileContent.frontMatter.status !== 'Ready for Research') {
          console.log(`Skipping ${filePath}: status is not 'Ready for Research'`);
          continue;
        }

        // Update status to 'Research In Progress'
        await githubClient.updateFrontMatter(
          filePath,
          { status: 'Research In Progress' },
          `WIP: Start research for ${fileContent.frontMatter.title}`
        );

        // Perform research
        const researchResult = await researchTopic(fileContent.frontMatter.title);

        // Prepare updated content
        const enhancedContent = `${researchResult.content}\n\n## Sources\n${researchResult.citations.map((citation, index) => `${index + 1}. ${citation}`).join('\n')}`;
        const updatedFrontMatter = {
          ...fileContent.frontMatter,
          status: 'Ready for Draft',
          date_researched: new Date().toLocaleDateString('en-CA'),
        };

        // Update the file
        const updatedContent = matter.stringify(enhancedContent, updatedFrontMatter);
        await githubClient.updateFile(
          filePath,
          updatedContent,
          `Update research for ${fileContent.frontMatter.title}`
        );

        console.log(`Successfully processed research for ${fileContent.frontMatter.title}`);
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
        try {
          await githubClient.updateFrontMatter(
            filePath,
            { 
              status: 'Error',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            },
            `Error: Research failed for ${filePath}`
          );
        } catch (updateError) {
          console.error(`Failed to update error status for ${filePath}:`, updateError);
        }
      }
    }
  } catch (error) {
    console.error('Fatal error in research action:', error);
    process.exit(1);
  }
}

main(); 