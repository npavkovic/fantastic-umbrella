import { ClaudeConfig, DraftResult } from '../types';

export class ClaudeClient {
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = config;
  }

  /**
   * Generate a blog post draft using Claude AI
   */
  async generateDraft(
    title: string, 
    researchContent: string, 
    targetAudience?: string
  ): Promise<DraftResult> {
    const prompt = this.buildDraftPrompt(title, researchContent, targetAudience);
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-3-sonnet-20240229',
          max_tokens: this.config.maxTokens || 4000,
          temperature: this.config.temperature || 0.7,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = (data as any).content?.[0]?.text;
      
      if (!content) {
        throw new Error('No content returned from Claude API');
      }

      return this.parseDraftResponse(content, title);
    } catch (error) {
      throw new Error(`Failed to generate draft: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildDraftPrompt(
    title: string, 
    researchContent: string, 
    targetAudience?: string
  ): string {
    const audienceSection = targetAudience 
      ? `Target Audience: ${targetAudience}`
      : 'Target Audience: General tech-savvy readers interested in practical insights';

    return `
You are a skilled technical writer tasked with creating an engaging blog post based on research content.

Title: "${title}"
${audienceSection}

Research Content:
${researchContent}

Please write a comprehensive blog post that:

1. **Hook & Introduction** (150-200 words)
   - Start with an engaging hook or compelling statistic
   - Clearly state what the reader will learn
   - Provide context for why this topic matters

2. **Main Content** (800-1200 words)
   - Structure content with clear H2 and H3 headings
   - Use practical examples and real-world applications
   - Include actionable insights and recommendations
   - Break up text with bullet points or numbered lists where appropriate
   - Maintain a conversational yet professional tone

3. **Conclusion** (100-150 words)
   - Summarize key takeaways
   - Provide next steps or call-to-action
   - End with a thought-provoking question or statement

Writing Guidelines:
- Use active voice and clear, concise sentences
- Include relevant keywords naturally
- Make technical concepts accessible
- Add personality while maintaining professionalism
- Ensure smooth transitions between sections
- Aim for 1000-1500 total words

Format the output as clean markdown with proper headers and formatting.
`;
  }

  private parseDraftResponse(content: string, title: string): DraftResult {
    // Count words (approximate)
    const wordCount = content.split(/\s+/).length;
    
    // Extract the actual title from content if different
    const titleMatch = content.match(/^#\s+(.+)/m);
    const extractedTitle = titleMatch ? titleMatch[1] : title;

    return {
      content,
      wordCount,
      title: extractedTitle,
    };
  }
}
