/**
 * CS Agent Bot - Soul-Driven Version
 * A Discord bot with memory, personality, and AI-powered responses
 */

import { Client, GatewayIntentBits, ActivityType, Events } from 'discord.js';
import { config, validateEnv } from './config/env';
import { handleMessageWithSoul, getUserStats, getUserMemory, userDatabase } from './core/soulEngine';
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
  console.log('✅ Soul-driven mode activated');
  console.log('🧠 Memory system: Active');
  console.log('🎯 Trust system: Active');
  console.log('========================================');
  
  // Set bot activity
  client.user?.setActivity('SNS Community', { type: ActivityType.Watching });
});

/**
 * Message create event handler - Soul-driven
 */
client.on(Events.MessageCreate, async (message) => {
  try {
    await handleMessageWithSoul(message, client);
  } catch (error) {
    console.error('❌ Error handling message:', error);
  }
});

/**
 * Guild member add - Welcome new members
 */
client.on(Events.GuildMemberAdd, async (member) => {
  console.log(`👋 New member joined: ${member.user.tag}`);
  
  // Get or create user memory
  const userMemory = getUserMemory(member.user.id, member.user.username);
  
  // Send welcome DM
  try {
    await member.send(
      `👋 欢迎来到 SNS 社区！\n\n` +
      `我是 CS Agent，这里的社区助手。\n` +
      `如果你有任何关于 sol.site 或 .sol 域名的问题，随时 @我 或私信我。\n\n` +
      `社区里有很多热心的小伙伴，也可以多跟大家交流 😊`
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
  
  if (command === 'stats') {
    console.log(getUserStats());
  } else if (command === 'report') {
    console.log('📊 Generating report...');
    generateAndSaveMarkdownReport();
  } else if (command === 'users') {
    console.log('👥 Known users:');
    userDatabase.forEach((mem, id) => {
      console.log(`  ${mem.username} (${mem.trustLevel}) - ${mem.interactionCount} interactions`);
    });
  } else if (command === 'help') {
    console.log('Available commands: stats, report, users, help');
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
