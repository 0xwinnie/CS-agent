/**
 * Feedback Report Service
 * Generates daily reports of user feedback from community
 */

import * as fs from 'fs';
import * as path from 'path';

const PASSIVE_FEEDBACK_PATH = path.resolve(__dirname, '../../data/passive-feedback.json');
const DAILY_REPORTS_PATH = path.resolve(__dirname, '../../data/daily-reports');

// Ensure reports directory exists
if (!fs.existsSync(DAILY_REPORTS_PATH)) {
  fs.mkdirSync(DAILY_REPORTS_PATH, { recursive: true });
}

interface FeedbackEntry {
  id: string;
  userId: string;
  userTag: string;
  message: string;
  category: string;
  confidence: number;
  matchedKeywords: string[];
  isQuestion: boolean;
  timestamp: string;
  source: string;
}

interface DailyReport {
  date: string;
  generatedAt: string;
  summary: {
    totalFeedback: number;
    newFeedback: number; // Since last report
    byCategory: Record<string, number>;
    byHour: Record<string, number>;
  };
  highlights: {
    topIssues: Array<{ category: string; count: number; examples: string[] }>;
    newKeywords: string[];
    trendingTopics: string[];
  };
  details: FeedbackEntry[];
  actionItems: string[];
}

/**
 * Load all passive feedback entries
 */
function loadAllFeedback(): FeedbackEntry[] {
  try {
    if (!fs.existsSync(PASSIVE_FEEDBACK_PATH)) {
      return [];
    }
    const data = fs.readFileSync(PASSIVE_FEEDBACK_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load feedback:', error);
    return [];
  }
}

/**
 * Get feedback from specific date range
 */
function getFeedbackFromDate(feedback: FeedbackEntry[], startDate: Date, endDate: Date): FeedbackEntry[] {
  return feedback.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= startDate && entryDate < endDate;
  });
}

/**
 * Get yesterday's date range
 */
function getYesterdayRange(): { start: Date; end: Date } {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  return { start: yesterday, end: today };
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate daily feedback report
 */
export function generateDailyReport(): DailyReport {
  const allFeedback = loadAllFeedback();
  const { start, end } = getYesterdayRange();
  const yesterdayFeedback = getFeedbackFromDate(allFeedback, start, end);
  
  // Calculate summary
  const byCategory: Record<string, number> = {};
  const byHour: Record<string, number> = {};
  const keywordCounts: Record<string, number> = {};
  
  for (const entry of yesterdayFeedback) {
    // Category count
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    
    // Hour count
    const hour = new Date(entry.timestamp).getHours();
    byHour[`${hour}:00`] = (byHour[`${hour}:00`] || 0) + 1;
    
    // Keyword frequency
    for (const keyword of entry.matchedKeywords) {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    }
  }
  
  // Top issues (top 3 categories)
  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  const topIssues = sortedCategories.map(([category, count]) => ({
    category,
    count,
    examples: yesterdayFeedback
      .filter(f => f.category === category)
      .slice(0, 3)
      .map(f => f.message.substring(0, 80) + (f.message.length > 80 ? '...' : ''))
  }));
  
  // Trending topics (top 5 keywords)
  const trendingTopics = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyword]) => keyword);
  
  // Action items based on feedback (ENGLISH for work communication)
  const actionItems: string[] = [];
  if (byCategory['performance'] > 2) {
    actionItems.push('🚨 Performance issues reported multiple times - prioritize investigation');
  }
  if (byCategory['bug'] > 2) {
    actionItems.push('🐛 Bug reports increasing - engineering team attention needed');
  }
  if (byCategory['confusion'] > 3) {
    actionItems.push('❓ User confusion high - consider improving docs or UI');
  }
  if (byCategory['feature'] > 2) {
    actionItems.push('💡 Feature suggestions received - product team should review');
  }
  if (actionItems.length === 0 && yesterdayFeedback.length > 0) {
    actionItems.push('✅ Normal day - no urgent issues detected');
  }
  
  const report: DailyReport = {
    date: formatDate(start),
    generatedAt: new Date().toISOString(),
    summary: {
      totalFeedback: allFeedback.length,
      newFeedback: yesterdayFeedback.length,
      byCategory,
      byHour
    },
    highlights: {
      topIssues,
      newKeywords: [], // Could implement compared to previous day
      trendingTopics
    },
    details: yesterdayFeedback,
    actionItems
  };
  
  // Save report
  const reportPath = path.join(DAILY_REPORTS_PATH, `${report.date}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📊 Daily report generated: ${report.date} (${yesterdayFeedback.length} feedback entries)`);
  
  return report;
}

/**
 * Format report as markdown for human reading (ENGLISH - Work Language)
 */
export function formatReportAsMarkdown(report: DailyReport): string {
  const lines: string[] = [
    `# 📊 SNS Community Feedback Report - ${report.date}`,
    '',
    `> Generated: ${new Date(report.generatedAt).toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' })}`,
    '',
    '---',
    '',
    '## 📈 Summary',
    '',
    `- **New Feedback (Yesterday)**: ${report.summary.newFeedback} entries`,
    `- **Total Feedback Collected**: ${report.summary.totalFeedback} entries`,
    ''
  ];

  // Category breakdown
  if (Object.keys(report.summary.byCategory).length > 0) {
    lines.push('### By Category', '');
    const categoryLabels: Record<string, string> = {
      performance: 'Performance Issues',
      bug: 'Bug Reports',
      ui: 'UI/UX Issues',
      feature: 'Feature Requests',
      confusion: 'User Confusion',
      complaint: 'Complaints',
      general: 'General Feedback',
      compliment: 'Compliments'
    };
    const categoryEmojis: Record<string, string> = {
      performance: '⚡',
      bug: '🐛',
      ui: '🎨',
      feature: '💡',
      confusion: '❓',
      complaint: '😞',
      general: '📝',
      compliment: '👍'
    };

    for (const [category, count] of Object.entries(report.summary.byCategory).sort((a, b) => b[1] - a[1])) {
      const emoji = categoryEmojis[category] || '📋';
      const label = categoryLabels[category] || category;
      lines.push(`- ${emoji} **${label}**: ${count}`);
    }
    lines.push('');
  }

  // Top issues
  if (report.highlights.topIssues.length > 0) {
    lines.push('---', '', '## 🔥 Top Issues', '');
    
    for (const issue of report.highlights.topIssues) {
      const emojiMap: Record<string, string> = {
        performance: '⚡',
        bug: '🐛',
        ui: '🎨',
        feature: '💡',
        confusion: '❓',
        complaint: '😞'
      };
      const labelMap: Record<string, string> = {
        performance: 'Performance',
        bug: 'Bug Reports',
        ui: 'UI/UX',
        feature: 'Feature Requests',
        confusion: 'User Confusion',
        complaint: 'Complaints'
      };
      const emoji = emojiMap[issue.category] || '📋';
      const label = labelMap[issue.category] || issue.category;

      lines.push(`### ${emoji} ${label} (${issue.count} reports)`, '');
      lines.push('**Examples:**');
      for (const example of issue.examples) {
        lines.push(`- ${example}`);
      }
      lines.push('');
    }
  }

  // Trending topics
  if (report.highlights.trendingTopics.length > 0) {
    lines.push('---', '', '## 📌 Trending Keywords', '');
    lines.push(report.highlights.trendingTopics.map(k => `\`${k}\``).join(' • '));
    lines.push('');
  }

  // Action items
  if (report.actionItems.length > 0) {
    lines.push('---', '', '## ✅ Recommended Actions', '');
    for (const item of report.actionItems) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Raw feedback (limited)
  if (report.details.length > 0) {
    lines.push('---', '', '## 📝 Recent Feedback (Last 10)', '');

    for (let i = 0; i < Math.min(10, report.details.length); i++) {
      const fb = report.details[i];
      const time = new Date(fb.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Hong_Kong' });
      lines.push(`${i + 1}. **[${fb.category}]** ${time} - ${fb.userTag}`);
      lines.push(`   > ${fb.message.substring(0, 100)}${fb.message.length > 100 ? '...' : ''}`);
      lines.push('');
    }
  }

  lines.push('---', '', '> 🤖 Generated by CS Agent | SNS Community');

  return lines.join('\n');
}

/**
 * Generate and save markdown report
 */
export function generateAndSaveMarkdownReport(): string {
  const report = generateDailyReport();
  const markdown = formatReportAsMarkdown(report);
  
  const reportPath = path.join(DAILY_REPORTS_PATH, `${report.date}.md`);
  fs.writeFileSync(reportPath, markdown);
  
  console.log(`📝 Markdown report saved: ${reportPath}`);
  return markdown;
}

/**
 * Get latest report
 */
export function getLatestReport(): DailyReport | null {
  try {
    const files = fs.readdirSync(DAILY_REPORTS_PATH)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (files.length === 0) return null;
    
    const latestPath = path.join(DAILY_REPORTS_PATH, files[0]);
    const data = fs.readFileSync(latestPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load latest report:', error);
    return null;
  }
}
