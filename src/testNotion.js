require('dotenv').config();
const { Client } = require('@notionhq/client'); // Import the official Notion client
const NotionDebugger = require('./utilities/debugger');

// Test the direct Notion client first
async function testDirectNotionClient() {
  try {
    console.log('ENV TEST:', {
      notionKey: process.env.NOTION_API_KEY ? 'Exists (not showing for security)' : 'Missing',
      blogPostsDb: process.env.NOTION_BLOG_POSTS_ID ? 'Exists' : 'Missing',
      draftsDb: process.env.NOTION_DRAFTS_ID ? 'Exists' : 'Missing',
      perplexityKey: process.env.PERPLEXITY_API_KEY ? 'Exists (not showing for security)' : 'Missing',
      jsonUrl: process.env.JSON_URL ? 'Exists' : 'Missing'
    });
      
    console.log('=== Testing Official Notion Client ===');
    
    if (!process.env.NOTION_API_KEY) {
      console.error('❌ NOTION_API_KEY environment variable is not set');
      return false;
    }
    
    console.log(`Token prefix: ${process.env.NOTION_API_KEY.substring(0, 4)}...`);
    
    // Create the official Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY
    });
    
    // Test basic connectivity
    const listUsersResponse = await notion.users.list();
    console.log('✅ Basic connectivity test passed!');
    console.log(`   Found ${listUsersResponse.results.length} users`);
    return true;
  } catch (error) {
    console.error('❌ Official client test failed:', error.message);
    if (error.body) console.error('   Details:', JSON.stringify(error.body, null, 2));
    return false;
  }
}

// Test the NotionDebugger with JSON URL
async function testNotionDebugger() {
  try {
    console.log('\n=== Testing NotionDebugger ===');
    
    // Create debugger instance with both API key and JSON URL
    const notionDebugger = new NotionDebugger(
      process.env.NOTION_API_KEY,
      process.env.JSON_URL
    );
    
    console.log('✅ Debugger instantiated successfully');
    
    // Test JSON URL functionality if configured
    if (process.env.JSON_URL) {
      console.log('\nTesting JSON URL functionality...');
      const jsonData = await notionDebugger.fetchJsonData();
      console.log('✅ JSON data fetched successfully');
      console.log(`   Data structure: ${Object.keys(jsonData).join(', ')}`);
    } else {
      console.log('\n⚠️ JSON_URL not configured, skipping JSON fetch test');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Debugger test failed:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

// Now test your custom NotionClient
async function testCustomNotionClient() {
  try {
    console.log('\n=== Testing Custom NotionClient ===');
    
    // Import your custom client
    const NotionClient = require('./shared/notion/client');
    
    // Instantiate your client
    const customClient = new NotionClient(
      process.env.NOTION_API_KEY,
      process.env.NOTION_BLOG_POSTS_ID,
      process.env.NOTION_DRAFTS_ID
    );
    
    console.log('✅ Custom client instantiated successfully');
    
    // Now test your client's methods if the above succeeds
    // For example:
    // const blogPosts = await customClient.getBlogPostsReadyForResearch();
    // console.log(`Found ${blogPosts.length} blog posts ready for research`);
    
    return true;
  } catch (error) {
    console.error('❌ Custom client test failed:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

// Run all tests
async function runTests() {
  const officialClientWorks = await testDirectNotionClient();
  
  if (officialClientWorks) {
    await testNotionDebugger();
    await testCustomNotionClient();
  } else {
    console.log('\n⚠️ Skipping additional tests since official client failed');
  }
}

runTests();