/**
 * Soul Engine - Simplified AI-Driven Core
 * 边界约束 + AI 自主决策
 */

import { Message, Client } from 'discord.js';
import { config } from '../config/env';
import { judgeIntent, extractTeaching, generateBoundedReply, generateCasualReply } from '../services/aiJudge';
import { semanticSearch, hasEmbeddings } from '../services/semanticKB';
import { addToKnowledgeBase } from '../services/adminLearning';

// Simple in-memory state
interface ChatSession {
  lastQuestion: string;
  lastAnswer: string;
  timestamp: number;
}
const sessions = new Map<string, ChatSession>(); // key: userId_channelId
const ADMIN_IDS = new Set(config.adminUserIds);

const SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Main message handler - simplified flow
 */
export async function handleSoulMessage(message: Message, client: Client): Promise<void> {
  if (message.author.bot) return;

  const userId = message.author.id;
  const channelId = message.channel.id;
  const sessionKey = `${userId}_${channelId}`;
  const isMentioned = message.mentions.has(client.user!.id);
  const isAdmin = ADMIN_IDS.has(userId);

  console.log(`[${new Date().toISOString()}] ${message.author.tag}: "${message.content.substring(0, 60)}..."`);

  // 1. Check if admin is correcting previous answer
  const session = sessions.get(sessionKey);
  if (isAdmin && session && (Date.now() - session.timestamp < SESSION_EXPIRY_MS)) {
    const teaching = await extractTeaching(
      message.content,
      session.lastAnswer,
      session.lastQuestion
    );

    if (teaching.isTeaching && teaching.question && teaching.answer) {
      const result = await addToKnowledgeBase(
        teaching.question,
        teaching.answer,
        [], // AI will extract keywords during embedding
        message.author.tag
      );

      if (result.success) {
        await message.reply('🎓 Got it! I\'ve learned something new.');
        console.log(`✅ Learned from admin: ${result.entryId}`);
      } else {
        await message.reply(`📝 Noted, but couldn't save: ${result.error}`);
      }
      return;
    }
  }

  // 2. Only respond if mentioned or appears to be asking us
  if (!isMentioned && !message.content.toLowerCase().includes('cs agent')) {
    // Could add smarter detection here if needed
    return;
  }

  // 3. AI judges intent
  const content = message.content
    .replace(new RegExp(`<@!?${client.user!.id}>`, 'g'), '')
    .replace(/cs agent/gi, '')
    .trim();

  const context = session
    ? `Previous: Q: "${session.lastQuestion}" A: "${session.lastAnswer}"`
    : '';

  const intent = await judgeIntent(content, context, isAdmin);
  console.log(`🎯 Intent: ${intent.intent} (${(intent.confidence * 100).toFixed(0)}%) - ${intent.reasoning}`);

  // 4. Handle based on intent
  let reply: string;

  if (!intent.shouldAnswer) {
    console.log('🤫 AI decided not to answer');
    return;
  }

  switch (intent.intent) {
    case 'sns_question':
      reply = await handleSNSQuestion(content, message.author.username, intent.suggestedTone || 'professional');
      break;
    
    case 'correction':
      // Already handled above, but if we missed it
      reply = "📝 Thanks for the feedback! I'll do better next time.";
      break;
    
    case 'greeting':
    case 'chitchat':
    case 'off_topic':
    default:
      reply = await generateCasualReply(content, intent.intent, message.author.username);
      break;
  }

  // 5. Send reply
  await message.reply(reply);

  // 6. Store session for potential correction
  if (intent.intent === 'sns_question') {
    sessions.set(sessionKey, {
      lastQuestion: content,
      lastAnswer: reply,
      timestamp: Date.now()
    });
  }

  // Cleanup old sessions
  cleanupSessions();

  console.log(`✅ Replied to ${message.author.tag}`);
}

/**
 * Handle SNS-specific question with RAG
 */
async function handleSNSQuestion(
  question: string,
  username: string,
  tone: string
): Promise<string> {
  // Try semantic search if available
  let knowledge: string | null = null;
  
  if (hasEmbeddings()) {
    try {
      const results = await semanticSearch(question, 1);
      if (results.length > 0 && results[0].similarity > 0.7) {
        knowledge = results[0].entry.answer;
        console.log(`📚 RAG match: ${results[0].similarity.toFixed(2)}`);
      }
    } catch (e) {
      console.error('RAG search failed:', e);
    }
  }

  // Generate AI reply with knowledge
  return generateBoundedReply(question, knowledge, tone, username);
}

/**
 * Cleanup old sessions
 */
function cleanupSessions(): void {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.timestamp > SESSION_EXPIRY_MS) {
      sessions.delete(key);
    }
  }
}

/**
 * Reset session for a user (e.g., after learning)
 */
export function clearSession(userId: string, channelId: string): void {
  sessions.delete(`${userId}_${channelId}`);
}
