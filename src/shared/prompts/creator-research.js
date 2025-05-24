export const creatorResearchPrompt = (variables) => `Research prompt: Comprehensive biography and legacy of ${variables.creatorName}, creator of the ${variables.systemName} productivity method

Conduct in-depth research on ${variables.creatorName}, the originator(s) of the ${variables.systemName} time or productivity management system. Focus exclusively on information from highly trusted sources, such as:
- Books and writings by ${variables.creatorName}
- Peer-reviewed academic research or biographies
- Interviews and talks by the creator
- Respected publications in business, psychology, or productivity (e.g. Harvard Business Review, Psychology Today)
- Reputable news coverage or case studies from organizations that implemented the system

If there are notable co-creators, early collaborators, or later popularizers (e.g. ${variables.coContributors}), include their influence under "Legacy: The System in Other Hands."

Organize your findings using the structure below. Each bullet should be treated as a section heading and may include several explanatory paragraphs of full prose. Do not summarize in a single sentence unless the section is inherently brief. If a section is not applicable or lacks credible information, note this clearly rather than speculating or including questionable material.

1. Creator Overview
   - Full name, dates (if available), and relevant personal background
   - Field(s) of expertise or profession prior to creating the system
   - Unique personality traits, formative life events, or contradictions that shaped their thinking

2. Motivation and Origin Story
   - The specific problem or personal struggle that led to the system's creation
   - Social, professional, or cultural conditions that shaped their view of time and work
   - Any epiphanies or breakthrough moments in their story

3. Philosophical and Psychological Foundations
   - Stated beliefs about time, attention, motivation, purpose, or human behavior
   - Influences from psychology, religion, design, business, or culture
   - Comparison to other thinkers or productivity systems, if applicable

4. Overview of the ${variables.systemName} System
   - Brief summary of the system's principles and mechanics (as described by the creator)
   - The language and framing used by the creator to describe their method

5. Reception and Cultural Impact
   - Initial reception of the method (popular, niche, ignored, etc.)
   - How the creator spread their ideas (books, workshops, software, etc.)
   - Communities or demographics most influenced by the system

6. Life After the System
   - Later work, evolution of their thinking, or personal reflections
   - Any criticism they addressed or changes they made
   - Current status (living/legacy, ongoing projects, or cultural revival)

7. Legacy: The System in Other Hands
   - Notable figures or companies who popularized, evolved, or adapted the system (e.g., ${variables.coContributors})
   - How those adaptations differed from the original intent
   - Did the creator approve, collaborate, or object?
   - How the system's cultural meaning shifted in other contexts

8. Quotable Moments
   - 2–5 short, compelling quotes that reflect their tone, worldview, or personality
   - Cite source (book, interview, video, etc.)

9. Notable Anecdotes and Side Details
   - Interesting, unexpected, or humanizing stories from their life
   - Hobbies, failures, detours, controversies — anything that gives dimension

10. Additional Notes
   - Any information not captured above but relevant for understanding the creator's influence or legacy
   - Gaps in the historical record or areas of controversy

Please cite all sources used, including direct links wherever possible. Do not include exaggerated claims from unverified or promotional sources. Aim for depth, nuance, and narrative richness, with a minimum of 3000 words. Provide your final report in markdown format. Include only the report — no outline, summary, or explanation of your process.`;
