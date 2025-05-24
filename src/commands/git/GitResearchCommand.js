import { GitHubFileClient } from '../../shared/github/GitHubFileClient.js';
import { PerplexityClient } from '../../shared/perplexity/client.js';
import { productivityPrompt } from '../../shared/prompts/productivity.js';
import matter from 'gray-matter';
import slugify from 'slugify';
import { fetchJsonFromServer } from '../../shared/utils/fetchJsonFromServer.js';

export class GitResearchCommand {
  constructor(octokit, githubConfig, perplexityApiKey, commandOptions = {}) {
    this.octokit = octokit;
    this.githubConfig = githubConfig;
    this.perplexityApiKey = perplexityApiKey;
    this.options = commandOptions;

    this.githubClient = new GitHubFileClient(
      this.octokit,
      this.githubConfig.owner,
      this.githubConfig.repo,
      this.githubConfig.branch || 'main' // Default to main branch
    );

    this.perplexityClient = new PerplexityClient(this.perplexityApiKey);

    // Default Perplexity options, can be overridden by commandOptions
    this.perplexityOptions = {
      model: commandOptions.model || 'sonar-deep-research',
      temperature: commandOptions.temperature || 0.2,
      maxTokens: commandOptions.maxTokens || 7000,
      contextSize: commandOptions.contextSize || 'high',
      searchDomains: commandOptions.searchDomains || [
        "-reddit.com",
        "-pinterest.com",
        "-quora.com",
        "-medium.com",
        "-wikipedia.org"
      ],
      ...commandOptions.perplexity, // Allow specific perplexity overrides
    };
  }

  async execute() {
    console.log('Starting Git Research Command execution...');
    const topicsToProcess = [];

    if (this.options.topicFilePath) {
      console.log(`Processing single topic from file: ${this.options.topicFilePath}`);
      try {
        const fileContent = await this.githubClient.getFileContent(this.options.topicFilePath);
        const { data: frontMatter } = matter(fileContent);
        
        if (frontMatter && frontMatter.title) {
          topicsToProcess.push({ filePath: this.options.topicFilePath, title: frontMatter.title, frontMatter });
        } else {
          console.warn(`Skipping ${this.options.topicFilePath}: missing title in front matter`);
        }
      } catch (error) {
        console.error(`Error reading or parsing single topic file ${this.options.topicFilePath}:`, error);
        // Optionally, re-throw or handle as a fatal error for single file processing
      }
    } else if (this.options.topicsJsonPath) {
      const jsonContent = await this.githubClient.getFileContent(this.options.topicsJsonPath);
      const candidates = JSON.parse(jsonContent);

      for (const candidate of candidates) {
        if (!candidate.filePath) {
          console.warn('Skipping candidate: missing filePath');
          continue;
        }

        const fileContent = await this.githubClient.getFileContent(candidate.filePath);
        const { data: frontMatter } = matter(fileContent);
        
        if (frontMatter && frontMatter.status === 'Ready for Research') {
          topicsToProcess.push({ ...candidate, frontMatter });
        } else {
          console.log(`Skipping ${candidate.filePath}: status is not 'Ready for Research' in file's front matter (found: ${frontMatter ? frontMatter.status : 'N/A'}).`);
        }
      }
    } else {
      console.log(`Fetching candidate topics from ${this.githubConfig.researchJsonPath}`);
      try {
        const response = await fetchJsonFromServer(this.githubConfig.researchJsonPath);
        const candidates = response.entries || [];
        const readyForResearchCandidates = candidates.filter(
          (candidate) => candidate.status === 'Ready for Research'
        );

        console.log(`Found ${readyForResearchCandidates.length} candidates marked 'Ready for Research' in JSON.`);

        for (const candidate of readyForResearchCandidates) {
          if (!candidate.filePath || !candidate.title) {
            console.warn('Skipping candidate due to missing filePath or title:', candidate);
            continue;
          }
          try {
            console.log(`Verifying status for: ${candidate.filePath}`);
            const fileContent = await this.githubClient.readFile(candidate.filePath);
            const { data: frontMatter } = matter(fileContent);

            if (frontMatter && frontMatter.status === 'Ready for Research') {
              topicsToProcess.push({ ...candidate, frontMatter });
              console.log(`Added ${candidate.filePath} to processing list.`);
            } else {
              console.log(`Skipping ${candidate.filePath}: status is not 'Ready for Research' in file's front matter (found: ${frontMatter ? frontMatter.status : 'N/A'}).`);
            }
          } catch (fileError) {
            const status = fileError.status || fileError.response?.status;
            const message = fileError.message || fileError.response?.data?.message;
            console.error(`Error reading or parsing file ${candidate.filePath}: ${status} ${message}`);
          }
          if (this.options.singleItem && topicsToProcess.length > 0) {
            console.log('Processed single item as requested, stopping further candidate processing.');
            break;
          }
        }
      } catch (error) {
        const status = error.status || error.response?.status;
        const message = error.message || error.response?.data?.message;
        console.error(`Failed to fetch or process candidates from ${this.githubConfig.researchJsonPath}: ${status} ${message}`);
        return; // Exit if we can't get the candidate list
      }
    }

    if (topicsToProcess.length === 0) {
      console.log('No topics found to process.');
      return;
    }

    console.log(`Processing ${topicsToProcess.length} topics...`);
    for (const topic of topicsToProcess) {
      await this.processTopic(topic.filePath, topic.title, topic.frontMatter);
    }
    console.log('Git Research Command execution finished.');
  }

  async processTopic(topicFilePath, topicTitle, currentFrontMatter) {
    console.log(`Processing topic: "${topicTitle}" from ${topicFilePath}`);

    if (this.options.dryRun) {
      console.log(`[DRY RUN] Would process topic: "${topicTitle}"`);
      console.log(`[DRY RUN] Original file: ${topicFilePath}`);
      return;
    }

    try {
      // 1. Update YAML status of topicFilePath to 'Research In Progress'
      console.log(`Updating status to 'Research In Progress' for ${topicFilePath}`);
      await this.githubClient.updateYamlFrontMatter(
        topicFilePath,
        { status: 'Research In Progress' },
        { message: `WIP: Start research for ${topicTitle}` }
      );

      // 2. Call PerplexityClient.researchTopic()
      console.log(`Researching topic "${topicTitle}" with Perplexity...`);
      const researchPrompt = productivityPrompt({ systemName: topicTitle });
      const researchResult = await this.perplexityClient.researchTopic(
        researchPrompt,
        this.perplexityOptions
      );

      // 3. Enhance content with citations (matching research.js)
      let enhancedContent = researchResult.content || '';
      const citations = researchResult.citations;
      if (citations?.length) {
        enhancedContent += '\n\n## Sources\n';
        citations.forEach((citation, index) => {
          enhancedContent += `${index + 1}. ${citation}\n`;
        });
      }

      // 4. Prepare updated YAML and content for the original file
      const updatedFrontMatter = {
        ...currentFrontMatter,
        status: 'Ready for Draft',
        date_researched: new Date().toLocaleDateString('en-CA'),
        // Add any other relevant metadata from current front matter if needed
      };
      const updatedFileContent = matter.stringify(enhancedContent, updatedFrontMatter);

      // 5. Write the updated content back to the original file
      console.log(`Updating original file with research: ${topicFilePath}`);
      await this.githubClient.writeFile(
        topicFilePath,
        updatedFileContent,
        { message: `Update research for ${topicTitle}` }
      );

      // 6. Update YAML status of topicFilePath to 'Research Complete'
      console.log(`Updating status to 'Research Complete' for ${topicFilePath}`);
      await this.githubClient.updateYamlFrontMatter(
        topicFilePath,
        { status: 'Research Complete' },
        { message: `Done: Complete research for ${topicTitle}` }
      );

      console.log(`Successfully processed topic: "${topicTitle}"`);

    } catch (error) {
      const status = error.status || error.response?.status;
      const message = error.message || error.response?.data?.message;
      console.error(`Error processing topic "${topicTitle}" (${topicFilePath}): ${status} ${message}`);
      try {
        console.log(`Attempting to update status to 'Error' for ${topicFilePath}`);
        await this.githubClient.updateYamlFrontMatter(
          topicFilePath,
          { status: 'Error', error_message: error.message },
          { message: `Error: Research failed for ${topicTitle}` }
        );
      } catch (updateError) {
        const updateStatus = updateError.status || updateError.response?.status;
        const updateMessage = updateError.message || updateError.response?.data?.message;
        console.error(`Failed to update status to 'Error' for ${topicFilePath}: ${updateStatus} ${updateMessage}`);
      }
    }
  }
}
