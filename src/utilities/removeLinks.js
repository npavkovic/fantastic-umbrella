/**
 * Utility for removing links from Notion blocks
 */

/**
 * Removes all link formatting from Notion blocks while preserving the text content
 * @param {Array} blocks - Array of Notion blocks
 * @returns {Array} - The same blocks with links removed
 */
const removeAllLinks = (blocks) => {
  blocks.forEach((block) => {
    // Get the rich_text array based on the block type
    const richTextArray = block[block.type]?.rich_text;
    
    if (Array.isArray(richTextArray)) {
      richTextArray.forEach((textItem) => {
        // The actual text content is in "text" for most rich text items
        if (textItem.text && textItem.text.link) {
          delete textItem.text.link;
        }
      });
    }
    
    // Process any child blocks recursively
    if (block.children) {
      removeAllLinks(block.children);
    }
  });
  return blocks;
};

module.exports = {
  removeAllLinks
}; 