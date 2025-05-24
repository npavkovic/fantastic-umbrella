const core = require('@actions/core');
const { Client } = require('@notionhq/client');

async function run() {
  try {
    const workflowType = core.getInput('workflow-type', { required: true });
    const notionApiKey = core.getInput('notion-api-key', { required: true });
    const blogPostsDbId = core.getInput('notion-blog-posts-id', { required: true });
    const draftsDbId = core.getInput('notion-drafts-id', { required: true });

    const notionClient = new Client({ auth: notionApiKey });

    let hasContent = false;

    if (workflowType === 'research') {
      const response = await notionClient.databases.query({
        database_id: blogPostsDbId,
        filter: {
          property: "Status",
          status: {
            equals: "Ready for Research"
          }
        },
        page_size: 1 // We only need to know if there's at least one
      });

      hasContent = response.results.length > 0;
      core.info(`Found ${response.results.length} blog posts ready for research`);
    } 
    else if (workflowType === 'draft-writing') {
      const response = await notionClient.databases.query({
        database_id: draftsDbId,
        filter: {
          property: "Status",
          status: {
            equals: "Ready to Start"
          }
        },
        page_size: 1 // We only need to know if there's at least one
      });

      hasContent = response.results.length > 0;
      core.info(`Found ${response.results.length} drafts ready to start`);
    }
    else {
      throw new Error(`Invalid workflow type: ${workflowType}`);
    }

    core.setOutput('has-content', hasContent.toString());
    core.info(`Setting output has-content=${hasContent}`);
  } catch (error) {
    core.setFailed(`Monitor workflow failed: ${error.message}`);
  }
}

run();
