/**
 * Message Handler
 * Processes incoming Discord messages with smart reply and feedback support
 */

import { Message, Client } from 'discord.js';
import { config } from '../config/env';
import { searchKnowledgeBase, isQuestion, logUnknownQuestion } from '../services/knowledgeBase';
import { submitFeedback, getFeedbackStats, savePassiveFeedback } from '../services/feedback';
import { generateAndSaveMarkdownReport, getLatestReport } from '../services/feedbackReport';
import { analyzeMessageIntent } from '../services/intentAnalyzer';
import { generateChatResponse, isAIConfigured } from '../services/ai';

/**
 * Handles incoming messages
 * @param message - Discord message object
 * @param client - Discord client instance
 */
export async function handleMessage(message: Message, client: Client): Promise<void> {
  // Ignore messages from bots (including self)
  if (message.author.bot) return;

  // Log all received messages
  console.log(`[${new Date().toISOString()}] #${message.channel.isDMBased() ? 'DM' : (message.channel as any).name} | ${message.author.tag}: ${message.content}`);

  // AI-powered passive feedback detection
  if (config.feedbackEnabled) {
    try {
      const intent = await analyzeMessageIntent(message.content, message.author.tag);
      
      if (intent.isFeedback && intent.confidence >= 0.7) {
        savePassiveFeedback(
          message.author.id,
          message.author.tag,
          message.content,
          {
            category: intent.category,
            confidence: intent.confidence,
            matchedKeywords: [intent.summary],
            isQuestion: message.content.includes('?') || message.content.includes('吗')
          }
        );
        console.log(`📊 AI detected feedback: ${intent.category} (${(intent.confidence * 100).toFixed(0)}%) - ${intent.summary}`);
        
        // Acknowledge high-confidence/critical feedback
        if (intent.severity === 'critical' || (intent.severity === 'high' && intent.confidence >= 0.85)) {
          await message.react('🚨'); // Critical issue
        } else if (intent.confidence >= 0.85) {
          await message.react('📊'); // High confidence feedback
        }
      } else {
        console.log(`💬 Not feedback: ${intent.category} (${(intent.confidence * 100).toFixed(0)}%)`);
      }
    } catch (error) {
      console.error('❌ Intent analysis error:', error);
    }
  }

  // Check if bot is mentioned
  const isMentioned = message.mentions.has(client.user!.id);

  // Check if message starts with command prefix
  if (message.content.startsWith(config.prefix)) {
    await handleCommand(message);
    return;
  }

  // Handle @bot mentions
  if (isMentioned) {
    await handleMention(message, client);
    return;
  }

  // Handle non-command messages (smart reply)
  await handleSmartReply(message);
}

/**
 * Handles bot commands
 * @param message - Discord message object
 */
async function handleCommand(message: Message): Promise<void> {
  const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  switch (command) {
    case 'ping':
      await handlePing(message);
      break;
    
    case 'feedback':
      await handleFeedback(message, args);
      break;

    case 'help':
      await handleHelp(message);
      break;
    
    case 'report':
      await handleReport(message);
      break;
    
    default:
      // Unknown command - silently ignore or could add help
      break;
  }
}

/**
 * Handles when bot is @mentioned
 * @param message - Discord message object
 * @param client - Discord client instance
 */
async function handleMention(message: Message, client: Client): Promise<void> {
  // Remove the @bot mention from the message content
  const contentWithoutMention = message.content
    .replace(new RegExp(`<@!?${client.user!.id}>`, 'g'), '')
    .trim();

  console.log(`🔔 Bot mentioned by ${message.author.tag}: "${contentWithoutMention}"`);

  // If just @bot with no text, say hello
  if (!contentWithoutMention) {
    await message.reply(
      `👋 Hi ${message.author.username}! I'm CS Agent, here to help with SNS and sol.site questions.\n\n` +
      `Try asking me something, or type \`!help\` for commands!`
    );
    return;
  }

  // Treat it like a question - use smart reply logic
  const match = searchKnowledgeBase(contentWithoutMention);

  if (match) {
    const reply = `👋 Hi ${message.author.username}!

${match.entry.answer}

_💡 Was this helpful? Type \`!feedback <your thoughts>\` to let us know!_`;
    
    await message.reply(reply);
    console.log(`✅ Replied to mention with KB match (score: ${match.score.toFixed(2)})`);
    return;
  }

  // No KB match - try AI
  if (isAIConfigured()) {
    console.log('🤖 No KB match for mention, trying AI...');
    
    const aiResponse = await generateChatResponse(
      contentWithoutMention,
      'You are a customer support agent for sol.site, a decentralized domain service on Solana.'
    );

    if (aiResponse) {
      await message.reply(
        `👋 Hi ${message.author.username}!

${aiResponse}

_⚠️ This is an AI-generated response. For official support, please contact the team._`
      );
      console.log('✅ Replied to mention with AI response');
      return;
    }
  }

  // No match and no AI
  await message.reply(
    `👋 Hi ${message.author.username}!

I don't have an answer for that yet, but I've noted your question. The team will review it soon!

_Type \`!help\` to see what I can do._`
  );
  logUnknownQuestion(contentWithoutMention, message.author.tag);
}

/**
 * Handles the !ping command
 * @param message - Discord message object
 */
async function handlePing(message: Message): Promise<void> {
  const latency = Date.now() - message.createdTimestamp;
  await message.reply(`🏓 Pong! Latency: ${latency}ms`);
  console.log(`📤 Replied to ping from ${message.author.tag}`);
}

/**
 * Handles the !feedback command
 * @param message - Discord message object
 * @param args - Command arguments
 */
async function handleFeedback(message: Message, args: string[]): Promise<void> {
  if (!config.feedbackEnabled) {
    await message.reply('❌ Feedback collection is currently disabled.');
    return;
  }

  const feedbackText = args.join(' ').trim();
  
  if (!feedbackText) {
    await message.reply(
      '📝 **Submit Feedback**\n\n' +
      'Usage: `!feedback <your message>`\n\n' +
      'Categories are auto-detected:\n' +
      '• 🐛 Bug reports\n' +
      '• 💡 Feature suggestions\n' +
      '• 😊 Compliments\n' +
      '• 😞 Complaints\n' +
      '• 📝 General feedback'
    );
    return;
  }

  try {
    const feedback = submitFeedback(
      message.author.id,
      message.author.tag,
      feedbackText
    );

    const categoryEmojis: Record<string, string> = {
      bug: '🐛',
      feature: '💡',
      compliment: '😊',
      complaint: '😞',
      general: '📝',
      other: '📋'
    };

    const emoji = categoryEmojis[feedback.category] || '📝';

    await message.reply(
      `✅ **Thank you for your feedback!**\n\n` +
      `${emoji} Category: **${feedback.category}**\n` +
      `🆔 ID: \`${feedback.id}\`\n\n` +
      `Your feedback has been recorded and will be reviewed by our team.`
    );

    console.log(`📥 Feedback received from ${message.author.tag}: ${feedback.category}`);
  } catch (error) {
    console.error('❌ Failed to save feedback:', error);
    await message.reply('❌ Sorry, there was an error saving your feedback. Please try again later.');
  }
}

/**
 * Handles the !report command - Generate and send daily feedback report
 * @param message - Discord message object
 */
async function handleReport(message: Message): Promise<void> {
  try {
    await message.reply('📊 正在生成用户反馈日报，请稍候...');
    
    const markdown = generateAndSaveMarkdownReport();
    
    // Send summary to Discord (truncate if too long)
    const summary = markdown.split('---')[0] + '\n---\n\n✅ 完整报告已保存到数据目录';
    
    await message.reply(summary.substring(0, 2000));
    
    console.log(`📊 Report generated by ${message.author.tag}`);
  } catch (error) {
    console.error('❌ Failed to generate report:', error);
    await message.reply('❌ 生成报告时出错，请稍后再试');
  }
}

/**
 * Handles the !help command
 * @param message - Discord message object
 */
async function handleHelp(message: Message): Promise<void> {
  await message.reply(
    '🤖 **CS Agent Bot Commands**\n\n' +
    '`!ping` - Check bot latency\n' +
    '`!feedback <message>` - Submit feedback/suggestions\n' +
    '`!report` - Generate daily feedback report (admin only)\n' +
    '`!help` - Show this help message\n\n' +
    '💡 **Smart Reply**\n' +
    'Ask me questions about sol.site and I\'ll try to help!\n\n' +
    '📊 **Passive Feedback**\n' +
    'I automatically collect feedback from community discussions'
  );
}

/**
 * Handles smart auto-replies to questions
 * @param message - Discord message object
 */
async function handleSmartReply(message: Message): Promise<void> {
  // Skip if auto-reply is disabled
  if (!config.autoReplyEnabled) {
    return;
  }

  // Check if this looks like a question
  if (!isQuestion(message.content)) {
    return;
  }

  console.log(`🔍 Processing question from ${message.author.tag}: "${message.content.substring(0, 50)}..."`);

  // Search knowledge base
  const match = searchKnowledgeBase(message.content);

  if (match) {
    // Found a match - reply with the answer
    const reply = `👋 Hi ${message.author.username}!\n\n${match.entry.answer}\n\n_💡 Was this helpful? Type \`!feedback <your thoughts>\` to let us know!_`;
    
    await message.reply(reply);
    console.log(`✅ Auto-replied to question with KB match (score: ${match.score.toFixed(2)})`);
    return;
  }

  // No KB match - try OpenAI if configured
  if (isAIConfigured()) {
    console.log('🤖 No KB match, trying OpenAI...');
    
    const aiResponse = await generateChatResponse(
      message.content,
      'You are a customer support agent for sol.site, a decentralized domain service on Solana.'
    );

    if (aiResponse) {
      await message.reply(
        `👋 Hi ${message.author.username}!\n\n${aiResponse}\n\n_⚠️ This is an AI-generated response. For official support, please contact the team._`
      );
      console.log('✅ Replied with AI-generated response');
      
      // Log for review
      logUnknownQuestion(message.content, message.author.tag);
      return;
    }
  }

  // No match and no AI - log for human review
  logUnknownQuestion(message.content, message.author.tag);
  
  // Optionally notify user that question was logged
  // Uncomment below if you want immediate acknowledgment:
  // await message.reply(
  //   `👋 Hi ${message.author.username}!\n\n` +
  //   `I don't have an answer for that yet, but I've forwarded your question to the team. ` +
  //   `They'll get back to you soon!\n\n` +
  //   `_In the meantime, you can type \`!help\` to see what I can do._`
  // );
  
  console.log(`📝 Logged unknown question for review`);
}