/**
 * Soul Engine — Refactored
 * 
 * Simplified flow:
 *   Message in → Filter → RAG lookup → Single LLM call → Post-process → Reply
 * 
 * No intent classification step. No switch/case routing.
 * SOUL.md handles all behavioral decisions via the system prompt.
 */

import { Message, Client } from 'discord.js';
import { config } from '../config/env';
import { generateDoryReply } from '../services/ai';
import { semanticSearch, hasEmbeddings } from '../services/semanticKB';
import { logMessage, MessageLogEntry } from '../services/messageLog';

// ── Session memory (in-memory, per user per channel) ───────────────

interface ChatSession {
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  lastActivity: number;
}

const sessions = new Map<string, ChatSession>();
const SESSION_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_HISTORY = 4; // Keep last 2 exchanges (4 messages)

// ── Main handler ───────────────────────────────────────────────────

export async function handleSoulMessage(message: Message, client: Client): Promise<void> {
  // ─── Gate 1: Skip bots ───
  if (message.author.bot) return;

  // ─── Gate 2: Only respond when addressed ───
  const botId = client.user!.id;
  const isMentioned = message.mentions.has(botId);
  const mentionsDory = message.content.toLowerCase().includes('dory');

  if (!isMentioned && !mentionsDory) return;

  // ─── Extract clean message ───
  const content = message.content
    .replace(new RegExp(`<@!?${botId}>`, 'g'), '')
    .replace(/\bdory\b/gi, '')
    .trim();

  if (!content) {
    await message.reply("Hey! 👋 Did you need something?");
    return;
  }

  const username = message.author.username;
  const sessionKey = `${message.author.id}_${message.channel.id}`;

  console.log(`[${new Date().toISOString()}] ${message.author.tag}: "${content.substring(0, 80)}"`);

  // ─── RAG: Find relevant knowledge ───
  let knowledgeContext: string | null = null;

  if (hasEmbeddings()) {
    try {
      const results = await semanticSearch(content, 3);
      const relevant = results.filter(r => r.similarity > 0.65);

      if (relevant.length > 0) {
        knowledgeContext = relevant
          .map(r => `Q: ${r.entry.question}\nA: ${r.entry.answer}`)
          .join('\n\n---\n\n');
        console.log(`📚 RAG: ${relevant.length} match(es), best=${relevant[0].similarity.toFixed(2)}`);
      }
    } catch (e) {
      console.error('RAG search failed:', e);
    }
  }

  // ─── Build conversation history ───
  const session = getSession(sessionKey);
  const conversationHistory = session.history.length > 0
    ? session.history.map(h => `${h.role === 'user' ? 'User' : 'Dory'}: ${h.content}`).join('\n')
    : undefined;

  // ─── Single LLM call ───
  let reply = await generateDoryReply(content, {
    knowledgeBase: knowledgeContext || undefined,
    conversationHistory,
    username,
  });

  // ─── Post-processing ───
  reply = postProcess(reply);

  // ─── Send reply ───
  await message.reply(reply);

  // ─── Update session ───
  addToSession(sessionKey, content, reply);

  // ─── Silent logging ───
  logMessage({
    userId: message.author.id,
    userTag: message.author.tag,
    username,
    content,
    reply,
    channel: 'name' in message.channel ? (message.channel as any).name : 'DM',
    hadKnowledgeBase: !!knowledgeContext,
    timestamp: new Date().toISOString(),
  });

  console.log(`✅ Replied to ${message.author.tag}`);
}

// ── Post-processing ────────────────────────────────────────────────

function postProcess(reply: string): string {
  // Remove any URLs that slipped through (SOUL.md instructs not to generate them,
  // but this is a safety net)
  let cleaned = reply.replace(/https?:\/\/[^\s)]+/g, '[visit sns.id]');

  // Trim excessive length (Discord has 2000 char limit, we aim for much less)
  if (cleaned.length > 800) {
    cleaned = cleaned.substring(0, 797) + '...';
  }

  return cleaned;
}

// ── Session management ─────────────────────────────────────────────

function getSession(key: string): ChatSession {
  cleanupSessions();

  const existing = sessions.get(key);
  if (existing && Date.now() - existing.lastActivity < SESSION_TTL) {
    return existing;
  }

  const newSession: ChatSession = { history: [], lastActivity: Date.now() };
  sessions.set(key, newSession);
  return newSession;
}

function addToSession(key: string, userMessage: string, botReply: string): void {
  const session = sessions.get(key);
  if (!session) return;

  session.history.push({ role: 'user', content: userMessage });
  session.history.push({ role: 'assistant', content: botReply });
  session.lastActivity = Date.now();

  // Keep only recent history
  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }
}

function cleanupSessions(): void {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TTL) {
      sessions.delete(key);
    }
  }
}
