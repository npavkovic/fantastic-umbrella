# Editorial Workflow GitHub Actions

A GitHub Actions implementation of the automated editorial workflow system that manages blog content through a series of status-based transitions. This system replaces the original JavaScript-based timed workflow with an event-driven approach.

## Overview

The Editorial Workflow GitHub Actions system automates the process of researching topics and generating blog drafts using AI. It operates through two main stages:

1. **Research Stage**
   - Monitors files with status "Ready for Research"
   - Updates status to "Research In Progress"
   - Uses Perplexity AI to research the topic
   - Adds citations and research content to the file
   - Updates status to "Ready for Draft" when complete
   - If errors occur, marks status as "Error" with error details

2. **Draft Writing Stage**
   - Monitors files with status "Ready for Draft"
   - Updates status to "Draft In Progress"
   - Uses Claude AI to generate a blog post based on research
   - Creates a new draft file with status "Ready for Review"
   - Updates original research file status to "Draft Complete"
   - If errors occur, marks status as "Error" with error details

## Key Features

- **Event-driven architecture**: Triggers workflows based on content status changes
- **Modular design**: Separate actions for research and draft writing
- **Secure secret management**: Uses GitHub Secrets for API keys
- **Comprehensive error handling**: Structured error reporting and recovery
- **No JSON dependencies**: Status tracking through Notion database queries
- **Scheduled monitoring**: Periodic checks for content ready for processing

## Documentation

- [Architecture](./docs/ARCHITECTURE.md): System design, event flows, and component interactions
- [Installation](./docs/INSTALLATION.md): Step-by-step setup guide for GitHub Actions
- [Programming Decisions](./docs/PROGRAMMING-DECISIONS.md): Technical decisions and rationale
- [Enhancements](./docs/ENHANCEMENTS.md): Future improvement suggestions

## System Integration

The workflow integrates with:

- GitHub for workflow orchestration and version control
- Notion for content management and status tracking
- Perplexity AI for research generation
- Claude AI for content generation

## License

ISC

## Author

Nicholas Pavkovic (Original System)  
Devin AI (GitHub Actions Implementation)
