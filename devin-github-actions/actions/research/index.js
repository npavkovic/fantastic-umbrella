const core = require('@actions/core');
const { Client } = require('@notionhq/client');
const { markdownToBlocks } = require('@tryfabric/martian');
const axios = require('axios');
const { removeAllLinks } = require('../../utils/removeLinks');

async function run() {
  try {
    const notionApiKey = core.getInput('notion-api-key', { required: true });
    const blogPostsDbId = core.getInput('notion-blog-posts-id', { required: true });
    const draftsDbId = core.getInput('notion-drafts-id', { required: true });
    const perplexityApiKey = core.getInput('perplexity-api-key', { required: true });

    const notionClient = new Client({ auth: notionApiKey });

    core.info('Querying for blog posts ready for research...');
    const response = await notionClient.databases.query({
      database_id: blogPostsDbId,
      filter: {
        property: "Status",
        status: {
          equals: "Ready for Research"
        }
      }
    });

    const topics = response.results;
    core.info(`Found ${topics.length} topics ready for research`);

    if (topics.length === 0) {
      core.info('No topics found that are ready for research');
      return;
    }

    const topic = topics[0];
    const topicId = topic.id;
    const topicTitle = topic.properties.Title?.title[0]?.plain_text;

    if (!topicTitle) {
      core.warning(`Skipping topic with ID ${topicId} because it has no title`);
      return;
    }

    core.info(`Processing topic: ${topicTitle}`);

    await updateBlogPostStatus(notionClient, topicId, 'Research In Progress');

    const research = await researchTopic(perplexityApiKey, topicTitle);

    core.info('Research completed with the following stats:');
    core.info(`- Model: ${research.model}`);
    core.info(`- Prompt tokens: ${research.usage.prompt_tokens}`);
    core.info(`- Completion tokens: ${research.usage.completion_tokens}`);
    core.info(`- Total tokens: ${research.usage.total_tokens}`);

    let enhancedContent = research.content;
    
    const citations = research.citations;
    if (citations?.length) {
      enhancedContent += '\n\n## Sources\n';
      citations.forEach((citation, index) => {
        enhancedContent += `${index + 1}. ${citation}\n`;
      });
    }

    await createResearchBrief(notionClient, topicId, topicTitle, enhancedContent, draftsDbId);

    await updateBlogPostStatus(notionClient, topicId, 'Ready for Draft');

    core.info('Research workflow completed successfully');
  } catch (error) {
    core.setFailed(`Research workflow failed: ${error.message}`);
    
    if (error.topicId) {
      try {
        const notionApiKey = core.getInput('notion-api-key', { required: true });
        const notionClient = new Client({ auth: notionApiKey });
        
        await updateBlogPostError(
          notionClient, 
          error.topicId, 
          error.message || 'Unknown error occurred during research'
        );
        
        core.info(`Updated topic ${error.topicId} status to Error`);
      } catch (updateError) {
        core.warning(`Failed to update error status: ${updateError.message}`);
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
 * Creates a research brief in Notion
 */
async function createResearchBrief(notionClient, blogPostId, blogPostTitle, markdownContent, draftsDbId) {
  try {
    const allBlocks = markdownToBlocks(markdownContent);
    
    removeAllLinks(allBlocks);
    
    core.info(`Converted markdown to ${allBlocks.length} Notion blocks`);
    
    const newDraftPage = await notionClient.pages.create({
      parent: { database_id: draftsDbId },
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
    
    await appendBlocksInBatches(notionClient, newDraftPage.id, allBlocks);
    
    core.info(`Research brief created successfully with ID: ${newDraftPage.id}`);
    return newDraftPage;
  } catch (error) {
    core.error(`Error creating research brief: ${error.message}`);
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
 * Performs research on a topic using Perplexity AI
 */
async function researchTopic(apiKey, topicTitle) {
  try {
    const baseURL = 'https://api.perplexity.ai';
    const client = axios.create({
      baseURL: baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const systemPrompt = `You are a meticulous research assistant specializing in productivity systems and methodologies. Your task is to provide comprehensive, evidence-based information about productivity frameworks, techniques, and tools.`;
    
    const userPrompt = `Research the topic "${topicTitle}" thoroughly. Include:
1. A comprehensive overview of the topic
2. Key concepts and principles
3. Historical context and development
4. Practical applications and implementation strategies
5. Benefits and limitations
6. Expert opinions and research findings
7. Comparisons with related approaches
8. Case studies or examples of successful implementation

Format your response with clear headings and subheadings. Include citations for all sources.`;

    const requestBody = {
      model: 'sonar-deep-research',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 7000,
      stream: false,
      search_domain_filter: [
        "-reddit.com",
        "-pinterest.com",
        "-quora.com",
        "-medium.com",
        "-wikipedia.org"
      ],
      web_search_options: {
        search_context_size: 'high'
      }
    };

    const response = await client.post('/chat/completions', requestBody);

    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new Error('Invalid response format from Perplexity API');
    }

    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      citations: response.data.citations
    };
  } catch (error) {
    if (error.response) {
      core.error('Perplexity API error:');
      core.error(`Status: ${error.response.status}`);
      core.error(`Data: ${JSON.stringify(error.response.data)}`);
      throw new Error(`Perplexity API error: ${error.response.data.error?.message || error.message}`);
    } else if (error.request) {
      core.error('No response from Perplexity API');
      throw new Error('No response received from Perplexity API');
    } else {
      core.error(`Error in Perplexity API call: ${error.message}`);
      throw new Error(`Perplexity API error: ${error.message}`);
    }
  }
}

run();
