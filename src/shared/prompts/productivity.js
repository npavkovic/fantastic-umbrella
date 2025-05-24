export const productivityPrompt = (variables) => `Research prompt: Comprehensive analysis of the ${variables.systemName} productivity method

Conduct in-depth research on the ${variables.systemName} productivity/goal management system, focusing exclusively on information from highly-trusted sources such as:
- Peer-reviewed academic research
- Books by the system's creator(s) or recognized authorities
- Official websites or documentation
- Respected productivity publications and journals
- Established business publications (Harvard Business Review, etc.)
- National Institutes of Health (NIH)
- Psychology Today
- Case studies from reputable organizations

Organize your findings using the structure below. Each bullet may include several explanatory sentences or short paragraphs. You may omit bullets that are not relevant to the system.

1. System Overview
   - 2-3 sentence summary of the system (noting whether it's primarily for business or personal use)
   - Creator(s) and origin (when and by whom it was developed)
   - Current prominence/adoption level

2. Best For (Who benefits most from this system?)
   - Ideal user profiles
   - Optimal work contexts

3. The Problem It Solves
   - Primary challenges this system was designed to address
   - Specific productivity obstacles it helps overcome

4. Key Concepts and Components
   - Fundamental elements and terminology
   - How the components work together
   - Distinctive features compared to other systems

5. How It Works in Practice
   - Real-world application methods
   - Day-to-day usage patterns
   - Common adaptations

6. Time Horizons and Cadence
   - Short vs. long-term focus
   - Recommended review cycles and frequency
   - How it handles completed/incomplete items over time

7. Maintenance & Sustainability
   - How users maintain consistency with this system over time
   - Built-in review or accountability mechanisms
   - Strategies to avoid abandonment or underuse

8. Goal Structure and Hierarchy
   - Methods for breaking down goals (if applicable)
   - Prioritization approaches
   - Progress measurement techniques

9. Strengths and Benefits
   - Evidence-based advantages
   - Documented positive outcomes
   - User success patterns

10. Limitations and Considerations
   - Known drawbacks
   - Scenarios where it may not be ideal
   - Common implementation challenges

11. Complementary Systems
    - Compatible productivity approaches
    - Common hybrid implementations
    - Gaps it might have that other systems fill

12. Tools and Resources
    - List names and URLs of specific apps that support the system
    - Physical tools and materials, if applicable
    - Websites and online communities dedicated to the system
    - Books and publications about the system and its creator(s)

13. Success Stories
    - Noteworthy implementations
    - Objective case studies

14. Additional Notes and Anecdotes
    - Any additional information that is not covered by the above sections
    - Any anecdotes regarding the development or use of the system

15. SEO Keyword Suggestions
   - Suggested primary keyword(s) for a blog post about this system
   - Long-tail keyword variants (e.g., "${variables.systemName} daily routine", "how to use ${variables.systemName} effectively")
   - Related search queries or questions users might ask (e.g., "Is ${variables.systemName}better than 'other system'?", "What tools support ${variables.systemName}?")
   - Any keywords that align with commercial intent (e.g., "best apps for ${variables.systemName}", "download ${variables.systemName} template")

16. App Implementation Research. We're building a productivity app that should support users who want to implement the ${variables.systemName} productivity system.
   - Which features should a productivity app include to support this system?
    - How could AI assistants enhance the system's use (e.g. automated suggestions, spaced repetition, reminders)?
    - What goal/task metadata are required for a faithful implementation (e.g. labels, deadlines, review cycles)?
    - What customization or onboarding might be needed to make the app compatible with user workflows?
    - What are notable strengths and weaknesses of competing apps?
    - How has gamification been used to support the system in apps? Are there opportunities here?

Please cite all sources used, including direct links where available. Include only information that can be verified from trusted sources, and note any contradictions or areas of debate among experts. If information for certain sections is limited or not available from high-quality sources, please indicate this rather than including questionable information. Be careful to avoid integrating exaggerated claims from marketing materials. Aim for comprehensive coverage with at least 3000 words, provided in markdown format. Include only your final report, not the thinking.`; 