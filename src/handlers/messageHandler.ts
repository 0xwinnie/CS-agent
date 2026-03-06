/**
 * Message Handler - Simplified
 * Delegates to AI-driven soulEngine
 */

import { Message, Client } from 'discord.js';
import { handleSoulMessage } from '../core/soulEngine';

/**
 * Main entry point for message handling
 */
export async function handleMessage(message: Message, client: Client): Promise<void> {
  await handleSoulMessage(message, client);
}
