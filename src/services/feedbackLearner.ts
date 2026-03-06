/**
 * Feedback Learning System (Part B)
 * Detects user teaching/correction and auto-extracts Q&A to knowledge base
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConversationTurn, getConversationContext } from './conversationMemory';
import { detectLanguage } from './snsClassifier';

interface ExtractedQA {
  question: string;
  answer: string;
  confidence: number;
  source: string;
  extractedAt: string;
}

interface KnowledgeBaseEntry {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  confidence: number;
  source?: string;
  createdAt?: string;
}

const LEARNING_THRESHOLD = 0.7;
const KB_PATH = path.join(process.cwd(), 'data', 'knowledge-base.json');
const PENDING_LEARNING_PATH = path.join(process.cwd(), 'data', 'pending-learning.json');

/**
 * Detect if user is teaching/correcting the bot
 */
export function detectTeachingIntent(
  message: string,
  previousContext: ConversationTurn[]
): { 
  isTeaching: boolean; 
  teachingType?: 'correction' | 'new_info' | 'clarification';
  confidence: number;
} {
  const msg = message.toLowerCase();
  const lang = detectLanguage(message);
  
  // Teaching pattern detection
  const teachingPatterns = {
    correction: [
      /(should be|is actually|correct|wrong|不对|错了|应该是|实际是)/i,
      /(not|no,)\s+(it's|it is|that's|that is)/i,
      /(you|u)\s+(should|need to|ought to)/i
    ],
    new_info: [
      /(next time|you can|you should|try|你可以|下次|试试|推荐)/i,
      /(here is|here's|check out|visit|see|http|https|www\.)/i,
      /(the answer is|answer:|答案是|答案是|回答：)/i
    ],
    clarification: [
      /(i mean|what i mean|my question is|我是说|我的意思是|我想问的是)/i,
      /(to be clear|clarifying|clarification)/i
    ]
  };
  
  // Check if bot previously said "I don't know" or similar
  const botWasUncertain = previousContext.some(turn => 
    turn.role === 'assistant' && 
    (/don't know|not sure|learning|不知道|不清楚|还在学习/i.test(turn.content))
  );
  
  // Score each pattern
  let scores = { correction: 0, new_info: 0, clarification: 0 };
  
  for (const [type, patterns] of Object.entries(teachingPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(msg)) {
        scores[type as keyof typeof scores] += 1;
      }
    }
  }
  
  // Boost if bot was uncertain (strong signal of teaching)
  if (botWasUncertain) {
    scores.new_info += 2;
    scores.correction += 1;
  }
  
  // Determine type
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return { isTeaching: false, confidence: 0 };
  }
  
  const teachingType = Object.entries(scores)
    .find(([_, score]) => score === maxScore)?.[0] as 'correction' | 'new_info' | 'clarification';
  
  const confidence = Math.min(maxScore / 3, 1);
  
  return { 
    isTeaching: confidence >= 0.3, 
    teachingType, 
    confidence 
  };
}

/**
 * Extract Q&A from teaching interaction
 */
export function extractQAFromTeaching(
  userMessage: string,
  previousContext: ConversationTurn[]
): ExtractedQA | null {
  if (previousContext.length < 2) return null;
  
  // Find the original question (first user message in context that looks like a question)
  const originalQuestion = previousContext.find(turn => 
    turn.role === 'user' && 
    (/[?？]|\b(how|what|where|when|why|which|who|can|could|would|is|are|do|does)\b/i.test(turn.content) ||
     /\b(怎么|什么|哪里|为什么|如何|能否|可以|是|有)\b/.test(turn.content))
  );
  
  if (!originalQuestion) return null;
  
  // Extract answer from current message
  const answer = extractAnswerFromMessage(userMessage);
  if (!answer) return null;
  
  return {
    question: cleanQuestion(originalQuestion.content),
    answer: cleanAnswer(answer),
    confidence: 0.8,
    source: 'user_feedback_auto_extracted',
    extractedAt: new Date().toISOString()
  };
}

/**
 * Extract answer portion from teaching message
 */
function extractAnswerFromMessage(message: string): string | null {
  // Try different extraction patterns
  const patterns = [
    /(?:the answer is|answer:|答案是|回答：)\s*(.+)/i,
    /(?:you can|you should|try|推荐|可以试试|你可以|next time)\s*(.+)/i,
    /(?:check out|visit|see|look at)\s*(https?:\/\/\S+[^\s.])/i,
    /(?:here is|here's)\s*(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // If no pattern matches but message contains URL, extract that
  const urlMatch = message.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) {
    return `Check out: ${urlMatch[1]}`;
  }
  
  // If message is short and informative, use whole thing
  if (message.length < 200 && !message.includes('?')) {
    return message;
  }
  
  return null;
}

/**
 * Clean and normalize question
 */
function cleanQuestion(question: string): string {
  return question
    .replace(/^(hi|hey|hello)\s*,?\s*/i, '')
    .replace(/@\w+\s*/g, '')
    .trim();
}

/**
 * Clean and format answer
 */
function cleanAnswer(answer: string): string {
  return answer
    .replace(/^(is|are|it's|that's)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate keywords from question and answer
 */
function generateKeywords(question: string, answer: string): string[] {
  const text = `${question} ${answer}`.toLowerCase();
  
  // Extract meaningful words
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !['the', 'and', 'for', 'you', 'can', 'how', 'what', 'this', 'that', 'with', 'from'].includes(w));
  
  // Get unique words, prioritize nouns and technical terms
  const uniqueWords = [...new Set(words)];
  return uniqueWords.slice(0, 10);
}

/**
 * Add extracted Q&A to knowledge base
 */
export async function addToKnowledgeBase(qa: ExtractedQA): Promise<boolean> {
  try {
    // Read existing KB
    const kbData = fs.readFileSync(KB_PATH, 'utf-8');
    const kb: KnowledgeBaseEntry[] = JSON.parse(kbData);
    
    // Generate ID
    const id = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // Create entry
    const entry: KnowledgeBaseEntry = {
      id,
      question: qa.question,
      keywords: generateKeywords(qa.question, qa.answer),
      answer: qa.answer,
      confidence: qa.confidence,
      source: qa.source,
      createdAt: qa.extractedAt
    };
    
    // Check for duplicates
    const isDuplicate = kb.some(existing => 
      existing.question.toLowerCase() === qa.question.toLowerCase() ||
      similarity(existing.question, qa.question) > 0.8
    );
    
    if (isDuplicate) {
      console.log('⚠️ Duplicate Q&A detected, skipping');
      return false;
    }
    
    // Add to KB
    kb.push(entry);
    fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2));
    
    console.log(`✅ Added new Q&A to knowledge base: ${id}`);
    console.log(`   Q: ${qa.question.substring(0, 60)}...`);
    console.log(`   A: ${qa.answer.substring(0, 60)}...`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to add to KB:', error);
    return false;
  }
}

/**
 * Save to pending for manual review
 */
export function savePendingLearning(qa: ExtractedQA): void {
  try {
    let pending: ExtractedQA[] = [];
    if (fs.existsSync(PENDING_LEARNING_PATH)) {
      pending = JSON.parse(fs.readFileSync(PENDING_LEARNING_PATH, 'utf-8'));
    }
    pending.push(qa);
    fs.writeFileSync(PENDING_LEARNING_PATH, JSON.stringify(pending, null, 2));
  } catch (error) {
    console.error('Failed to save pending:', error);
  }
}

/**
 * Simple string similarity (Jaccard)
 */
function similarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

/**
 * Process potential learning from user message
 * Returns true if learning was triggered
 */
export async function processPotentialLearning(
  userId: string,
  message: string
): Promise<{ learned: boolean; qa?: ExtractedQA }> {
  const context = getConversationContext(userId);
  
  const detection = detectTeachingIntent(message, context);
  
  if (!detection.isTeaching || detection.confidence < LEARNING_THRESHOLD) {
    return { learned: false };
  }
  
  console.log(`🎓 Teaching detected! Type: ${detection.teachingType}, confidence: ${detection.confidence.toFixed(2)}`);
  
  const qa = extractQAFromTeaching(message, context);
  
  if (!qa) {
    console.log('⚠️ Could not extract Q&A from teaching message');
    return { learned: false };
  }
  
  // Add to KB
  const added = await addToKnowledgeBase(qa);
  
  if (added) {
    return { learned: true, qa };
  } else {
    // Save for manual review if auto-add failed
    savePendingLearning(qa);
    return { learned: false, qa };
  }
}
