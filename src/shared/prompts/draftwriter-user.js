export const draftwriterUserPrompt = (variables) => `Your task is to write a 1800-2500 word blog post based on the structured research report provided below about the "${variables.systemName}" productivity method.

GOAL:
Create a blog article that introduces this system to knowledge workers, freelancers, students, and productivity enthusiasts. Your job is to:
- Explain how it works
- Highlight who it's for
- Help readers decide if it fits their goals
- Optimize for search engines while maintaining readability

Structure Guidelines:
Use these EXACT standardized headers to maintain consistency across our series:

1. Title: "What is ${variables.systemName}? A guide to the ${variables.systemName} productivity method"
2. Tagline: Create a single compelling sentence that will appear in larger type beneath the title
3. Introduction (no header needed):
   - Begin with a relatable hook about a productivity challenge
   - Include a clear 40-60 word definition of what ${variables.systemName} is
   - Briefly introduce why it's worth exploring

4. "The Problem ${variables.systemName} Solves"
   - Explicitly describe the productivity challenges this system was designed to address
   - Explain how it differs from other approaches

5. "How ${variables.systemName} Works"
   - Explain key components, workflow, and terminology
   - Describe typical use patterns and timeframes

6. "Who Should Use ${variables.systemName}?"
   - Identify ideal user types
   - Describe work/life contexts where this method excels

7. "Benefits and Limitations of ${variables.systemName}"
   - Summarize evidence-based strengths and use cases
   - Honestly address weaknesses, difficulties, or criticisms

8. "Maintaining ${variables.systemName} Long-Term"
   - Discuss strategies to prevent abandonment or burnout
   - Include accountability mechanisms and consistency techniques

9. "Getting Started with ${variables.systemName}"
   - Offer practical tips for beginners
   - List notable apps, templates, or tools

10. "Frequently Asked Questions About ${variables.systemName}"
    - Include 3-5 questions based on common searches
    - Answer each in 2-4 sentences
    - Include a question about integration with other productivity systems

Format Requirements:
- Use markdown formatting
- Include bullet points and bold formatting for key concepts
- Include footnote citations referencing the source materials
- Write as an expert who has thoroughly studied this system

SEO Integration:
Below the research content, you'll find "SEO Keyword Suggestions" with keywords and related queries.
- Include the primary keyword in the title, tagline, and introduction
- Incorporate long-tail keywords naturally within paragraphs and any H3 subheadings
- Address related queries directly in the FAQ section
- Maintain a natural, helpful tone—do not keyword-stuff

SOURCE MATERIAL STARTS BELOW
${variables.researchContent}
SOURCE MATERIAL ENDS`; 