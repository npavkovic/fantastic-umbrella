#!/usr/bin/env node
require('dotenv').config();
const { program } = require('commander');
const ResearchCommand = require('./commands/research');
const DraftwriterCommand = require('./commands/draftwriter');

program
  .name('editorialworkflow')
  .description('Notion to Perplexity editorial workflow tools')
  .version('1.0.0');

program
  .command('research')
  .description('Run the research workflow to generate research briefs from blog post topics')
  .option('-d, --dry-run', 'Run in dry-run mode (no API calls)')
  .option('-t, --topic-id <id>', 'Process a specific topic by ID')
  .option('-s, --single-item', 'Process only the first available item')
  .action((options) => {
    const command = new ResearchCommand({
      dryRun: options.dryRun,
      topicId: options.topicId,
      singleItem: options.singleItem
    });
    command.execute().catch(err => {
      console.error('Failed to execute research command:', err);
      process.exit(1);
    });
  });

program
  .command('draftwriter')
  .description('Run the draft writing workflow to generate blog drafts from research briefs')
  .option('-d, --dry-run', 'Run in dry-run mode (no API calls)')
  .option('-i, --draft-id <id>', 'Process a specific draft by ID')
  .option('-s, --single-item', 'Process only the first available item')
  .action((options) => {
    const command = new DraftwriterCommand({
      dryRun: options.dryRun,
      draftId: options.draftId,
      singleItem: options.singleItem
    });
    command.execute().catch(err => {
      console.error('Failed to execute draftwriter command:', err);
      process.exit(1);
    });
  });

program.parse(); 