require('dotenv').config();
const NotionDebugger = require('./debugger');

async function debugNotion() {
  try {
    const dbug = new NotionDebugger(process.env.NOTION_API_KEY);
    
    console.log('\n=== INSPECTING DRAFTS DATABASE ===');
    const draftsDb = await dbug.inspectDatabase(process.env.NOTION_DRAFTS_ID);
    

    // 1. Inspect database structure
    console.log('\n=== INSPECTING BLOG POSTS DATABASE ===');
    const blogPostsDb = await dbug.inspectDatabase(process.env.NOTION_BLOG_POSTS_ID);
    
    // 2. Get sample records
    console.log('\n=== SAMPLE BLOG POSTS ===');
    const blogPostsSamples = await dbug.sampleDatabaseRecords(process.env.NOTION_BLOG_POSTS_ID, 2);
    
    if (blogPostsSamples.length > 0) {
      // 3. Inspect a specific page
      const samplePageId = blogPostsSamples[0].id;
      console.log('\n=== DETAILED PAGE INSPECTION ===');
      await dbug.inspectPage(samplePageId);
      
      // 4. Test updating a property
      // Find the Status property name from the database inspection
      const statusPropName = Object.entries(blogPostsDb.properties)
        .find(([_, prop]) => prop.type === 'select' || prop.type === 'status')?.[0];
      
      if (statusPropName) {
        console.log('\n=== TESTING STATUS UPDATE ===');
        
        // Test update with the correct property structure
        const propertyType = blogPostsDb.properties[statusPropName].type;
        const updateValue = propertyType === 'select' 
          ? { select: { name: "Ready for Research" } }
          : { status: { name: "Ready for Research" } };
        
        await dbug.testPropertyUpdate(samplePageId, statusPropName, updateValue);
      }
    }
    
    // 5. Test creating a page
    console.log('\n=== CREATING TEST PAGE ===');
    const testPage = await dbug.createTestPage(
      process.env.NOTION_DRAFTS_ID, 
      "Debug Test Page " + new Date().toISOString()
    );
    
  } catch (error) {
    console.error('Debug session failed:', error);
  }
}

debugNotion();