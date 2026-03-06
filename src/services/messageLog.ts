/**
 * Message Log Service
 * 
 * Simple structured logging of all Dory interactions.
 * This log feeds the daily digest generator.
 * Stored as JSONL (one JSON object per line) for easy appending.
 */

import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = path.resolve(__dirname, '../../data/message-logs');
const MAX_LOG_DAYS = 30;

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export interface MessageLogEntry {
  userId: string;
  userTag: string;
  username: string;
  content: string;
  reply: string;
  channel: string;
  hadKnowledgeBase: boolean;
  timestamp: string;
}

/**
 * Get today's log file path
 */
function getTodayLogPath(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `${date}.jsonl`);
}

/**
 * Append a message interaction to today's log
 */
export function logMessage(entry: MessageLogEntry): void {
  try {
    const logPath = getTodayLogPath();
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logPath, line, 'utf-8');
  } catch (error) {
    console.error('❌ Failed to log message:', error);
  }
}

/**
 * Read all log entries for a specific date
 */
export function readLogForDate(date: string): MessageLogEntry[] {
  const logPath = path.join(LOG_DIR, `${date}.jsonl`);

  if (!fs.existsSync(logPath)) return [];

  try {
    const content = fs.readFileSync(logPath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as MessageLogEntry);
  } catch (error) {
    console.error(`❌ Failed to read log for ${date}:`, error);
    return [];
  }
}

/**
 * Read yesterday's log entries (for daily digest)
 */
export function readYesterdayLog(): MessageLogEntry[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split('T')[0];
  return readLogForDate(date);
}

/**
 * Format log entries as readable text for the digest LLM
 */
export function formatLogForDigest(entries: MessageLogEntry[]): string {
  if (entries.length === 0) return 'No messages logged in the past 24 hours.';

  return entries.map(e => {
    const time = new Date(e.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Hong_Kong'
    });
    const kbTag = e.hadKnowledgeBase ? '[KB match]' : '[No KB match]';
    return `[${time}] #${e.channel} | ${e.username}: "${e.content}"\n  → Dory ${kbTag}: "${e.reply}"`;
  }).join('\n\n');
}

/**
 * Cleanup old log files (keep last N days)
 */
export function cleanupOldLogs(): void {
  try {
    const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.jsonl')).sort();
    if (files.length <= MAX_LOG_DAYS) return;

    const toDelete = files.slice(0, files.length - MAX_LOG_DAYS);
    for (const file of toDelete) {
      fs.unlinkSync(path.join(LOG_DIR, file));
      console.log(`🗑️ Deleted old log: ${file}`);
    }
  } catch (error) {
    console.error('❌ Log cleanup failed:', error);
  }
}
