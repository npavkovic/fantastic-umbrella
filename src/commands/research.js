import 'dotenv/config';
import { NotionClient } from '../shared/notion/client.js';
import { PerplexityClient } from '../shared/perplexity/client.js';
import { productivityPrompt } from '../shared/prompts/productivity.js';

class ResearchCommand {
  constructor(options = {}) {
    this.options = options;
    this.notionClient = new NotionClient(
      process.env.NOTION_API_KEY,
      process.env.NOTION_BLOG_POSTS_ID,
      process.env.NOTION_DRAFTS_ID
    );
    
    this.perplexityClient = new PerplexityClient(
      process.env.PERPLEXITY_API_KEY
    );

    this.perplexityOptions = {
      model: 'sonar-deep-research',
      temperature: 0.2,
      maxTokens: 7000,
      contextSize: 'high',
      searchDomains: [
        "-reddit.com",
        "-pinterest.com",
        "-quora.com",
        "-medium.com",
        "-wikipedia.org"
      ]
    };
  }

  async processTopic(topicId, topicTitle) {
    try {
      console.log(`Processing topic: ${topicTitle}`);

      await this.notionClient.updateBlogPostStatus(topicId, 'Research In Progress');
      
      if (this.options.dryRun) {
        console.log('Dry run - skipping API calls');
        return;
      }

      // Get research from Perplexity using the prompt
      const research = await this.perplexityClient.researchTopic(
        productivityPrompt({ systemName: topicTitle }),
        this.perplexityOptions
      );

      // Log usage statistics
      console.log('Research completed:', {
        model: research.model,
        promptTokens: research.usage.prompt_tokens,
        completionTokens: research.usage.completion_tokens,
        totalTokens: research.usage.total_tokens
      });

      console.log('Perplexity response:', research);

      // Append citations to the content if they exist
      let enhancedContent = research.content;
      
      const citations = research.citations;
      if (citations?.length) {
        enhancedContent += '\n\n## Sources\n';
        citations.forEach((citation, index) => {
          enhancedContent += `${index + 1}. ${citation}\n`;
        });
      }

      // Debug: Log any markdown links in the content
      console.log('Enhanced content:', enhancedContent);

      // Create research brief in Notion
      await this.notionClient.createResearchBrief(
        topicId,
        topicTitle,
        enhancedContent
      );

      console.log('Research brief created successfully');
    } catch (error) {
      console.error(`Error processing topic "${topicTitle}":`, error);
      
      // Record the error and set status
      const errorMessage = error.message || 'Unknown error occurred during research';
      await this.notionClient.updateBlogPostError(topicId, errorMessage);
      
      // Don't throw - let the system continue with other topics
    }
  }

  async execute() {
    try {
      console.log('Starting research workflow...');
      
      if (this.options.dryRun) {
        console.log('Running in dry-run mode - no API calls will be made');
      }
      
      if (this.options.topicId) {
        console.log(`Processing specific topic ID: ${this.options.topicId}`);
        // TODO: Implement single topic processing
        return;
      }
      
      // Get blog posts ready for research
      const topics = await this.notionClient.getBlogPostsReadyForResearch();
      console.log(`Found ${topics.length} topics ready for research`);

      // Process each topic or just the first one if singleItem is set
      const topicsToProcess = this.options.singleItem ? topics.slice(0, 1) : topics;
      
      for (const topic of topicsToProcess) {
        const topicId = topic.id;
        const topicTitle = topic.properties.Title?.title[0]?.plain_text;
        
        // Skip topics with no title
        if (!topicTitle) {
          console.log(`Skipping topic with ID ${topicId} because it has no title`);
          continue;
        }
        
        await this.processTopic(topicId, topicTitle);
      }
      
      console.log('Research workflow completed successfully');
    } catch (error) {
      // Only critical errors (like API auth failures) should stop the system
      console.error('Critical error in research workflow:', error);
      process.exit(1);
    }
  }
}

export { ResearchCommand }; 