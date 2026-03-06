/**
 * Daily Digest Generator — Refactored
 * 
 * Reads the message log → sends to LLM with DIGEST_PROMPT.md → outputs markdown.
 * No hardcoded statistics or keyword counting.
 * The LLM does the analysis, guided by the digest prompt.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateDigest } from './ai';
import { readYesterdayLog, formatLogForDigest, cleanupOldLogs } from './messageLog';

const REPORTS_DIR = path.resolve(__dirname, '../../data/daily-reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate the daily digest
 * Called by cron or manual trigger
 */
export async function generateDailyDigest(): Promise<string> {
  console.log('📊 Generating daily digest...');

  // 1. Read yesterday's message log
  const entries = readYesterdayLog();

  if (entries.length === 0) {
    const quietReport = `# 📊 SNS Community Digest — ${getYesterdayDate()}\n\nQuiet day — no support interactions logged.`;
    saveReport(quietReport);
    console.log('📊 Quiet day — no messages to analyze');
    return quietReport;
  }

  console.log(`📊 Analyzing ${entries.length} interactions...`);

  // 2. Format log entries for the LLM
  const formattedLog = formatLogForDigest(entries);

  // 3. Add metadata header
  const logWithMeta = `Date: ${getYesterdayDate()}\nTotal interactions: ${entries.length}\nChannels: ${[...new Set(entries.map(e => e.channel))].join(', ')}\nUnique users: ${new Set(entries.map(e => e.userId)).size}\n\n---\n\n${formattedLog}`;

  // 4. Send to LLM with DIGEST_PROMPT.md as system prompt
  const digest = await generateDigest(logWithMeta);

  // 5. Save report
  saveReport(digest);

  // 6. Cleanup old logs
  cleanupOldLogs();

  console.log(`✅ Daily digest generated (${digest.length} chars)`);
  return digest;
}

/**
 * Save report to disk
 */
function saveReport(content: string): void {
  const date = getYesterdayDate();
  const reportPath = path.join(REPORTS_DIR, `${date}.md`);

  try {
    fs.writeFileSync(reportPath, content, 'utf-8');
    console.log(`📝 Report saved: ${reportPath}`);
  } catch (error) {
    console.error('❌ Failed to save report:', error);
  }
}

/**
 * Get yesterday's date as YYYY-MM-DD
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Get latest report content (for manual viewing)
 */
export function getLatestReport(): string | null {
  try {
    const files = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    return fs.readFileSync(path.join(REPORTS_DIR, files[0]), 'utf-8');
  } catch {
    return null;
  }
}
