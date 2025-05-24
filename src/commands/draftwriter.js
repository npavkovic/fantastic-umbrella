import 'dotenv/config';
import { NotionClient } from '../shared/notion/client.js';
import { ClaudeClient } from '../shared/claude/client.js';
import { draftwriterSystemPrompt } from '../shared/prompts/draftwriter-system.js';
import { draftwriterUserPrompt } from '../shared/prompts/draftwriter-user.js';

class DraftwriterCommand {
  constructor(options = {}) {
    this.options = options;
    this.notionClient = new NotionClient(
      process.env.NOTION_API_KEY,
      process.env.NOTION_BLOG_POSTS_ID,
      process.env.NOTION_DRAFTS_ID
    );
    
    this.claudeClient = new ClaudeClient(
      process.env.CLAUDE_API_KEY
    );
  }

  async processDraft(draftId, draftTitle, researchContent, blogPostId) {
    try {
      console.log(`Processing draft: ${draftTitle}`);

      await this.notionClient.updateBlogPostStatus(draftId, 'Writing in Progress');
      
      if (this.options.dryRun) {
        console.log('Dry run - skipping API calls');
        return;
      }

      // Update Blog Post status to indicate draft writing has started
      if (blogPostId) {
        await this.notionClient.updateBlogPostStatus(blogPostId, 'Draft In Progress');
        console.log(`Updated Blog Post ${blogPostId} status to Draft In Progress`);
      }

      // Configure Claude options with proper system prompt
      const claudeOptions = {
        model: 'claude-3-7-sonnet-20250219',
        temperature: 0.7,
        maxTokens: 4096, // Increased for longer posts
        systemPrompt: draftwriterSystemPrompt({ systemName: draftTitle })
      };

      // Generate blog post using Claude with user prompt
      const blogPost = await this.claudeClient.generateContent(
        draftwriterUserPrompt({
            systemName: draftTitle,
            researchContent: researchContent
          }),
        claudeOptions
      );

      // Log the response for debugging
      console.log('Claude response:', blogPost);

      // Log usage statistics
      console.log('Blog post generation completed:', {
        model: blogPost.model,
        usage: blogPost.usage
      });

      // Create a new draft with the generated content
      await this.notionClient.createBlogDraft(
        draftId,
        draftTitle,
        blogPost.content,
        blogPostId
      );

      // Update research brief status to indicate processing is complete
      await this.notionClient.updateBlogPostStatus(draftId, 'Research Processed');

      // Update the Blog Post status to Draft Created
      if (blogPostId) {
        await this.notionClient.updateBlogPostStatus(blogPostId, 'Draft Created');
        console.log(`Updated Blog Post ${blogPostId} status to Draft Created`);
      }

      console.log('Blog draft created successfully');
    } catch (error) {
      console.error(`Error processing draft "${draftTitle}":`, error);
      
      // Reset the research brief status
      try {
        console.log(`Resetting status for draft "${draftTitle}" back to Ready to Start`);
        await this.notionClient.updateBlogPostStatus(draftId, 'Ready to Start');
      } catch (resetError) {
        console.error(`Failed to reset research brief status:`, resetError);
      }

      // Update Blog Post with error if we have its ID
      if (blogPostId) {
        const errorMessage = error.message || 'Unknown error occurred during draft writing';
        await this.notionClient.updateBlogPostError(blogPostId, errorMessage);
      }
      
      // Don't throw - let the system continue with other drafts
    }
  }

  async execute() {
    try {
      console.log('Starting draft writing workflow...');
      
      if (this.options.dryRun) {
        console.log('Running in dry-run mode - no API calls will be made');
      }
      
      if (this.options.draftId) {
        console.log(`Processing specific draft ID: ${this.options.draftId}`);
        // TODO: Implement single draft processing
        return;
      }
      
      // Get drafts ready to start
      const drafts = await this.notionClient.getDraftsReadyToStart();
      console.log(`Found ${drafts.length} drafts ready to start`);

      // Process each draft or just the first one if singleItem is set
      const draftsToProcess = this.options.singleItem ? drafts.slice(0, 1) : drafts;

      // Process each draft
      for (const draft of draftsToProcess) {
        const draftId = draft.id;
        const draftTitle = draft.properties.Title?.title[0]?.plain_text;
        const blogPostRelation = draft.properties["Blog Posts"]?.relation?.[0]?.id;
        
        // Get the actual content from the page blocks
        const researchContent = await this.notionClient.getPageContent(draftId);
        
        // Skip drafts with no title or content
        if (!draftTitle || !researchContent) {
          console.log(`Skipping draft with ID ${draftId} because it has no title or content`);
          continue;
        }
        
        if (!blogPostRelation) {
          console.log(`Warning: Draft ${draftId} has no Blog Posts relation`);
        }
        
        await this.processDraft(draftId, draftTitle, researchContent, blogPostRelation);
      }
      
      console.log('Draft writing workflow completed successfully');
    } catch (error) {
      // Only critical errors should stop the system
      console.error('Critical error in draft writing workflow:', error);
      process.exit(1);
    }
  }
}

export { DraftwriterCommand }; 