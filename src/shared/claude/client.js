/**
 * ClaudeClient - A client for Anthropic's Claude API using the official SDK
 * 
 * This client provides a simple wrapper around the official Anthropic SDK
 * for generating SEO blog posts and content.
 * 
 * Available models:
 * - claude-3-opus-20240229: Most capable model for complex tasks
 * - claude-3-sonnet-20240229: Balanced performance and speed
 * - claude-3-haiku-20240307: Fastest model for simpler tasks
 * - claude-3-5-sonnet-20240620: Enhanced Sonnet model
 * - claude-3-7-sonnet-20250219: Latest model with improved capabilities
 */
import Anthropic from '@anthropic-ai/sdk';

class ClaudeClient {
  /**
   * Create a new ClaudeClient instance
   * @param {string} apiKey - Your Anthropic API key
   */
  constructor(apiKey) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  /**
   * Generate content using Claude's Messages API
   * 
   * @param {string} userPrompt - The prompt to send to Claude
   * @param {Object} options - Configuration options
   * @param {string} [options.systemPrompt=''] - System prompt to guide Claude's response
   * @param {string} [options.model='claude-3-5-sonnet-20240620'] - Model to use
   * @param {number} [options.maxTokens=4000] - Maximum tokens in response
   * @param {number} [options.temperature=0.7] - Controls randomness (0-1)
   * @param {Object} [options.responseFormat] - Specify response format (e.g., { "type": "json_object" })
   * 
   * @returns {Promise<Object>} Response containing the content and usage statistics
   * @throws {Error} If API request fails
   */
  async generateContent(userPrompt, options = {}) {
    try {
      const params = {
        model: options.model || 'claude-3-5-sonnet-20240620',
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt || '',
        messages: [
          { 
            role: 'user', 
            content: userPrompt 
          }
        ],
      };

      // Add response format if provided
      if (options.responseFormat) {
        params.response_format = options.responseFormat;
      }

      const response = await this.anthropic.messages.create(params);

      return {
        content: response.content[0].text,
        usage: response.usage,
        model: response.model,
        id: response.id
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.error('Claude API error:', {
          status: error.status,
          message: error.message,
          type: error.type
        });
        throw new Error(`Claude API error: ${error.message}`);
      } else {
        console.error('Error in Claude API call:', error.message);
        throw new Error(`Claude API error: ${error.message}`);
      }
    }
  }

  /**
   * Generate content using Claude API with conversational history
   * 
   * @param {Array<Object>} messages - Array of message objects with role and content
   * @param {Object} options - Same configuration options as generateContent
   * 
   * @returns {Promise<Object>} Response containing the content and usage statistics
   * @throws {Error} If API request fails
   */
  async generateWithHistory(messages, options = {}) {
    try {
      const params = {
        model: options.model || 'claude-3-5-sonnet-20240620',
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt || '',
        messages: messages,
      };

      // Add response format if provided
      if (options.responseFormat) {
        params.response_format = options.responseFormat;
      }

      const response = await this.anthropic.messages.create(params);

      return {
        content: response.content[0].text,
        usage: response.usage,
        model: response.model,
        id: response.id
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.error('Claude API error:', {
          status: error.status,
          message: error.message,
          type: error.type
        });
        throw new Error(`Claude API error: ${error.message}`);
      } else {
        console.error('Error in Claude API call:', error.message);
        throw new Error(`Claude API error: ${error.message}`);
      }
    }
  }

  /**
   * Stream content generation from Claude
   * 
   * @param {string} userPrompt - The prompt to send to Claude
   * @param {function} onContentChunk - Callback function that receives each content chunk
   * @param {Object} options - Same configuration options as generateContent
   * 
   * @returns {Promise<Object>} Final complete response once streaming is finished
   * @throws {Error} If API request fails
   */
  async streamContent(userPrompt, onContentChunk, options = {}) {
    try {
      const params = {
        model: options.model || 'claude-3-5-sonnet-20240620',
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt || '',
        messages: [
          { 
            role: 'user', 
            content: userPrompt 
          }
        ],
        stream: true
      };

      // Add response format if provided
      if (options.responseFormat) {
        params.response_format = options.responseFormat;
      }

      const stream = await this.anthropic.messages.create(params);
      
      let fullContent = '';
      
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.text) {
          fullContent += chunk.delta.text;
          
          if (onContentChunk && typeof onContentChunk === 'function') {
            onContentChunk(chunk.delta.text);
          }
        }
      }
      
      return {
        content: fullContent,
        model: params.model,
        // Note: Full usage stats not available in streaming mode
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.error('Claude API error:', {
          status: error.status,
          message: error.message,
          type: error.type
        });
        throw new Error(`Claude API error: ${error.message}`);
      } else {
        console.error('Error in Claude API call:', error.message);
        throw new Error(`Claude API error: ${error.message}`);
      }
    }
  }
}

export { ClaudeClient };