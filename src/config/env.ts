/**
 * Environment configuration
 * Loads and validates environment variables
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Bot configuration object
 */
export const config = {
  /** Discord bot token - required for authentication */
  discordToken: process.env.DISCORD_TOKEN || '',
  
  /** Command prefix for bot commands */
  prefix: process.env.BOT_PREFIX || '!',
  
  /** Bot activity status */
  activity: {
    type: process.env.BOT_ACTIVITY_TYPE || 'watching',
    text: process.env.BOT_ACTIVITY_TEXT || 'SNS Community'
  },

  /** AI Provider configuration (OpenRouter preferred) */
  openrouterApiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  chatModel: process.env.CHAT_MODEL || 'openrouter/moonshot/kimi-k2.5',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  aiProvider: process.env.AI_PROVIDER || 'openrouter', // 'openrouter' | 'openai'

  /** Feature flags */
  autoReplyEnabled: process.env.AUTO_REPLY_ENABLED === 'true',
  feedbackEnabled: process.env.FEEDBACK_ENABLED === 'true' || process.env.FEEDBACK_COLLECTION_ENABLED === 'true'
};

/**
 * Validates that required environment variables are set
 * @throws Error if DISCORD_TOKEN is missing
 */
export function validateEnv(): void {
  if (!config.discordToken) {
    throw new Error('DISCORD_TOKEN is required. Please check your .env file.');
  }
  console.log('✅ Environment variables validated');
}