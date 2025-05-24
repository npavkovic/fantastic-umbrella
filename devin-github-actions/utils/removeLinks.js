/**
 * Utility function to remove all links from Notion blocks
 * to prevent "Invalid URL" errors when creating pages
 */
function removeAllLinks(blocks) {
  if (!blocks || !Array.isArray(blocks)) return;
  
  for (const block of blocks) {
    processRichTextInBlock(block);
    
    if (block.children && Array.isArray(block.children)) {
      removeAllLinks(block.children);
    }
  }
}

/**
 * Process rich_text arrays in a block to remove links
 */
function processRichTextInBlock(block) {
  if (!block) return;
  
  const richTextContainers = [
    'paragraph', 'heading_1', 'heading_2', 'heading_3', 
    'bulleted_list_item', 'numbered_list_item', 'to_do', 
    'toggle', 'quote', 'callout'
  ];
  
  for (const container of richTextContainers) {
    if (block[container] && block[container].rich_text) {
      removeLinksFromRichText(block[container].rich_text);
    }
  }
}

/**
 * Remove links from a rich_text array
 */
function removeLinksFromRichText(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray)) return;
  
  for (const textObj of richTextArray) {
    if (textObj && textObj.href) {
      delete textObj.href;
    }
  }
}

module.exports = { removeAllLinks };
