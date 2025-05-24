const core = require('@actions/core');
const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { markdownToBlocks } = require('@tryfabric/martian');
const Anthropic = require('@anthropic-ai/sdk');
const { removeAllLinks } = require('../../utils/removeLinks');

async function run() {
  try {
    const notionApiKey = core.getInput('notion-api-key', { required: true });
    const blogPostsDbId = core.getInput('notion-blog-posts-id', { required: true });
    const draftsDbId = core.getInput('notion-drafts-id', { required: true });
    const anthropicApiKey = core.getInput('anthropic-api-key', { required: true });

    const notionClient = new Client({ auth: notionApiKey });
    const n2m = new NotionToMarkdown({ notionClient: notionClient });
    
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    core.info('Querying for drafts ready to start...');
    const response = await notionClient.databases.query({
      database_id: draftsDbId,
      filter: {
        property: "Status",
        status: {
          equals: "Ready to Start"
        }
      }
    });

    const drafts = response.results;
    core.info(`Found ${drafts.length} drafts ready to start`);

    if (drafts.length === 0) {
      core.info('No drafts found that are ready to start');
      return;
    }

    const draft = drafts[0];
    const draftId = draft.id;
    const draftTitle = draft.properties.Title?.title[0]?.plain_text;
    const blogPostRelation = draft.properties["Blog Posts"]?.relation?.[0]?.id;
    
    const mdBlocks = await n2m.pageToMarkdown(draftId);
    const researchContent = n2m.toMarkdownString(mdBlocks);
    
    if (!draftTitle || !researchContent) {
      core.warning(`Skipping draft with ID ${draftId} because it has no title or content`);
      return;
    }
    
    if (!blogPostRelation) {
      core.warning(`Warning: Draft ${draftId} has no Blog Posts relation`);
    }
    
    core.info(`Processing draft: ${draftTitle}`);

    await updateBlogPostStatus(notionClient, draftId, 'Writing in Progress');
    
    if (blogPostRelation) {
      await updateBlogPostStatus(notionClient, blogPostRelation, 'Draft In Progress');
      core.info(`Updated Blog Post ${blogPostRelation} status to Draft In Progress`);
    }

    const systemPrompt = `You are a professional blog writer specializing in productivity, personal development, and business efficiency topics. Your task is to create engaging, well-structured blog posts based on research briefs.

For the blog post titled "${draftTitle}", create a comprehensive article that:
1. Has a compelling introduction that hooks the reader
2. Includes clear, descriptive headings and subheadings
3. Presents information in a logical, flowing structure
4. Incorporates practical examples and actionable advice
5. Maintains a conversational yet authoritative tone
6. Concludes with a summary and call-to-action
7. Is optimized for readability with short paragraphs and bullet points where appropriate

The content should be original, engaging, and valuable to readers interested in improving their productivity and effectiveness.`;

    const userPrompt = `Based on the following research brief, create a complete blog post for "${draftTitle}".

RESEARCH BRIEF:
${researchContent}

Format the blog post with proper Markdown formatting, including:
- # for the main title
- ## for section headings
- ### for subsection headings
- **bold** for emphasis
- *italic* for secondary emphasis
- Bullet points and numbered lists where appropriate

The final blog post should be comprehensive, engaging, and ready to publish with minimal editing.`;

    core.info('Generating blog post with Claude...');
    const blogPost = await generateContent(anthropic, systemPrompt, userPrompt);

    core.info('Blog post generation completed:');
    core.info(`- Model: ${blogPost.model}`);
    core.info(`- Input tokens: ${blogPost.usage.input_tokens}`);
    core.info(`- Output tokens: ${blogPost.usage.output_tokens}`);

    await createBlogDraft(notionClient, draftId, draftTitle, blogPost.content, blogPostRelation, draftsDbId);

    await updateBlogPostStatus(notionClient, draftId, 'Research Processed');

    if (blogPostRelation) {
      await updateBlogPostStatus(notionClient, blogPostRelation, 'Draft Created');
      core.info(`Updated Blog Post ${blogPostRelation} status to Draft Created`);
    }

    core.info('Draft writing workflow completed successfully');
  } catch (error) {
    core.setFailed(`Draft writing workflow failed: ${error.message}`);
    
    if (error.draftId) {
      try {
        const notionApiKey = core.getInput('notion-api-key', { required: true });
        const notionClient = new Client({ auth: notionApiKey });
        
        core.info(`Resetting status for draft "${error.draftId}" back to Ready to Start`);
        await updateBlogPostStatus(notionClient, error.draftId, 'Ready to Start');
        
        if (error.blogPostId) {
          const errorMessage = error.message || 'Unknown error occurred during draft writing';
          await updateBlogPostError(notionClient, error.blogPostId, errorMessage);
        }
      } catch (resetError) {
        core.warning(`Failed to reset draft status: ${resetError.message}`);
      }
    }
  }
}

/**
 * Updates the status of a blog post in Notion
 */
async function updateBlogPostStatus(notionClient, blogPostId, newStatus) {
  try {
    await notionClient.pages.update({
      page_id: blogPostId,
      properties: {
        Status: {
          status: {
            name: newStatus
          }
        }
      }
    });
    
    core.info(`Updated Blog Post ${blogPostId} status to "${newStatus}"`);
  } catch (error) {
    core.error(`Error updating blog post status: ${error.message}`);
    throw error;
  }
}

/**
 * Creates a blog draft in Notion
 */
async function createBlogDraft(notionClient, researchBriefId, title, content, blogPostId, draftsDbId) {
  try {
    const allBlocks = markdownToBlocks(content);
    
    removeAllLinks(allBlocks);
    
    core.info(`Converted markdown to ${allBlocks.length} Notion blocks`);
    
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

    if (blogPostId) {
      try {
        properties["Blog Posts"] = {
          relation: [{ id: blogPostId }]
        };
        core.info(`Added Blog Posts relation to ${blogPostId}`);
      } catch (relationError) {
        core.error(`Failed to add Blog Posts relation: ${relationError.message}`);
      }
    }
    
    let newDraftPage;
    try {
      newDraftPage = await notionClient.pages.create({
        parent: { database_id: draftsDbId },
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
      core.error(`Failed to create draft with properties: ${JSON.stringify(properties)}`);
      throw pageError;
    }
    
    try {
      await appendBlocksInBatches(notionClient, newDraftPage.id, allBlocks);
    } catch (contentError) {
      core.error(`Failed to add content blocks to draft ${newDraftPage.id}: ${contentError.message}`);
      throw contentError;
    }
    
    core.info(`Created new blog draft ${newDraftPage.id} with content`);
    return newDraftPage;
  } catch (error) {
    core.error(`Error creating blog draft: ${error.message}`);
    throw error;
  }
}

/**
 * Appends blocks to a Notion page in batches
 */
async function appendBlocksInBatches(notionClient, blockId, blocks, batchSize = 100) {
  core.info(`Appending ${blocks.length} blocks in batches of ${batchSize}`);
  
  for (let i = 0; i < blocks.length; i += batchSize) {
    const batchEnd = Math.min(i + batchSize, blocks.length);
    const batch = blocks.slice(i, batchEnd);
    
    core.info(`Adding blocks ${i+1} to ${batchEnd} of ${blocks.length}`);
    
    await notionClient.blocks.children.append({
      block_id: blockId,
      children: batch
    });
    
    if (batchEnd < blocks.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

/**
 * Updates a blog post with error information
 */
async function updateBlogPostError(notionClient, blogPostId, errorMessage, setErrorStatus = true) {
  try {
    const properties = {
      Error: {
        rich_text: [{ text: { content: errorMessage } }]
      }
    };

    if (setErrorStatus) {
      properties.Status = {
        status: { name: "Error" }
      };
    }

    await notionClient.pages.update({
      page_id: blogPostId,
      properties: properties
    });
    
    core.info(`Updated Blog Post ${blogPostId} with error: ${errorMessage}`);
  } catch (error) {
    core.error(`Failed to update error for Blog Post ${blogPostId}: ${error.message}`);
  }
}

/**
 * Generates content using Claude AI
 */
async function generateContent(anthropic, systemPrompt, userPrompt) {
  try {
    const params = {
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        { 
          role: 'user', 
          content: userPrompt 
        }
      ],
    };

    const response = await anthropic.messages.create(params);

    return {
      content: response.content[0].text,
      usage: response.usage,
      model: response.model,
      id: response.id
    };
  } catch (error) {
    core.error('Claude API error:');
    if (error.status) core.error(`Status: ${error.status}`);
    core.error(`Message: ${error.message}`);
    if (error.type) core.error(`Type: ${error.type}`);
    
    throw new Error(`Claude API error: ${error.message}`);
  }
}

run();
