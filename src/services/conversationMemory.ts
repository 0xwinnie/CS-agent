/**
 * Conversation Memory System (Part A)
 * Maintains recent conversation context per user for contextual understanding
 */

import { detectLanguage } from './snsClassifier';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface UserConversation {
  turns: ConversationTurn[];
  lastActive: number;
}

// In-memory store (in production, use Redis)
const conversationStore = new Map<string, UserConversation>();

const MAX_CONTEXT_TURNS = 6; // Keep last 3 exchanges (6 turns)
const CONTEXT_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Add a turn to user's conversation history
 */
export function addConversationTurn(
  userId: string,
  role: 'user' | 'assistant',
  content: string
): void {
  const now = Date.now();
  
  // Clean expired contexts periodically
  if (Math.random() < 0.1) cleanExpiredContexts();
  
  let conv = conversationStore.get(userId);
  if (!conv) {
    conv = { turns: [], lastActive: now };
  }
  
  conv.turns.push({ role, content, timestamp: now });
  conv.lastActive = now;
  
  // Keep only recent turns
  if (conv.turns.length > MAX_CONTEXT_TURNS) {
    conv.turns = conv.turns.slice(-MAX_CONTEXT_TURNS);
  }
  
  conversationStore.set(userId, conv);
}

/**
 * Get conversation context for a user
 */
export function getConversationContext(userId: string): ConversationTurn[] {
  const conv = conversationStore.get(userId);
  if (!conv) return [];
  
  // Check if expired
  if (Date.now() - conv.lastActive > CONTEXT_EXPIRY_MS) {
    conversationStore.delete(userId);
    return [];
  }
  
  return conv.turns;
}

/**
 * Get formatted context string for AI prompt
 */
export function formatContextForPrompt(userId: string, language: 'zh' | 'en'): string {
  const turns = getConversationContext(userId);
  if (turns.length === 0) return '';
  
  const contextLines = turns.map(t => 
    `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`
  );
  
  return language === 'zh' 
    ? `\n\n之前的对话:\n${contextLines.join('\n')}\n`
    : `\n\nPrevious conversation:\n${contextLines.join('\n')}\n`;
}

/**
 * Check if message references previous context ("this", "that", "it")
 */
export function needsContextResolution(message: string): boolean {
  const contextRefs = [
    /^(this|that|it|these|those)\s/i,
    /^(这|那|它|这个|那个)\s*/,
    /刚才|之前说的|上面|之前/i,
    /(what|which|where|how)\s+(did|was|is)\s+(you|we|i|it|that)/i
  ];
  
  return contextRefs.some(pattern => pattern.test(message.trim()));
}

/**
 * Try to resolve pronoun/reference to actual content
 */
export function resolveReference(
  message: string, 
  userId: string
): { resolved: boolean; expandedMessage?: string } {
  const context = getConversationContext(userId);
  if (context.length === 0) return { resolved: false };
  
  // Find last assistant message
  const lastAssistantMsg = [...context].reverse().find(t => t.role === 'assistant');
  const lastUserMsg = [...context].reverse().find(t => t.role === 'user');
  
  if (!lastAssistantMsg || !lastUserMsg) return { resolved: false };
  
  const msg = message.toLowerCase();
  
  // Check for reference patterns
  const hasReference = /\b(this|that|it|these|those)\b/i.test(msg) ||
                       /[这那它][个些]?/.test(msg);
  
  if (hasReference) {
    // Try to understand what "this/that" refers to
    const expanded = `${message} (referring to: "${lastAssistantMsg.content.substring(0, 100)}...")`;
    return { resolved: true, expandedMessage: expanded };
  }
  
  return { resolved: false };
}

/**
 * Clear user's conversation history
 */
export function clearConversation(userId: string): void {
  conversationStore.delete(userId);
}

/**
 * Clean expired conversation contexts
 */
function cleanExpiredContexts(): void {
  const now = Date.now();
  for (const [userId, conv] of conversationStore.entries()) {
    if (now - conv.lastActive > CONTEXT_EXPIRY_MS) {
      conversationStore.delete(userId);
    }
  }
}

/**
 * Get conversation stats for debugging
 */
export function getConversationStats(): { 
  activeUsers: number; 
  totalTurns: number;
} {
  let totalTurns = 0;
  for (const conv of conversationStore.values()) {
    totalTurns += conv.turns.length;
  }
  return {
    activeUsers: conversationStore.size,
    totalTurns
  };
}
