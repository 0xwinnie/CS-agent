/**
 * OpenAI Service
 * Handles AI-powered responses using OpenAI API
 */

import OpenAI from 'openai';
import { config } from '../config/env';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

/**
 * Generate a chat completion response
 * @param userMessage - The user's question or message
 * @param context - Optional context from knowledge base
 * @returns The AI-generated response
 */
export async function generateChatResponse(
  userMessage: string,
  context?: string
): Promise<string> {
  try {
    if (!config.openaiApiKey) {
      console.warn('⚠️ OpenAI API key not configured');
      return '';
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a helpful customer support agent for sol.site, a decentralized domain name service on Solana. 
Be concise, friendly, and accurate. If you don't know something, say so.
${context ? `\n\nContext from knowledge base:\n${context}` : ''}`
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await openai.chat.completions.create({
      model: config.chatModel,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    return '';
  }
}

/**
 * Generate an embedding for text similarity search
 * @param text - Text to embed
 * @returns Vector embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!config.openaiApiKey) {
      return [];
    }

    const response = await openai.embeddings.create({
      model: config.embeddingModel,
      input: text,
    });

    return response.data[0]?.embedding || [];
  } catch (error) {
    console.error('❌ Embedding generation error:', error);
    return [];
  }
}

/**
 * Check if OpenAI is configured and ready
 * @returns boolean
 */
export function isOpenAIConfigured(): boolean {
  return !!config.openaiApiKey && config.openaiApiKey.startsWith('sk-');
}