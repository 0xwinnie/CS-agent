/**
 * Knowledge Base Service
 * Handles FAQ matching and similarity search
 */

import * as fs from 'fs';
import * as path from 'path';

// Path to knowledge base file
const KB_PATH = path.resolve(__dirname, '../../data/knowledge-base.json');
const UNKNOWN_QUESTIONS_PATH = path.resolve(__dirname, '../../data/unknown-questions.json');

// Confidence threshold for auto-replies
const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Knowledge base entry interface
 */
interface KnowledgeBaseEntry {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  confidence: number;
}

/**
 * Search result interface
 */
interface SearchResult {
  entry: KnowledgeBaseEntry;
  score: number;
}

/**
 * Load knowledge base from JSON file
 * @returns Array of knowledge base entries
 */
function loadKnowledgeBase(): KnowledgeBaseEntry[] {
  try {
    const data = fs.readFileSync(KB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load knowledge base:', error);
    return [];
  }
}

/**
 * Calculate similarity score between query and entry
 * Uses simple keyword matching for MVP
 * @param query - User's query
 * @param entry - Knowledge base entry
 * @returns Similarity score (0-1)
 */
function calculateSimilarity(query: string, entry: KnowledgeBaseEntry): number {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  let score = 0;
  let maxPossibleScore = 0;

  // Check for exact question match (highest weight)
  if (entry.question.toLowerCase() === queryLower) {
    return 1.0;
  }

  // Check for partial question match
  const questionLower = entry.question.toLowerCase();
  if (questionLower.includes(queryLower) || queryLower.includes(questionLower)) {
    score += 0.9;
  }
  
  // Check for significant word overlap (3+ words)
  const questionWords = questionLower.split(/\s+/);
  const overlappingWords = questionWords.filter(w => 
    w.length > 2 && queryLower.includes(w)
  );
  if (overlappingWords.length >= 3) {
    score += 0.6;
  } else if (overlappingWords.length >= 2) {
    score += 0.3;
  }

  // Keyword matching
  maxPossibleScore += entry.keywords.length * 0.3;
  
  for (const keyword of entry.keywords) {
    const keywordLower = keyword.toLowerCase();
    
    // Exact keyword match
    if (queryLower.includes(keywordLower)) {
      score += 0.3;
    } 
    // Partial keyword match
    else if (keywordLower.includes(queryLower) || queryLower.includes(keywordLower)) {
      score += 0.15;
    }
    
    // Word-by-word matching
    for (const word of queryWords) {
      if (word.length > 2 && keywordLower.includes(word)) {
        score += 0.1;
      }
    }
  }

  // Normalize score
  const normalizedScore = maxPossibleScore > 0 
    ? Math.min(score / maxPossibleScore, 1) 
    : 0;

  return normalizedScore * entry.confidence;
}

/**
 * Search knowledge base for best matching entry
 * @param query - User's question
 * @returns Best match or null if no good match found
 */
export function searchKnowledgeBase(query: string): { entry: KnowledgeBaseEntry; score: number } | null {
  const kb = loadKnowledgeBase();
  
  if (kb.length === 0) {
    console.warn('⚠️ Knowledge base is empty');
    return null;
  }

  const results: SearchResult[] = kb.map(entry => ({
    entry,
    score: calculateSimilarity(query, entry)
  }));

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  const bestMatch = results[0];

  if (bestMatch && bestMatch.score >= CONFIDENCE_THRESHOLD) {
    console.log(`✅ Knowledge base match: "${bestMatch.entry.question}" (score: ${bestMatch.score.toFixed(2)})`);
    return bestMatch;
  }

  console.log(`❌ No knowledge base match found (best score: ${bestMatch?.score.toFixed(2) || 0})`);
  return null;
}

/**
 * Check if a message is a question
 * @param message - User's message
 * @returns boolean indicating if message appears to be a question
 */
export function isQuestion(message: string): boolean {
  const questionIndicators = [
    '?', '？',                              // Question marks (English & Chinese)
    'how to', 'how do', 'how can', 'how is', // How questions
    'what is', 'what are', 'what does',      // What questions
    'why', 'when', 'where', 'who',           // Other question words
    'can i', 'could you', 'would you',       // Request phrasing
    'help', 'issue', 'problem', 'error',     // Support keywords
    'not working', 'broken', 'failed',       // Problem indicators
    // Chinese question words
    '什么', '怎么', '为什么', '哪里', '多少', '吗', '呢', '吧',
    '如何', '能否', '请问', '帮助', '问题', '错误', '失败'
  ];

  const messageLower = message.toLowerCase().trim();
  
  return questionIndicators.some(indicator => 
    messageLower.includes(indicator.toLowerCase()) || 
    messageLower.endsWith('?') || 
    messageLower.endsWith('？')
  );
}

/**
 * Log unknown questions for later review
 * @param question - The unknown question
 * @param user - User who asked
 */
export function logUnknownQuestion(question: string, user: string): void {
  try {
    let unknownQuestions: any[] = [];
    
    if (fs.existsSync(UNKNOWN_QUESTIONS_PATH)) {
      const data = fs.readFileSync(UNKNOWN_QUESTIONS_PATH, 'utf-8');
      unknownQuestions = JSON.parse(data);
    }

    unknownQuestions.push({
      question,
      user,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });

    fs.writeFileSync(UNKNOWN_QUESTIONS_PATH, JSON.stringify(unknownQuestions, null, 2));
    console.log(`📝 Logged unknown question from ${user}`);
  } catch (error) {
    console.error('❌ Failed to log unknown question:', error);
  }
}

/**
 * Get all knowledge base entries (for admin/debugging)
 * @returns All KB entries
 */
export function getAllEntries(): KnowledgeBaseEntry[] {
  return loadKnowledgeBase();
}