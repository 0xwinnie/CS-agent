/**
 * Dory — SNS Community Helper Bot
 * 
 * Clean entry point. All behavior lives in SOUL.md (loaded by ai.ts).
 * All digest logic lives in DIGEST_PROMPT.md (loaded by dailyDigest.ts).
 */

import { Client, GatewayIntentBits, ActivityType, Events } from 'discord.js';
import { config, validateEnv } from './config/env';
import { handleSoulMessage } from './core/soulEngine';
import { generateDailyDigest, getLatestReport } from './services/dailyDigest';
import { reloadPrompts } from './services/ai';

// ── Startup checks ─────────────────────────────────────────────────

validateEnv();

// ── Discord client ─────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

// ── Ready ──────────────────────────────────────────────────────────

client.once(Events.ClientReady, () => {
  console.log('========================================');
  console.log(`🐟 Dory is online! (${client.user?.tag})`);
  console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
  console.log('🧠 Mode: SOUL.md driven');
  console.log('========================================');

  client.user?.setActivity('SNS Community', { type: ActivityType.Watching });
});

// ── Message handler ────────────────────────────────────────────────

client.on(Events.MessageCreate, async (message) => {
  try {
    await handleSoulMessage(message, client);
  } catch (error) {
    console.error('❌ Error handling message:', error);
  }
});

// ── Welcome new members ────────────────────────────────────────────

client.on(Events.GuildMemberAdd, async (member) => {
  console.log(`👋 New member joined: ${member.user.tag}`);

  try {
    await member.send(
      `👋 Welcome to the SNS community!\n\n` +
      `I'm Dory, your community helper.\n` +
      `If you have any questions about .sol domains or sol.site, just @mention me anytime.\n\n` +
      `There are many helpful folks here — don't hesitate to ask! 😊`
    );
  } catch {
    console.log(`⚠️ Could not DM ${member.user.tag} (DMs probably disabled)`);
  }
});

// ── Error handler ──────────────────────────────────────────────────

client.on(Events.Error, (error) => {
  console.error('❌ Discord client error:', error);
});

// ── Console commands (for admin use) ───────────────────────────────

process.stdin.on('data', async (data) => {
  const command = data.toString().trim();

  switch (command) {
    case 'digest':
      console.log('📊 Generating daily digest...');
      const digest = await generateDailyDigest();
      console.log('\n' + digest);
      break;

    case 'latest':
      const report = getLatestReport();
      console.log(report || 'No reports found.');
      break;

    case 'reload':
      reloadPrompts();
      break;

    case 'help':
      console.log('Commands: digest, latest, reload, help');
      break;
  }
});

// ── Connect ────────────────────────────────────────────────────────

console.log('🔌 Connecting to Discord...');
client.login(config.discordToken).catch((error) => {
  console.error('❌ Failed to login:', error.message);
  process.exit(1);
});

// ── Graceful shutdown ──────────────────────────────────────────────

const shutdown = () => {
  console.log('\n👋 Shutting down...');
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
