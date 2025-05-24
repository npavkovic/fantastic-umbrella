import { PerplexityConfig, ResearchResult } from '../types';

export class PerplexityClient {
  private config: PerplexityConfig;

  constructor(config: PerplexityConfig) {
    this.config = config;
  }

  /**
   * Generate research content using Perplexity AI
   */
  async generateResearch(topic: string, existingContent?: string): Promise<ResearchResult> {
    const prompt = this.buildResearchPrompt(topic, existingContent);
    
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'sonar-deep-research',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: this.config.temperature || 0.2,
          max_tokens: this.config.maxTokens || 7000,
          search_domain_filter: this.config.searchDomains || [
            '-reddit.com',
            '-pinterest.com',
            '-quora.com',
            '-medium.com',
            '-wikipedia.org'
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = (data as any).choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content returned from Perplexity API');
      }

      return this.parseResearchResponse(content);
    } catch (error) {
      throw new Error(`Failed to generate research: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildResearchPrompt(topic: string, existingContent?: string): string {
    const basePrompt = `
Research the topic: "${topic}"

Please provide a comprehensive research overview that includes:

1. **Executive Summary** (2-3 paragraphs)
   - Key insights and main findings
   - Current state and trends
   - Why this topic matters

2. **Detailed Analysis** (4-6 paragraphs)
   - In-depth exploration of key concepts
   - Current developments and innovations
   - Challenges and opportunities
   - Expert perspectives and case studies

3. **Practical Applications** (2-3 paragraphs)
   - Real-world implementations
   - Best practices and recommendations
   - Tools and resources

4. **Future Outlook** (1-2 paragraphs)
   - Emerging trends
   - Predictions and implications

Please ensure all information is current, accurate, and well-sourced. Include specific examples and data where relevant.

Format the response in clear sections with appropriate headers.
`;

    if (existingContent) {
      return `${basePrompt}

Note: There is existing content on this topic:
${existingContent}

Please expand on this existing content rather than duplicating it.`;
    }

    return basePrompt;
  }

  private parseResearchResponse(content: string): ResearchResult {
    // Extract citations from the content
    const citationRegex = /\[(\d+)\]/g;
    const citations: string[] = [];
    let match;
    
    while ((match = citationRegex.exec(content)) !== null) {
      citations.push(match[1]);
    }

    // Extract summary (first paragraph or executive summary section)
    const summaryMatch = content.match(/(?:Executive Summary|Summary)[:\n](.*?)(?:\n\n|\n#)/s);
    const summary = summaryMatch ? summaryMatch[1].trim() : content.substring(0, 300) + '...';

    return {
      content,
      citations: [...new Set(citations)], // Remove duplicates
      summary,
    };
  }
}
