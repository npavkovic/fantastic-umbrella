/**
 * NotionDebugger - A utility for debugging Notion API interactions
 * 
 * This utility provides methods to inspect Notion databases, pages, and properties
 * to help diagnose issues with API calls and understand the correct data structures.
 */
const { Client } = require('@notionhq/client');
const fetch = require('node-fetch');

class NotionDebugger {
  /**
   * Create a new NotionDebugger instance
   * @param {string} apiKey - Your Notion API key
   * @param {string} [jsonUrl] - Optional URL to fetch JSON data from
   */
  constructor(apiKey, jsonUrl = null) {
    if (!apiKey && !jsonUrl) {
      throw new Error('Either Notion API key or JSON URL is required');
    }
    
    this.apiKey = apiKey;
    this.jsonUrl = jsonUrl;
    
    if (apiKey) {
      this.client = new Client({ auth: apiKey });
    }
  }

  /**
   * Fetch JSON data from the configured URL
   * @returns {Promise<Object>} The fetched JSON data
   */
  async fetchJsonData() {
    if (!this.jsonUrl) {
      throw new Error('No JSON URL configured');
    }

    try {
      console.log(`\n=== Fetching JSON data from: ${this.jsonUrl} ===`);
      const response = await fetch(this.jsonUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Successfully fetched JSON data');
      return data;
    } catch (error) {
      console.error('Error fetching JSON data:', error.message);
      throw error;
    }
  }

  /**
   * Get detailed information about a database
   * @param {string} databaseId - The ID of the database to inspect
   * @returns {Promise<Object>} - Detailed database information
   */
  async inspectDatabase(databaseId) {
    try {
      console.log(`\n=== Inspecting Database: ${databaseId} ===`);
      
      // Retrieve database details
      const database = await this.client.databases.retrieve({
        database_id: databaseId
      });
      
      // Extract and format property information
      const properties = {};
      
      Object.entries(database.properties).forEach(([name, property]) => {
        properties[name] = {
          id: property.id,
          type: property.type,
          // Include additional details based on property type
          details: this._getPropertyDetails(property)
        };
      });
      
      // Format results
      const result = {
        title: database.title.map(t => t.plain_text).join(''),
        databaseId: database.id,
        url: database.url,
        created_time: database.created_time,
        last_edited_time: database.last_edited_time,
        properties
      };
      
      console.log('Database Title:', result.title);
      console.log('Properties:');
      Object.entries(result.properties).forEach(([name, details]) => {
        console.log(`  - ${name} (${details.type})`);
        
        if (details.type === 'select' || details.type === 'status') {
          console.log('    Options:', details.details.options.map(o => o.name).join(', '));
        } else if (details.type === 'relation') {
          console.log(`    Relates to: ${details.details.database_id}`);
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error inspecting database:', error.message);
      if (error.body) console.error('Details:', JSON.stringify(error.body, null, 2));
      throw error;
    }
  }

  /**
   * Get sample records from a database
   * @param {string} databaseId - The ID of the database
   * @param {number} limit - Maximum number of records to retrieve (default: 3)
   * @returns {Promise<Array>} - Sample database records
   */
  async sampleDatabaseRecords(databaseId, limit = 3) {
    try {
      console.log(`\n=== Sampling ${limit} Records from Database: ${databaseId} ===`);
      
      const response = await this.client.databases.query({
        database_id: databaseId,
        page_size: limit
      });
      
      if (response.results.length === 0) {
        console.log('No records found in database.');
        return [];
      }
      
      // Log basic info about each record
      response.results.forEach((page, index) => {
        console.log(`\nRecord #${index + 1} (ID: ${page.id}):`);
        this._logPagePropertySummary(page.properties);
      });
      
      return response.results;
    } catch (error) {
      console.error('Error sampling database records:', error.message);
      if (error.body) console.error('Details:', JSON.stringify(error.body, null, 2));
      throw error;
    }
  }

  /**
   * Inspect a specific page and its properties
   * @param {string} pageId - The ID of the page to inspect
   * @returns {Promise<Object>} - Detailed page information
   */
  async inspectPage(pageId) {
    try {
      console.log(`\n=== Inspecting Page: ${pageId} ===`);
      
      const page = await this.client.pages.retrieve({
        page_id: pageId
      });
      
      console.log('Page Title:', this._extractPageTitle(page));
      console.log('Created:', page.created_time);
      console.log('Last Edited:', page.last_edited_time);
      console.log('URL:', page.url);
      console.log('\nProperties:');
      
      this._logPagePropertyDetails(page.properties);
      
      return page;
    } catch (error) {
      console.error('Error inspecting page:', error.message);
      if (error.body) console.error('Details:', JSON.stringify(error.body, null, 2));
      throw error;
    }
  }

  /**
   * Test setting a property value on a page
   * @param {string} pageId - The ID of the page to update
   * @param {string} propertyName - The name of the property to update
   * @param {Object} propertyValue - The value to set (e.g., {select: {name: "Ready"}})
   * @returns {Promise<Object>} - API response
   */
  async testPropertyUpdate(pageId, propertyName, propertyValue) {
    try {
      console.log(`\n=== Testing Property Update ===`);
      console.log(`Page: ${pageId}`);
      console.log(`Property: ${propertyName}`);
      console.log(`Value:`, JSON.stringify(propertyValue, null, 2));
      
      const updateData = {
        page_id: pageId,
        properties: {
          [propertyName]: propertyValue
        }
      };
      
      console.log('\nSending update with payload:', JSON.stringify(updateData, null, 2));
      
      const response = await this.client.pages.update(updateData);
      
      console.log('\nUpdate successful!');
      console.log('Updated property value:', JSON.stringify(response.properties[propertyName], null, 2));
      
      return response;
    } catch (error) {
      console.error('Error updating property:', error.message);
      if (error.body) console.error('Details:', JSON.stringify(error.body, null, 2));
      throw error;
    }
  }

  /**
   * Create a test page in a database with minimal properties
   * @param {string} databaseId - The database to create the page in
   * @param {string} title - The title for the test page
   * @returns {Promise<Object>} - The created page
   */
  async createTestPage(databaseId, title = 'Debug Test Page') {
    try {
      console.log(`\n=== Creating Test Page in Database: ${databaseId} ===`);
      
      // First, get the database properties to understand required fields
      const database = await this.client.databases.retrieve({
        database_id: databaseId
      });
      
      // Find the title property
      const titleProperty = Object.entries(database.properties)
        .find(([_, prop]) => prop.type === 'title')?.[0];
      
      if (!titleProperty) {
        throw new Error('Could not find title property in database');
      }
      
      console.log(`Using "${titleProperty}" as the title property`);
      
      // Create basic page
      const response = await this.client.pages.create({
        parent: { database_id: databaseId },
        properties: {
          [titleProperty]: {
            title: [{ text: { content: title } }]
          }
        }
      });
      
      console.log(`Test page created successfully with ID: ${response.id}`);
      console.log(`URL: ${response.url}`);
      
      return response;
    } catch (error) {
      console.error('Error creating test page:', error.message);
      if (error.body) console.error('Details:', JSON.stringify(error.body, null, 2));
      throw error;
    }
  }

  /**
   * Helper method to extract property details based on type
   * @private
   */
  _getPropertyDetails(property) {
    switch (property.type) {
      case 'select':
        return {
          options: property.select.options
        };
      case 'status':
        return {
          options: property.status.options
        };
      case 'multi_select':
        return {
          options: property.multi_select.options
        };
      case 'relation':
        return {
          database_id: property.relation.database_id,
          synced_property_name: property.relation.synced_property_name
        };
      case 'date':
      case 'checkbox':
      case 'number':
      case 'email':
      case 'url':
      case 'phone_number':
        return {};
      default:
        return {};
    }
  }

  /**
   * Extract a page title for display
   * @private
   */
  _extractPageTitle(page) {
    // Find the title property
    const titleProp = Object.values(page.properties)
      .find(prop => prop.type === 'title');
    
    if (titleProp && titleProp.title.length > 0) {
      return titleProp.title.map(t => t.plain_text).join('');
    }
    
    return '[No Title]';
  }

  /**
   * Log a summary of page properties
   * @private
   */
  _logPagePropertySummary(properties) {
    Object.entries(properties).forEach(([name, prop]) => {
      let value = '[empty]';
      
      switch (prop.type) {
        case 'title':
          value = prop.title.map(t => t.plain_text).join('');
          break;
        case 'rich_text':
          value = prop.rich_text.map(t => t.plain_text).join('');
          break;
        case 'select':
          value = prop.select?.name || '[not selected]';
          break;
        case 'status':
          value = prop.status?.name || '[not set]';
          break;
        case 'multi_select':
          value = prop.multi_select.map(s => s.name).join(', ');
          break;
        case 'relation':
          value = `[${prop.relation.length} relations]`;
          break;
        case 'checkbox':
          value = prop.checkbox ? 'Checked' : 'Unchecked';
          break;
        default:
          value = `[${prop.type}]`;
      }
      
      console.log(`  ${name}: ${value}`);
    });
  }

  /**
   * Log detailed information about page properties
   * @private
   */
  _logPagePropertyDetails(properties) {
    Object.entries(properties).forEach(([name, prop]) => {
      console.log(`\n  ${name} (${prop.type}):`);
      console.log(`    ID: ${prop.id}`);
      
      switch (prop.type) {
        case 'title':
        case 'rich_text':
          if (prop[prop.type].length > 0) {
            console.log(`    Content: "${prop[prop.type].map(t => t.plain_text).join('')}"`);
          } else {
            console.log('    Content: [empty]');
          }
          break;
        case 'select':
          if (prop.select) {
            console.log(`    Selected: "${prop.select.name}" (ID: ${prop.select.id})`);
          } else {
            console.log('    Selected: [none]');
          }
          break;
        case 'status':
          if (prop.status) {
            console.log(`    Status: "${prop.status.name}" (ID: ${prop.status.id})`);
          } else {
            console.log('    Status: [none]');
          }
          break;
        case 'multi_select':
          if (prop.multi_select.length > 0) {
            console.log('    Selected options:');
            prop.multi_select.forEach(option => {
              console.log(`      - "${option.name}" (ID: ${option.id})`);
            });
          } else {
            console.log('    Selected options: [none]');
          }
          break;
        case 'relation':
          if (prop.relation.length > 0) {
            console.log('    Related pages:');
            prop.relation.forEach(relation => {
              console.log(`      - ${relation.id}`);
            });
          } else {
            console.log('    Related pages: [none]');
          }
          break;
        case 'date':
          if (prop.date) {
            console.log(`    Start: ${prop.date.start}`);
            if (prop.date.end) {
              console.log(`    End: ${prop.date.end}`);
            }
          } else {
            console.log('    Date: [not set]');
          }
          break;
        case 'checkbox':
          console.log(`    Checked: ${prop.checkbox}`);
          break;
        case 'number':
          console.log(`    Value: ${prop.number}`);
          break;
        default:
          console.log(`    Raw value: ${JSON.stringify(prop[prop.type])}`);
      }
    });
  }
}

module.exports = NotionDebugger;