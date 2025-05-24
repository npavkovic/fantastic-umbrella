#!/usr/bin/env node

/**
 * Timed Editorial Workflow
 * 
 * Runs the research and draftwriter processes at regular intervals,
 * processing one item at a time to avoid long-running processes
 * and to prevent API rate limit issues.
 */

require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

// Configuration
const INTERVAL_MINUTES = 5;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

// Get the command line arguments
const args = process.argv.slice(2);
const runResearch = !args.includes('--no-research');
const runDraftwriter = !args.includes('--no-draftwriter');

console.log(`
Timed Editorial Workflow
------------------------
Interval: ${INTERVAL_MINUTES} minutes
Research: ${runResearch ? 'Enabled' : 'Disabled'}
Draftwriter: ${runDraftwriter ? 'Enabled' : 'Disabled'}
`);

/**
 * Run a command with the specified arguments
 * @param {string} command - The command to run
 * @param {Array} args - Command arguments
 * @returns {Promise} - Resolves when the command completes
 */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Command completed successfully`);
        resolve();
      } else {
        console.error(`Command failed with code ${code}`);
        // We resolve anyway to continue the workflow
        resolve();
      }
    });
    
    childProcess.on('error', (err) => {
      console.error(`Failed to start command: ${err.message}`);
      // We resolve anyway to continue the workflow
      resolve();
    });
  });
}

/**
 * Run the workflow one time
 */
async function runWorkflow() {
  const startTime = new Date();
  console.log(`\n=== Starting workflow at ${startTime.toLocaleTimeString()} ===`);
  
  try {
    // Run research if enabled
    if (runResearch) {
      await runCommand('node', [
        path.join(__dirname, '../index.js'),
        'research',
        '--single-item'
      ]);
    }
    
    // Run draftwriter if enabled
    if (runDraftwriter) {
      await runCommand('node', [
        path.join(__dirname, '../index.js'),
        'draftwriter',
        '--single-item'
      ]);
    }
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    console.log(`\n=== Workflow completed at ${endTime.toLocaleTimeString()} (${duration.toFixed(1)}s) ===`);
  } catch (error) {
    console.error('Error in workflow:', error);
  }
  
  // Schedule the next run
  console.log(`\nNext run scheduled in ${INTERVAL_MINUTES} minutes`);
}

// Run immediately on start
runWorkflow();

// Set up interval for repeated runs
setInterval(runWorkflow, INTERVAL_MS);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nGracefully shutting down...');
  process.exit(0);
}); 