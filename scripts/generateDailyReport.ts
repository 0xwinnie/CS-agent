#!/usr/bin/env node
/**
 * Daily Feedback Report Generator
 * Run this script daily to generate user feedback reports
 * Usage: node scripts/generateDailyReport.js
 */

import { generateAndSaveMarkdownReport } from '../src/services/feedbackReport';

console.log('📊 Generating daily feedback report...\n');

try {
  const markdown = generateAndSaveMarkdownReport();
  
  console.log('\n✅ Report generated successfully!\n');
  console.log('---');
  console.log(markdown);
  
} catch (error) {
  console.error('❌ Failed to generate report:', error);
  process.exit(1);
}
