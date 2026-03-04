/**
 * Feedback Service
 * Handles user feedback collection and storage
 */

import * as fs from 'fs';
import * as path from 'path';

// Path to feedback file
const FEEDBACK_PATH = path.resolve(__dirname, '../../data/feedback.json');
const PASSIVE_FEEDBACK_PATH = path.resolve(__dirname, '../../data/passive-feedback.json');

/**
 * Keywords that indicate passive feedback/issues in community chat
 * Automatically detects user pain points without explicit !feedback command
 */
// Fallback keywords for when AI is unavailable
const PASSIVE_FEEDBACK_KEYWORDS: Record<Exclude<FeedbackCategory, 'general' | 'none'>, string[]> = {
  performance: ['慢', '卡顿', 'loading', 'load', '很久', '卡', 'lag', 'slow', '快', 'speed', 'performance', '优化', 'timeout', '超时', '响应'],
  bug: ['bug', '错误', 'error', '崩溃', 'crash', '闪退', 'broken', 'not working', 'failed', '失败', '有问题', '报错', '出错'],
  ui: ['页面', '界面', '显示', '看不到', 'layout', 'ui', '设计', '不好看', '乱码', '样式', '排版'],
  feature: ['想要', '希望', '建议', '能不能', '是否可以', 'feature request', 'wish', 'suggestion', 'idea', '能不能加', '能否增加'],
  confusion: ['不懂', '不明白', '怎么', '在哪里', '找不到', 'confused', 'unclear', 'difficult', '复杂', '难用', '不会用', '怎么用'],
  complaint: ['讨厌', '烦', '失望', '垃圾', '难用', '吐槽', '抱怨', 'bad', 'terrible', 'worst', 'hate', 'annoying']
};

/**
 * Check if a message contains passive feedback (user mentioning issues without using !feedback)
 * @param message - Message content to analyze
 * @returns Analysis result or null if not feedback
 */
export function detectPassiveFeedback(message: string): { 
  category: FeedbackCategory; 
  confidence: number; 
  matchedKeywords: string[];
  isQuestion: boolean;
} | null {
  const text = message.toLowerCase();
  let bestCategory: FeedbackCategory = 'general';
  let maxMatches = 0;
  const allMatchedKeywords: string[] = [];
  
  // Check each category for keyword matches
  for (const [category, keywords] of Object.entries(PASSIVE_FEEDBACK_KEYWORDS)) {
    const matched = keywords.filter(kw => text.includes(kw.toLowerCase()));
    
    if (matched.length > maxMatches) {
      maxMatches = matched.length;
      bestCategory = category as FeedbackCategory;
      allMatchedKeywords.push(...matched);
    }
  }
  
  // Need at least one match to be considered feedback
  if (maxMatches === 0) {
    return null;
  }
  
  // Calculate confidence
  let confidence = 0.5 + (0.1 * maxMatches);
  
  // Boost confidence for question patterns (asking if others have same issue)
  const isQuestion = text.includes('吗') || text.includes('?') || text.includes('你们') || text.includes('大家');
  if (isQuestion) {
    confidence += 0.15;
  }
  
  // Cap at 0.95
  confidence = Math.min(confidence, 0.95);
  
  return {
    category: bestCategory,
    confidence,
    matchedKeywords: [...new Set(allMatchedKeywords)],
    isQuestion
  };
}

/**
 * Save passive feedback (collected from regular chat without explicit command)
 * @param userId - Discord user ID
 * @param userTag - Discord user tag
 * @param message - Original message
 * @param analysis - Feedback analysis result
 */
export function savePassiveFeedback(
  userId: string,
  userTag: string,
  message: string,
  analysis: { category: FeedbackCategory; confidence: number; matchedKeywords: string[]; isQuestion: boolean }
): void {
  const entry = {
    id: generateId(),
    userId,
    userTag,
    message: message.trim(),
    category: analysis.category,
    confidence: analysis.confidence,
    matchedKeywords: analysis.matchedKeywords,
    isQuestion: analysis.isQuestion,
    timestamp: new Date().toISOString(),
    source: 'passive' as const
  };

  try {
    let feedback: typeof entry[] = [];
    if (fs.existsSync(PASSIVE_FEEDBACK_PATH)) {
      const data = fs.readFileSync(PASSIVE_FEEDBACK_PATH, 'utf-8');
      feedback = JSON.parse(data);
    }
    feedback.push(entry);
    fs.writeFileSync(PASSIVE_FEEDBACK_PATH, JSON.stringify(feedback, null, 2));
    
    console.log(`📊 Passive feedback saved [${analysis.category}] from ${userTag}: "${message.substring(0, 50)}..."`);
  } catch (error) {
    console.error('❌ Failed to save passive feedback:', error);
  }
}

/**
 * Feedback entry interface
 */
export interface FeedbackEntry {
  id: string;
  userId: string;
  userTag: string;
  message: string;
  category: FeedbackCategory;
  timestamp: string;
  status: FeedbackStatus;
}

/**
 * Feedback categories (from AI intent analysis)
 */
export type FeedbackCategory = 
  | 'performance'
  | 'bug'
  | 'ui'
  | 'feature'
  | 'confusion'
  | 'complaint'
  | 'general'
  | 'none';

/**
 * Feedback status
 */
export type FeedbackStatus = 
  | 'pending'
  | 'reviewed'
  | 'in-progress'
  | 'resolved'
  | 'closed';

/**
 * Load all feedback entries
 * @returns Array of feedback entries
 */
function loadFeedback(): FeedbackEntry[] {
  try {
    if (!fs.existsSync(FEEDBACK_PATH)) {
      return [];
    }
    const data = fs.readFileSync(FEEDBACK_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load feedback:', error);
    return [];
  }
}

/**
 * Save feedback entries to file
 * @param feedback - Array of feedback entries
 */
function saveFeedback(feedback: FeedbackEntry[]): void {
  try {
    fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(feedback, null, 2));
  } catch (error) {
    console.error('❌ Failed to save feedback:', error);
    throw error;
  }
}

/**
 * Generate unique ID for feedback entry
 * @returns Unique ID string
 */
function generateId(): string {
  return `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect feedback category from message content
 * @param message - Feedback message
 * @returns Detected category
 */
function detectCategory(message: string): FeedbackCategory {
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('slow') || messageLower.includes('loading') || messageLower.includes('lag') || messageLower.includes('timeout')) {
    return 'performance';
  }
  if (messageLower.includes('bug') || messageLower.includes('error') || messageLower.includes('broken') || messageLower.includes('not working')) {
    return 'bug';
  }
  if (messageLower.includes('ui') || messageLower.includes('layout') || messageLower.includes('display')) {
    return 'ui';
  }
  if (messageLower.includes('feature') || messageLower.includes('suggestion') || messageLower.includes('add')) {
    return 'feature';
  }
  if (messageLower.includes('how to') || messageLower.includes('confused') || messageLower.includes('don\'t understand')) {
    return 'confusion';
  }
  if (messageLower.includes('bad') || messageLower.includes('terrible') || messageLower.includes('awful') || messageLower.includes('hate')) {
    return 'complaint';
  }
  
  return 'general';
}

/**
 * Submit new feedback
 * @param userId - Discord user ID
 * @param userTag - Discord user tag (username#discriminator)
 * @param message - Feedback message
 * @returns The created feedback entry
 */
export function submitFeedback(
  userId: string,
  userTag: string,
  message: string
): FeedbackEntry {
  const feedback: FeedbackEntry = {
    id: generateId(),
    userId,
    userTag,
    message: message.trim(),
    category: detectCategory(message),
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  const allFeedback = loadFeedback();
  allFeedback.push(feedback);
  saveFeedback(allFeedback);

  console.log(`✅ Feedback submitted by ${userTag} [${feedback.category}]`);
  return feedback;
}

/**
 * Get all feedback entries
 * @returns Array of all feedback
 */
export function getAllFeedback(): FeedbackEntry[] {
  return loadFeedback();
}

/**
 * Get feedback by user ID
 * @param userId - Discord user ID
 * @returns Array of user's feedback
 */
export function getFeedbackByUser(userId: string): FeedbackEntry[] {
  return loadFeedback().filter(fb => fb.userId === userId);
}

/**
 * Update feedback status
 * @param feedbackId - Feedback ID
 * @param status - New status
 * @returns Updated feedback or null if not found
 */
export function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): FeedbackEntry | null {
  const allFeedback = loadFeedback();
  const feedback = allFeedback.find(fb => fb.id === feedbackId);
  
  if (!feedback) {
    return null;
  }

  feedback.status = status;
  saveFeedback(allFeedback);
  
  return feedback;
}

/**
 * Get feedback statistics
 * @returns Statistics object
 */
export function getFeedbackStats(): {
  total: number;
  pending: number;
  reviewed: number;
  inProgress: number;
  resolved: number;
  byCategory: Record<FeedbackCategory, number>;
} {
  const allFeedback = loadFeedback();
  
  const byCategory: Record<FeedbackCategory, number> = {
    performance: 0,
    bug: 0,
    ui: 0,
    feature: 0,
    confusion: 0,
    complaint: 0,
    general: 0,
    none: 0
  };

  for (const fb of allFeedback) {
    byCategory[fb.category] = (byCategory[fb.category] || 0) + 1;
  }

  return {
    total: allFeedback.length,
    pending: allFeedback.filter(f => f.status === 'pending').length,
    reviewed: allFeedback.filter(f => f.status === 'reviewed').length,
    inProgress: allFeedback.filter(f => f.status === 'in-progress').length,
    resolved: allFeedback.filter(f => f.status === 'resolved').length,
    byCategory
  };
}