/**
 * Enhanced Daily Report Generator
 * Comprehensive community analysis with actionable insights
 */

import * as fs from 'fs';
import * as path from 'path';

const DAILY_REPORTS_PATH = path.resolve(__dirname, '../../data/daily-reports');

// Ensure reports directory exists
if (!fs.existsSync(DAILY_REPORTS_PATH)) {
  fs.mkdirSync(DAILY_REPORTS_PATH, { recursive: true });
}

interface MessageEntry {
  id: string;
  userId: string;
  userTag: string;
  username: string;
  content: string;
  channel: string;
  timestamp: string;
  hasMention: boolean;
  isReply: boolean;
}

interface UserActivity {
  userId: string;
  userTag: string;
  messageCount: number;
  channels: string[];
  topics: string[];
  lastActive: string;
}

interface TopicCluster {
  topic: string;
  messageCount: number;
  participants: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
}

interface ProductFeedback {
  type: 'bug' | 'feature' | 'performance' | 'confusion' | 'complaint' | 'question';
  severity: 'critical' | 'high' | 'medium' | 'low';
  user: string;
  content: string;
  timestamp: string;
  status: 'new' | 'acknowledged' | 'resolved' | 'pending';
  resolution?: string;
}

interface DailyReport {
  date: string;
  generatedAt: string;
  timeRange: { start: string; end: string };
  
  // Community Overview
  community: {
    totalMessages: number;
    activeUsers: number;
    newUsers: number;
    topChannels: Array<{ name: string; messages: number }>;
  };
  
  // User Activity
  userActivity: {
    mostActive: UserActivity[];
    returningUsers: string[];
    newJoiners: string[];
  };
  
  // Topic Analysis
  topics: {
    clusters: TopicCluster[];
    trending: string[];
    unanswered: string[];
  };
  
  // Product Feedback (The Core)
  productFeedback: {
    critical: ProductFeedback[];
    high: ProductFeedback[];
    medium: ProductFeedback[];
    low: ProductFeedback[];
    resolved: ProductFeedback[];
    totalUnresolved: number;
  };
  
  // AI Interactions
  aiInteractions: {
    totalHandled: number;
    quickResolved: Array<{ issue: string; solution: string; user: string }>;
    escalated: string[];
  };
  
  // Action Items
  actionItems: Array<{
    priority: 'urgent' | 'high' | 'normal';
    category: string;
    description: string;
    suggestedOwner: string;
    relatedFeedback: string[];
  }>;
}

/**
 * Generate comprehensive daily report
 */
export async function generateEnhancedReport(): Promise<DailyReport> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // This would load from actual message logs
  // For now, creating structure
  const report: DailyReport = {
    date: yesterday.toISOString().split('T')[0],
    generatedAt: now.toISOString(),
    timeRange: {
      start: yesterday.toISOString(),
      end: now.toISOString()
    },
    
    community: {
      totalMessages: 0,
      activeUsers: 0,
      newUsers: 0,
      topChannels: []
    },
    
    userActivity: {
      mostActive: [],
      returningUsers: [],
      newJoiners: []
    },
    
    topics: {
      clusters: [],
      trending: [],
      unanswered: []
    },
    
    productFeedback: {
      critical: [],
      high: [],
      medium: [],
      low: [],
      resolved: [],
      totalUnresolved: 0
    },
    
    aiInteractions: {
      totalHandled: 0,
      quickResolved: [],
      escalated: []
    },
    
    actionItems: []
  };
  
  return report;
}

/**
 * Format enhanced report as markdown
 */
export function formatEnhancedReport(report: DailyReport): string {
  const lines: string[] = [
    `# 📊 SNS Community Daily Report`,
    `**Date:** ${report.date} | **Generated:** ${new Date(report.generatedAt).toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' })}`,
    '',
    '---',
    ''
  ];
  
  // Executive Summary
  lines.push(
    '## 🎯 Executive Summary',
    '',
    `- **Total Messages:** ${report.community.totalMessages}`,
    `- **Active Users:** ${report.community.activeUsers}`,
    `- **New Joiners:** ${report.community.newUsers}`,
    `- **Product Feedback Items:** ${report.productFeedback.totalUnresolved} unresolved`,
    `- **AI Quick Resolutions:** ${report.aiInteractions.quickResolved.length}`,
    ''
  );
  
  // Critical Issues (ALWAYS show if any)
  const criticalCount = report.productFeedback.critical.length;
  const highCount = report.productFeedback.high.length;
  
  if (criticalCount > 0 || highCount > 0) {
    lines.push(
      '## 🚨 URGENT - Requires Immediate Attention',
      ''
    );
    
    if (criticalCount > 0) {
      lines.push(`### Critical (${criticalCount})`);
      report.productFeedback.critical.forEach(item => {
        lines.push(
          `- **${item.type.toUpperCase()}** | ${item.user} | ${item.content.substring(0, 100)}...`,
          `  ⏰ ${new Date(item.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Hong_Kong' })}`
        );
      });
      lines.push('');
    }
    
    if (highCount > 0) {
      lines.push(`### High Priority (${highCount})`);
      report.productFeedback.high.forEach(item => {
        lines.push(
          `- **${item.type}** | ${item.user} | ${item.content.substring(0, 100)}...`
        );
      });
      lines.push('');
    }
    lines.push('---', '');
  }
  
  // Product Feedback Section (THE CORE)
  lines.push(
    '## 📋 Product Feedback & Issues',
    '',
    `**Total Unresolved:** ${report.productFeedback.totalUnresolved}`,
    ''
  );
  
  // By Category
  const categories = ['bug', 'performance', 'feature', 'confusion', 'complaint', 'question'] as const;
  categories.forEach(cat => {
    const items = [
      ...report.productFeedback.critical.filter(i => i.type === cat),
      ...report.productFeedback.high.filter(i => i.type === cat),
      ...report.productFeedback.medium.filter(i => i.type === cat),
      ...report.productFeedback.low.filter(i => i.type === cat)
    ];
    
    if (items.length > 0) {
      const emojiMap = {
        bug: '🐛', performance: '⚡', feature: '💡', 
        confusion: '❓', complaint: '😞', question: '❔'
      };
      lines.push(`### ${emojiMap[cat]} ${cat.charAt(0).toUpperCase() + cat.slice(1)}s (${items.length})`);
      items.forEach(item => {
        const statusEmoji = item.status === 'resolved' ? '✅' : 
                           item.status === 'acknowledged' ? '👀' : '🆕';
        lines.push(`- ${statusEmoji} [${item.severity}] ${item.content.substring(0, 120)}${item.content.length > 120 ? '...' : ''}`);
        if (item.resolution) {
          lines.push(`  ↳ ✅ ${item.resolution}`);
        }
      });
      lines.push('');
    }
  });
  
  // AI Quick Resolutions
  if (report.aiInteractions.quickResolved.length > 0) {
    lines.push(
      '---',
      '',
      '## ✅ AI Quick Resolutions',
      '',
      `CS Agent resolved ${report.aiInteractions.quickResolved.length} issues automatically:`,
      ''
    );
    report.aiInteractions.quickResolved.forEach((item, i) => {
      lines.push(`${i + 1}. **${item.issue}**`);
      lines.push(`   ↳ Solved for @${item.user}: ${item.solution}`);
      lines.push('');
    });
  }
  
  // Unresolved Requests
  const unresolved = [
    ...report.productFeedback.medium.filter(i => i.status !== 'resolved'),
    ...report.productFeedback.low.filter(i => i.status !== 'resolved')
  ];
  
  if (unresolved.length > 0) {
    lines.push(
      '---',
      '',
      '## ⏳ Unresolved Requests',
      '',
      'These items need team attention:',
      ''
    );
    unresolved.forEach(item => {
      lines.push(`- [${item.type}] ${item.content.substring(0, 100)}... (_from ${item.user}_)`);
    });
    lines.push('');
  }
  
  // Action Items
  if (report.actionItems.length > 0) {
    lines.push(
      '---',
      '',
      '## ✅ Recommended Actions',
      ''
    );
    
    const urgent = report.actionItems.filter(a => a.priority === 'urgent');
    const high = report.actionItems.filter(a => a.priority === 'high');
    const normal = report.actionItems.filter(a => a.priority === 'normal');
    
    if (urgent.length > 0) {
      lines.push('### 🔴 Urgent');
      urgent.forEach(item => {
        lines.push(`- **${item.category}:** ${item.description}`);
        lines.push(`  ↳ Suggested owner: ${item.suggestedOwner}`);
      });
      lines.push('');
    }
    
    if (high.length > 0) {
      lines.push('### 🟠 High Priority');
      high.forEach(item => {
        lines.push(`- **${item.category}:** ${item.description}`);
      });
      lines.push('');
    }
    
    if (normal.length > 0) {
      lines.push('### 🟡 Normal');
      normal.forEach(item => {
        lines.push(`- **${item.category}:** ${item.description}`);
      });
      lines.push('');
    }
  }
  
  // Community Pulse (Brief)
  if (report.userActivity.mostActive.length > 0) {
    lines.push(
      '---',
      '',
      '## 👥 Community Pulse',
      '',
      '### Most Active Users',
      report.userActivity.mostActive.slice(0, 5).map((u, i) => 
        `${i + 1}. @${u.userTag} (${u.messageCount} messages)`
      ).join('\n'),
      ''
    );
    
    if (report.topics.trending.length > 0) {
      lines.push(
        '### Trending Topics',
        report.topics.trending.map(t => `- ${t}`).join('\n'),
        ''
      );
    }
  }
  
  // Footer
  lines.push(
    '---',
    '',
    '> 🤖 Generated by CS Agent | SNS Community',
    '> 📅 Next report: Tomorrow 9:00 AM HKT',
    '> 💬 Questions? Ping @CS-Agent.sol'
  );
  
  return lines.join('\n');
}

/**
 * Save and return formatted report
 */
export function generateAndSaveEnhancedReport(): string {
  // This would actually generate the report
  // For now returning template structure
  const report: DailyReport = {
    date: new Date().toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    timeRange: { start: '', end: '' },
    community: { totalMessages: 0, activeUsers: 0, newUsers: 0, topChannels: [] },
    userActivity: { mostActive: [], returningUsers: [], newJoiners: [] },
    topics: { clusters: [], trending: [], unanswered: [] },
    productFeedback: { critical: [], high: [], medium: [], low: [], resolved: [], totalUnresolved: 0 },
    aiInteractions: { totalHandled: 0, quickResolved: [], escalated: [] },
    actionItems: []
  };
  
  const markdown = formatEnhancedReport(report);
  
  const reportPath = path.join(DAILY_REPORTS_PATH, `${report.date}-enhanced.md`);
  fs.writeFileSync(reportPath, markdown);
  
  return markdown;
}

export { DailyReport, ProductFeedback, TopicCluster };
