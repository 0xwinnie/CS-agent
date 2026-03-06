/**
 * AI Service with Multi-Provider Support
 * Handles AI-powered responses using OpenRouter (Kimi, Gemini, Claude)
 */

import OpenAI from 'openai';
import { config } from '../config/env';

// Provider configurations
const PROVIDERS = {
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: config.openrouterApiKey,
    // Use configured fallback chain or defaults
    models: config.modelFallbackChain.length > 0 
      ? config.modelFallbackChain 
      : [
          'google/gemini-2.5-flash',  // Primary - stable
          'openrouter/auto',           // Fallback - smart routing
          'moonshot/kimi-k2.5'         // Last resort
        ]
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    apiKey: config.openaiApiKey,
    models: ['gpt-4o-mini', 'gpt-4o']
  }
};

// Initialize OpenRouter client (supports OpenAI-compatible API)
const openrouter = new OpenAI({
  baseURL: PROVIDERS.openrouter.baseURL,
  apiKey: PROVIDERS.openrouter.apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://sns.id',
    'X-Title': 'SNS CS Agent'
  }
});

/**
 * Generate a chat completion response with fallback
 * @param userMessage - The user's question or message
 * @param context - Optional context from knowledge base
 * @returns The AI-generated response
 */
export async function generateChatResponse(
  userMessage: string,
  context?: string
): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a helpful customer support agent for SNS (Solana Name Service) and sol.site.

Key facts:
- sol.site gives .sol domain holders a free Web2 website (e.g., alice.sol → alice.sol.site)
- No browser extensions needed
- Works with any hosting: GitHub Pages, Vercel, Netlify, AWS
- Can also set up email: anything@domain.sol.site
- One-time purchase, no renewals
- Standard characters only: a-z, 0-9, hyphen

Be concise, friendly, and accurate. If you don't know something, say you'll forward it to the team.
${context ? `\n\nKnowledge base context:\n${context}` : ''}`
    },
    {
      role: 'user' as const,
      content: userMessage
    }
  ];

  // Try models in order with fallback
  const models = PROVIDERS.openrouter.models;
  
  for (const model of models) {
    try {
      console.log(`🤖 Trying model: ${model}`);
      
      const response = await openrouter.chat.completions.create({
        model,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        console.log(`✅ Response from ${model}`);
        return content;
      }
    } catch (error) {
      console.warn(`⚠️ ${model} failed:`, (error as Error).message);
      continue; // Try next model
    }
  }

  console.error('❌ All models failed');
  return '';
}

/**
 * Generate an embedding for text similarity search
 * Uses OpenRouter's embedding models
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!config.openrouterApiKey) {
      return [];
    }

    const response = await openrouter.embeddings.create({
      model: 'openrouter/openai/text-embedding-3-small',
      input: text,
    });

    return response.data[0]?.embedding || [];
  } catch (error) {
    console.error('❌ Embedding generation error:', error);
    return [];
  }
}

/**
 * Check if AI service is configured and ready
 * @returns boolean
 */
export function isAIConfigured(): boolean {
  return !!config.openrouterApiKey && config.openrouterApiKey.startsWith('sk-or-');
}

/**
 * Get current provider status
 */
export function getAIStatus(): { configured: boolean; provider: string; models: string[] } {
  return {
    configured: isAIConfigured(),
    provider: 'OpenRouter',
    models: PROVIDERS.openrouter.models
  };
}
