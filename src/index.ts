/**
 * CS Agent Bot - Refactored AI-Driven Version
 * Simple boundary constraints + AI autonomous decisions
 */

import { Client, GatewayIntentBits, ActivityType, Events } from 'discord.js';
import { config, validateEnv } from './config/env';
import { handleSoulMessage, clearSession } from './core/soulEngine';
import { isAdmin } from './services/adminLearning';
import { generateAndSaveMarkdownReport } from './services/feedbackReport';

// Validate environment before starting
validateEnv();

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

/**
 * Bot ready event handler
 */
client.once(Events.ClientReady, () => {
  const botName = client.user?.tag || 'Unknown';
  console.log('========================================');
  console.log(`🤖 ${botName} is online!`);
  console.log('========================================');
  console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
  console.log('✅ AI-driven mode activated');
  console.log('🧠 Semantic search: Active');
  console.log('🎯 Admin learning: Active');
  console.log('========================================');
  
  // Set bot activity
  client.user?.setActivity('SNS Community', { type: ActivityType.Watching });
});

/**
 * Message create event handler
 */
client.on(Events.MessageCreate, async (message) => {
  try {
    await handleSoulMessage(message, client);
  } catch (error) {
    console.error('❌ Error handling message:', error);
  }
});

/**
 * Guild member add - Welcome new members
 */
client.on(Events.GuildMemberAdd, async (member) => {
  console.log(`👋 New member joined: ${member.user.tag}`);
  
  try {
    await member.send(
      `👋 Welcome to the SNS community!\n\n` +
      `I'm CS Agent, your community assistant.\n` +
      `If you have any questions about sol.site or .sol domains, feel free to @mention me anytime.\n\n` +
      `There are many helpful folks here—don't hesitate to chat with everyone! 😊`
    );
    console.log(`📤 Sent welcome DM to ${member.user.tag}`);
  } catch (error) {
    console.log(`⚠️ Could not DM ${member.user.tag} (probably has DMs disabled)`);
  }
});

/**
 * Error event handler
 */
client.on(Events.Error, (error) => {
  console.error('❌ Discord client error:', error);
});

// Login to Discord
console.log('🔌 Connecting to Discord...');
client.login(config.discordToken).catch((error) => {
  console.error('❌ Failed to login:', error.message);
  process.exit(1);
});

// Admin command handler (via console)
process.stdin.on('data', (data) => {
  const command = data.toString().trim();
  
  if (command === 'report') {
    console.log('📊 Generating report...');
    generateAndSaveMarkdownReport();
  } else if (command === 'help') {
    console.log('Available commands: report, help');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});
