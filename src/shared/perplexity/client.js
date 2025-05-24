/**
 * PerplexityClient - A client for the Perplexity Sonar API
 * 
 * The Perplexity API offers powerful AI models with built-in web search capabilities,
 * allowing for real-time, cited responses. This client provides methods to interact
 * with the API for research and content generation.
 * 
 * Available models:
 * - sonar: Lightweight model optimized for speed, with real-time web search
 * - sonar-pro: Advanced model with more comprehensive search capabilities, handles complex queries
 * - sonar-deep-research: Model designed for in-depth research with extensive web search
 * - sonar-reasoning: Model with explicit step-by-step reasoning capabilities
 * - sonar-reasoning-pro: Advanced reasoning model with improved performance
 * - r1-1776: Offline chat model without web search (training data only)
 */
import axios from 'axios';

class PerplexityClient {
  /**
   * Create a new PerplexityClient instance
   * @param {string} apiKey - Your Perplexity API key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.perplexity.ai';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Performs research on a given topic using Perplexity's search capabilities
   * 
   * @param {string} prompt - The system prompt for the model
   * @param {Object} options - Configuration options
   * @param {string} [options.model='sonar'] - Model to use (sonar, sonar-pro, etc.)
   * @param {number} [options.temperature=0.7] - Controls randomness (0-1)
   * @param {number} [options.maxTokens=1000] - Maximum tokens in response
   * @param {boolean} [options.stream=false] - Whether to stream the response
   * 
   * @param {Array<string>} [options.searchDomains] - List of domains to include/exclude from search
   *   Include domains with just the domain name: ["wikipedia.org", "nasa.gov"]
   *   Exclude domains with a minus prefix: ["-pinterest.com", "-reddit.com"]
   *   Maximum 10 domains permitted
   * 
   * @param {string} [options.afterDate] - Only include results after this date (format: "MM/DD/YYYY")
   * @param {string} [options.beforeDate] - Only include results before this date (format: "MM/DD/YYYY")
   * @param {string} [options.recencyFilter] - Time filter for results ("month", "week", "day", "hour")
   * 
   * @param {string} [options.contextSize] - Amount of search context to retrieve ("low", "medium", "high")
   *   - "low": More cost-efficient, fewer search results
   *   - "medium": Balanced approach
   *   - "high": More comprehensive but higher cost
   * 
   * @param {Object} [options.responseFormat] - Specify response format
   *   Example: { "type": "json_object" } to get JSON responses
   * 
   * @param {Array<string>} [options.userLocation] - User location for geo-aware searches
   *   Format: [latitude, longitude], e.g. ["37.7749", "-122.4194"] for San Francisco
   * 
   * @returns {Promise<Object>} Response containing content, usage statistics, and model info
   * @throws {Error} If API request fails
   */
  async researchTopic(prompt, options = {}) {
    try {
      const requestBody = {
        model: options.model || 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a meticulous research assistant specializing in productivity systems and methodologies. Your task is to provide comprehensive, evidence-based information about productivity frameworks, techniques, and tools.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 5000,
        stream: options.stream || false
      };

      // Add search domain filters if provided
      if (options.searchDomains) {
        requestBody.search_domain_filter = options.searchDomains;
      }

      // Add date range filters if provided
      if (options.afterDate) {
        requestBody.search_after_date_filter = options.afterDate;
      }
      if (options.beforeDate) {
        requestBody.search_before_date_filter = options.beforeDate;
      }
      if (options.recencyFilter) {
        requestBody.search_recency_filter = options.recencyFilter;
      }

      // Add search context size if provided
      if (options.contextSize) {
        requestBody.web_search_options = {
          search_context_size: options.contextSize
        };
      }

      // Add response format if provided
      if (options.responseFormat) {
        requestBody.response_format = options.responseFormat;
      }
      
      // Add user location if provided
      if (options.userLocation) {
        requestBody.user_location = options.userLocation;
      }

      const response = await this.client.post('/chat/completions', requestBody);

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
        // API error response
        console.error('Perplexity API error:', {
          status: error.response.status,
          data: error.response.data
        });
        throw new Error(`Perplexity API error: ${error.response.data.error?.message || error.message}`);
      } else if (error.request) {
        // No response received
        console.error('No response from Perplexity API');
        throw new Error('No response received from Perplexity API');
      } else {
        // Other errors
        console.error('Error in Perplexity API call:', error.message);
        throw new Error(`Perplexity API error: ${error.message}`);
      }
    }
  }
}

export { PerplexityClient };