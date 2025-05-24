import { GitHubFileClient } from '../../shared/github/GitHubFileClient.js';
import { ClaudeClient } from '../../shared/claude/client.js';
import { draftwriterUserPrompt } from '../../shared/prompts/draftwriter-user.js';
import matter from 'gray-matter';
import slugify from 'slugify';
import { fetchJsonFromServer } from '../../shared/utils/fetchJsonFromServer.js';

export class GitDraftwriterCommand {
  constructor(octokit, githubConfig, claudeApiKey, commandOptions = {}) {
    this.octokit = octokit;
    this.githubConfig = githubConfig;
    this.claudeApiKey = claudeApiKey;
    this.options = commandOptions;

    this.githubClient = new GitHubFileClient(
      this.octokit,
      this.githubConfig.owner,
      this.githubConfig.repo,
      this.githubConfig.branch || 'main' // Default to main branch
    );

    this.claudeClient = new ClaudeClient(this.claudeApiKey);

    // Default Claude options, can be overridden by commandOptions
    this.claudeOptions = {
      model: commandOptions.model || 'claude-3-7-sonnet-20250219',
      temperature: commandOptions.temperature || 0.7,
      maxTokens: commandOptions.maxTokens || 4096,
      model: commandOptions.model || 'claude-3-opus-20240229', // Or your preferred default
      max_tokens: commandOptions.max_tokens || 4000, // Adjust as needed
      ...commandOptions.claude, // Allow specific claude overrides
    };
  }

  async execute() {
    console.log('Starting Git Draftwriter Command execution...');
    const briefsToProcess = [];

    if (this.options.researchFilePath) {
      console.log(`Processing single research file: ${this.options.researchFilePath}`);
      try {
        const fileContent = await this.githubClient.readFile(this.options.researchFilePath);
        const { frontMatter, bodyContent } = this._parseFileContent(fileContent);

        if (frontMatter && frontMatter.status === 'Ready for Draft') {
          // Generate blog post file path if not present
          const blogPostFilePath = frontMatter.blog_post_filePath || 
            `${this.githubConfig.contentDirBlog}/${slugify(frontMatter.title)}.md`;
          
          briefsToProcess.push({
            filePath: this.options.researchFilePath,
            title: frontMatter.title || 'Untitled Research',
            researchContent: bodyContent,
            originalBlogFilePath: blogPostFilePath,
            frontMatter: frontMatter,
          });
        } else {
          console.warn(`Skipping ${this.options.researchFilePath}: status is not 'Ready for Draft'. Found status: ${frontMatter ? frontMatter.status : 'N/A'}`);
        }
      } catch (error) {
        console.error(`Error reading or parsing single research file ${this.options.researchFilePath}:`, error);
      }
    } else {
      console.log(`Fetching candidate research briefs from ${this.githubConfig.researchJsonPath}`);
      try {
        const response = await fetchJsonFromServer(this.githubConfig.researchJsonPath);
        const candidates = response.entries || [];
        const readyForDraftCandidates = candidates.filter(
          (candidate) => candidate.status === 'Ready for Draft'
        );

        console.log(`Found ${readyForDraftCandidates.length} candidates marked 'Ready for Draft' in JSON.`);

        for (const candidate of readyForDraftCandidates) {
          if (!candidate.filePath || !candidate.title) {
            console.warn('Skipping candidate due to missing filePath or title:', candidate);
            continue;
          }
          try {
            console.log(`Verifying status for: ${candidate.filePath}`);
            const fileContent = await this.githubClient.readFile(candidate.filePath);
            const { data: frontMatter } = matter(fileContent);

            if (frontMatter && frontMatter.status === 'Ready for Draft') {
              briefsToProcess.push({ ...candidate, frontMatter });
              console.log(`Added ${candidate.filePath} to processing list.`);
            } else {
              console.log(`Skipping ${candidate.filePath}: status is not 'Ready for Draft' in file's front matter (found: ${frontMatter ? frontMatter.status : 'N/A'}).`);
            }
          } catch (fileError) {
            const status = fileError.status || fileError.response?.status;
            const message = fileError.message || fileError.response?.data?.message;
            console.error(`Error reading or parsing file ${candidate.filePath}: ${status} ${message}`);
          }
          if (this.options.singleItem && briefsToProcess.length > 0) {
            console.log('Processed single item as requested, stopping further candidate processing.');
            break;
          }
        }
      } catch (error) {
        const status = error.status || error.response?.status;
        const message = error.message || error.response?.data?.message;
        console.error(`Failed to fetch or process candidates from ${this.githubConfig.researchJsonPath}: ${status} ${message}`);
        return;
      }
    }

    if (briefsToProcess.length === 0) {
      console.log('No research briefs found to process.');
      return;
    }

    console.log(`Processing ${briefsToProcess.length} research briefs...`);
    for (const brief of briefsToProcess) {
      await this.processDraft(brief.filePath, brief.title, brief.researchContent, brief.originalBlogFilePath, brief.frontMatter);
    }
    console.log('Git Draftwriter Command execution finished.');
  }

  _parseFileContent(fileContent) {
    const { data: frontMatter, content: bodyContent } = matter(fileContent);
    return { frontMatter, bodyContent };
  }

  async processDraft(researchFilePath, researchFileTitle, researchContent, originalBlogFilePath, researchFileFrontMatter) {
    console.log(`Processing draft for: "${researchFileTitle}" based on research from ${researchFilePath}`);

    if (this.options.dryRun) {
      console.log(`[DRY RUN] Would process draft: "${researchFileTitle}"`);
      console.log(`[DRY RUN] Research file: ${researchFilePath}`);
      console.log(`[DRY RUN] Original blog file: ${originalBlogFilePath}`);
      return;
    }

    try {
      // 1. Update YAML status of researchFilePath to 'Draft In Progress'
      console.log(`Updating status to 'Draft In Progress' for ${researchFilePath}`);
      await this.githubClient.updateYamlFrontMatter(
        researchFilePath,
        { status: 'Draft In Progress' },
        { message: `WIP: Start drafting for ${researchFileTitle}` }
      );

      // 2. Call ClaudeClient.generateContent()
      console.log(`Generating draft content for "${researchFileTitle}" with Claude...`);
      const draftPrompt = draftwriterUserPrompt({ systemName: researchFileTitle, researchContent });
      const draftResult = await this.claudeClient.generateContent(
        draftPrompt,
        this.claudeOptions
      );

      // 3. Determine draftPath
      const draftSlug = slugify(researchFileTitle);
      const draftPath = `${this.githubConfig.contentDirDrafts}/${draftSlug}-draft.md`;
      console.log(`Draft will be saved to: ${draftPath}`);

      // 4. Prepare YAML and content for the draft
      const draftFrontMatter = {
        title: `Draft: ${researchFileTitle}`,
        original_title: researchFileTitle,
        research_brief_filePath: researchFilePath,
        blog_post_filePath: originalBlogFilePath,
        status: 'Ready for Review',
        date_drafted: new Date().toLocaleDateString('en-CA'),
        // Add any other relevant metadata from original front matter if needed
        ...(researchFileFrontMatter.tags && { tags: researchFileFrontMatter.tags }),
        ...(researchFileFrontMatter.category && { category: researchFileFrontMatter.category }),
      };
      const draftContent = matter.stringify(draftResult.content, draftFrontMatter);

      // 5. Create the draft file
      console.log(`Creating draft file: ${draftPath}`);
      await this.githubClient.createFile(
        draftPath,
        draftContent,
        { message: `Feat: Create draft for ${researchFileTitle}` }
      );

      // 6. Update YAML status of researchFilePath to 'Draft Complete'
      console.log(`Updating status to 'Draft Complete' for ${researchFilePath}`);
      await this.githubClient.updateYamlFrontMatter(
        researchFilePath,
        { status: 'Draft Complete', draft_filePath: draftPath },
        { message: `Done: Complete draft for ${researchFileTitle}, draft at ${draftPath}` }
      );

      // 7. Update YAML status of originalBlogFilePath to 'Draft Complete'
      if (originalBlogFilePath) {
        console.log(`Updating status to 'Draft Complete' for ${originalBlogFilePath}`);
        await this.githubClient.updateYamlFrontMatter(
          originalBlogFilePath,
          { status: 'Draft Complete', draft_filePath: draftPath },
          { message: `Done: Complete draft for ${researchFileTitle}, draft at ${draftPath}` }
        );
      }

      console.log(`Successfully processed draft for: "${researchFileTitle}"`);

    } catch (error) {
      const status = error.status || error.response?.status;
      const message = error.message || error.response?.data?.message;
      console.error(`Error processing draft for "${researchFileTitle}" (Research: ${researchFilePath}, Blog: ${originalBlogFilePath}): ${status} ${message}`);
      try {
        console.log(`Attempting to update status to 'Error' for relevant files.`);
        await this.githubClient.updateYamlFrontMatter(
          researchFilePath,
          { status: 'Error', error_message: `Drafting failed: ${error.message}` },
          { message: `Error: Drafting failed for ${researchFileTitle}` }
        );
        // For originalBlogFilePath, we need its SHA if we haven't fetched it.
        // If originalBlogFileSha is undefined (error happened before fetching), we might not be able to update it without fetching.
        // However, the most critical is the research file, so it can be picked up again.
        // We could revert researchFilePath to 'Ready for Draft' if it makes more sense.
        if (originalBlogFilePath) {
           const blogPostSha = await this.getFileSha(originalBlogFilePath); // Helper to get SHA
           if (blogPostSha) {
            await this.githubClient.updateYamlFrontMatter(
                originalBlogFilePath,
                { status: 'Error', error_message: `Drafting failed: ${error.message}` },
                { message: `Error: Drafting failed for blog post related to ${researchFileTitle}`, sha: blogPostSha }
            );
           } else {
             console.warn(`Could not get SHA for ${originalBlogFilePath} to update its status to Error.`);
           }

        }
      } catch (updateError) {
        const updateStatus = updateError.status || updateError.response?.status;
        const updateMessage = updateError.message || updateError.response?.data?.message;
        console.error(`Failed to update status to 'Error' after primary error: ${updateStatus} ${updateMessage}`);
      }
    }
  }

  async getFileSha(filePath) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.githubConfig.owner,
        repo: this.githubConfig.repo,
        path: filePath,
        ref: this.githubConfig.branch || 'main',
      });
      return data.sha;
    } catch (error) {
      // If the file doesn't exist or other error, we might not get a SHA
      console.warn(`Could not retrieve SHA for file ${filePath}:`, error.message);
      return null;
    }
  }
}
