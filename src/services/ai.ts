/**
 * AI Service — Refactored
 * 
 * Single responsibility: call LLM with the right prompt.
 * Reads SOUL.md / DIGEST_PROMPT.md from disk as system prompts.
 * No hardcoded personality or behavior logic.
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/env';

// ── OpenRouter client ──────────────────────────────────────────────

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: config.openrouterApiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://sns.id',
    'X-Title': 'SNS CS Agent — Dory'
  }
});

// ── Prompt loading ─────────────────────────────────────────────────

const SOUL_PATH = path.resolve(__dirname, '../../SOUL.md');
const DIGEST_PATH = path.resolve(__dirname, '../../DIGEST_PROMPT.md');

let soulPromptCache: string | null = null;
let digestPromptCache: string | null = null;

/**
 * Load SOUL.md as system prompt (cached after first read)
 */
export function getSoulPrompt(): string {
  if (soulPromptCache) return soulPromptCache;

  try {
    soulPromptCache = fs.readFileSync(SOUL_PATH, 'utf-8');
    console.log('✅ SOUL.md loaded as system prompt');
    return soulPromptCache;
  } catch (error) {
    console.error('❌ Failed to load SOUL.md:', error);
    return 'You are Dory, a helpful and friendly community assistant for SNS (Solana Name Service). Be concise, warm, and honest. If you don\'t know something, say so.';
  }
}

/**
 * Load DIGEST_PROMPT.md for daily reports (cached after first read)
 */
export function getDigestPrompt(): string {
  if (digestPromptCache) return digestPromptCache;

  try {
    digestPromptCache = fs.readFileSync(DIGEST_PATH, 'utf-8');
    console.log('✅ DIGEST_PROMPT.md loaded');
    return digestPromptCache;
  } catch (error) {
    console.error('❌ Failed to load DIGEST_PROMPT.md:', error);
    return 'You are an analyst. Summarize the community messages into a concise daily digest for the internal team.';
  }
}

/**
 * Reload prompts from disk (call when files are updated at runtime)
 */
export function reloadPrompts(): void {
  soulPromptCache = null;
  digestPromptCache = null;
  getSoulPrompt();
  getDigestPrompt();
  console.log('🔄 Prompts reloaded from disk');
}

// ── Core LLM call ──────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Single LLM call with model fallback chain.
 * This is the ONLY function that talks to the LLM.
 */
async function callLLM(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const models = config.modelFallbackChain.length > 0
    ? config.modelFallbackChain
    : ['google/gemini-2.5-flash', 'openrouter/auto'];

  const maxTokens = options?.maxTokens ?? 500;
  const temperature = options?.temperature ?? 0.7;

  for (const model of models) {
    try {
      console.log(`🤖 Trying model: ${model}`);
      const response = await openrouter.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        console.log(`✅ Response from ${model} (${content.length} chars)`);
        return content;
      }
    } catch (error) {
      console.warn(`⚠️ ${model} failed:`, (error as Error).message);
      continue;
    }
  }

  console.error('❌ All models failed');
  return '';
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Generate a chat reply using Dory's soul.
 * 
 * @param userMessage - The user's message (cleaned of @mentions)
 * @param context - Optional context: RAG results + conversation history
 * @returns Dory's reply
 */
export async function generateDoryReply(
  userMessage: string,
  context?: {
    knowledgeBase?: string;
    conversationHistory?: string;
    username?: string;
  }
): Promise<string> {
  const soul = getSoulPrompt();

  // Build the system prompt: SOUL.md + injected context
  let systemContent = soul;

  if (context?.knowledgeBase) {
    systemContent += `\n\n---\n\n## KNOWLEDGE BASE CONTEXT (use this to answer if relevant)\n\n${context.knowledgeBase}`;
  }

  if (context?.conversationHistory) {
    systemContent += `\n\n---\n\n## RECENT CONVERSATION\n\n${context.conversationHistory}`;
  }

  const userContent = context?.username
    ? `[Message from ${context.username}]: ${userMessage}`
    : userMessage;

  const reply = await callLLM([
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent }
  ]);

  return reply || "Hmm, I'm having a moment 🤔 Try asking again?";
}

/**
 * Generate daily digest from message logs.
 * Uses DIGEST_PROMPT.md as system prompt.
 */
export async function generateDigest(messageLog: string): Promise<string> {
  const digestPrompt = getDigestPrompt();

  const reply = await callLLM(
    [
      { role: 'system', content: digestPrompt },
      { role: 'user', content: `Here are the community messages from the past 24 hours:\n\n${messageLog}` }
    ],
    { maxTokens: 2000, temperature: 0.3 }
  );

  return reply || '⚠️ Failed to generate daily digest.';
}

/**
 * Generate an embedding for semantic search.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!config.openrouterApiKey) return null;

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sns.id',
        'X-Title': 'SNS CS Agent'
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: text.slice(0, 8000)
      })
    });

    if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0]?.embedding || null;
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    return null;
  }
}

/**
 * Check if AI service is configured
 */
export function isAIConfigured(): boolean {
  return !!config.openrouterApiKey && config.openrouterApiKey.startsWith('sk-or-');
}
