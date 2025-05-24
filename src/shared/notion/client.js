import { Client } from '@notionhq/client';
import { markdownToBlocks } from '@tryfabric/martian';
import { NotionToMarkdown } from 'notion-to-md';
import { removeAllLinks } from '../../utilities/removeLinks.js';

class NotionClient {
  constructor(apiKey, blogPostsDbId, draftsDbId) {
    this.client = new Client({ auth: apiKey });
    this.n2m = new NotionToMarkdown({ notionClient: this.client });
    this.blogPostsDbId = blogPostsDbId;
    this.draftsDbId = draftsDbId;
  }

  async getBlogPostsReadyForResearch() {
    const response = await this.client.databases.query({
      database_id: this.blogPostsDbId,
      filter: {
        property: "Status",
        status: {
          equals: "Ready for Research"
        }
      }
    });
    
    return response.results;
  }

  async appendBlocksInBatches(blockId, blocks, batchSize = 100) {
    console.log(`Appending ${blocks.length} blocks in batches of ${batchSize}`);
    
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, blocks.length);
      const batch = blocks.slice(i, batchEnd);
      
      console.log(`Adding blocks ${i+1} to ${batchEnd} of ${blocks.length}`);
      
      await this.client.blocks.children.append({
        block_id: blockId,
        children: batch
      });
      
      // Add a small delay between batches to avoid rate limiting
      if (batchEnd < blocks.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  async createResearchBrief(blogPostId, blogPostTitle, markdownContent) {
    try {
      // Convert markdown to Notion blocks
      const allBlocks = markdownToBlocks(markdownContent);
      
      // Remove link formatting to prevent "Invalid URL" errors
      removeAllLinks(allBlocks);
      
      console.log(`Converted markdown to ${allBlocks.length} Notion blocks`);
      
      // Create the page with just properties and the first block (title)
      const newDraftPage = await this.client.pages.create({
        parent: { database_id: this.draftsDbId },
        properties: {
          Title: {
            title: [{ text: { content: blogPostTitle } }]
          },
          Status: {
            status: { name: "Ready to Start" }
          },
          Type: {
            select: { name: "Research Brief" }
          },
          "Blog Posts": {
            relation: [{ id: blogPostId }]
          }
        },
        // Just add a header as the first block
        children: [
          {
            object: "block",
            type: "heading_1",
            heading_1: {
              rich_text: [{ text: { content: blogPostTitle } }]
            }
          }
        ]
      });
      
      // Now append the rest of the blocks in batches
      await this.appendBlocksInBatches(newDraftPage.id, allBlocks);
      
      // Update the original Blog Post status
      await this.updateBlogPostStatus(blogPostId, "Ready for Draft");
      
      return newDraftPage;
    } catch (error) {
      console.error("Error creating research brief:", error);
      throw error;
    }
  }

  async updateBlogPostStatus(blogPostId, newStatus) {
    try {
      await this.client.pages.update({
        page_id: blogPostId,
        properties: {
          Status: {
            status: {
              name: newStatus
            }
          }
        }
      });
      
      console.log(`Updated Blog Post ${blogPostId} status to "${newStatus}"`);
    } catch (error) {
      console.error(`Error updating blog post status:`, error);
      throw error;
    }
  }

  async getDraftsReadyToStart() {
    // Debug: Get database schema first
    try {
      const db = await this.client.databases.retrieve({
        database_id: this.draftsDbId
      });
      console.log('Database properties:', 
        Object.entries(db.properties)
          .map(([key, value]) => `"${key}" (${value.type})`)
          .join(', ')
      );
    } catch (error) {
      console.error('Error getting database schema:', error);
    }

    const response = await this.client.databases.query({
      database_id: this.draftsDbId,
      filter: {
        property: "Status",
        status: {
          equals: "Ready to Start"
        }
      }
    });
    
    return response.results;
  }

  async createDraftContent(draftId, draftTitle, markdownContent) {
    try {
      // Convert markdown to Notion blocks
      const allBlocks = markdownToBlocks(markdownContent);
      
      // Remove link formatting to prevent "Invalid URL" errors
      removeAllLinks(allBlocks);
      
      console.log(`Converted markdown to ${allBlocks.length} Notion blocks`);
      
      // Update the page properties to set Type to "Blog Draft"
      await this.client.pages.update({
        page_id: draftId,
        properties: {
          Type: {
            select: { name: "Blog Draft" }
          }
        }
      });
      
      // First, add a header block
      const headerBlock = [{
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ text: { content: draftTitle } }]
        }
      }];
      
      // Append header first
      await this.client.blocks.children.append({
        block_id: draftId,
        children: headerBlock
      });
      
      // Then append the content blocks in batches
      await this.appendBlocksInBatches(draftId, allBlocks);
      
      console.log(`Updated draft ${draftId} with generated content`);
    } catch (error) {
      console.error("Error creating draft content:", error);
      throw error;
    }
  }

  async getPageContent(pageId) {
    try {
      // This will automatically handle pagination and all block types
      const mdBlocks = await this.n2m.pageToMarkdown(pageId);
      const markdown = this.n2m.toMarkdownString(mdBlocks);
      
      console.log(`Retrieved and converted ${mdBlocks.length} blocks from page ${pageId}`);
      return markdown;
    } catch (error) {
      console.error("Error getting page content:", error);
      throw error;
    }
  }

  async createBlogDraft(researchBriefId, title, content, blogPostId) {
    try {
      // Convert markdown to Notion blocks
      const allBlocks = markdownToBlocks(content);
      
      // Remove link formatting to prevent "Invalid URL" errors
      removeAllLinks(allBlocks);
      
      console.log(`Converted markdown to ${allBlocks.length} Notion blocks`);
      
      // Prepare base properties object
      const properties = {
        Title: {
          title: [{ text: { content: title } }]
        },
        Status: {
          status: { name: "Ready for Review" }
        },
        Type: {
          select: { name: "Blog Draft" }
        },
        "Last Modified Date": {
          date: { start: new Date().toISOString() }
        }
      };

      // Try to add Blog Posts relation if provided
      if (blogPostId) {
        try {
          properties["Blog Posts"] = {
            relation: [{ id: blogPostId }]
          };
          console.log(`Added Blog Posts relation to ${blogPostId}`);
        } catch (relationError) {
          console.error(`Failed to add Blog Posts relation: ${relationError.message}`);
          // Continue without the relation
        }
      }
      
      // Create the page with properties and initial content
      let newDraftPage;
      try {
        newDraftPage = await this.client.pages.create({
          parent: { database_id: this.draftsDbId },
          properties: properties,
          children: [
            {
              object: "block",
              type: "heading_1",
              heading_1: {
                rich_text: [{ text: { content: title } }]
              }
            }
          ]
        });
      } catch (pageError) {
        console.error("Failed to create draft with properties:", properties);
        throw pageError;
      }
      
      // Now append the content blocks in batches
      try {
        await this.appendBlocksInBatches(newDraftPage.id, allBlocks);
      } catch (contentError) {
        console.error(`Failed to add content blocks to draft ${newDraftPage.id}:`, contentError);
        throw contentError;
      }
      
      console.log(`Created new blog draft ${newDraftPage.id} with content`);
      return newDraftPage;
    } catch (error) {
      console.error("Error creating blog draft:", error);
      throw error;
    }
  }

  async updateBlogPostError(blogPostId, errorMessage, setErrorStatus = true) {
    try {
      const properties = {
        Error: {
          rich_text: [{ text: { content: errorMessage } }]
        }
      };

      // Optionally set status to Error
      if (setErrorStatus) {
        properties.Status = {
          status: { name: "Error" }
        };
      }

      await this.client.pages.update({
        page_id: blogPostId,
        properties: properties
      });
      
      console.log(`Updated Blog Post ${blogPostId} with error: ${errorMessage}`);
    } catch (error) {
      console.error(`Failed to update error for Blog Post ${blogPostId}:`, error);
      // Don't throw - this is error handling code
    }
  }
}

export { NotionClient };