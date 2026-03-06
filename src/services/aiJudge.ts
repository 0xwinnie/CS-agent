/**
 * AI Judge Service
 * 让 AI 判断意图，而非硬编码规则
 */

import { generateChatResponse } from './ai';
import { config } from '../config/env';

export interface IntentAnalysis {
  intent: 'sns_question' | 'greeting' | 'off_topic' | 'correction' | 'chitchat' | 'unknown';
  confidence: number;
  shouldAnswer: boolean;
  reasoning: string;
  suggestedTone?: 'professional' | 'friendly' | 'playful';
}

export interface TeachingExtraction {
  isTeaching: boolean;
  question?: string;
  answer?: string;
  confidence: number;
}

/**
 * AI 判断用户消息意图
 */
export async function judgeIntent(
  message: string,
  context: string,
  isAdmin: boolean
): Promise<IntentAnalysis> {
  const prompt = `Analyze this Discord message and determine the user's intent.

Message: "${message}"
Conversation context: ${context || 'None'}
User is admin: ${isAdmin}

Respond in JSON format:
{
  "intent": "sns_question|greeting|off_topic|correction|chitchat|unknown",
  "confidence": 0.0-1.0,
  "shouldAnswer": true/false,
  "reasoning": "brief explanation",
  "suggestedTone": "professional|friendly|playful"
}

Guidelines for sns_question:
- ANY question about: .sol domains, SNS (Solana Name Service), sol.site websites
- Registration, transfer, renewal of domains
- DNS setup, subdomains, wallet connection
- Pricing, fees, discounts
- Includes "how to", "what is", "can I", "do you" about above topics

Examples of sns_question:
- "How do I register a .sol domain?"
- "What is SNS?"
- "How much does a domain cost?"
- "Can I transfer my domain?"

Examples of greeting:
- "Hi", "Hello", "Hey there", "Good morning"

Examples of off_topic:
- "What's the weather?"
- "Tell me a joke"
- "Who is the president?"`;

  try {
    const response = await generateChatResponse(prompt, 
      'You are an intent classifier. Respond only with valid JSON.');
    
    if (response) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as IntentAnalysis;
      }
    }
  } catch (e) {
    console.error('Intent judgment failed:', e);
  }

  // Fallback
  return {
    intent: 'unknown',
    confidence: 0.5,
    shouldAnswer: true,
    reasoning: 'Failed to analyze, defaulting to answer',
    suggestedTone: 'friendly'
  };
}

/**
 * AI 提取教学知识（管理员纠正时）
 */
export async function extractTeaching(
  adminMessage: string,
  botPreviousAnswer: string,
  originalQuestion: string
): Promise<TeachingExtraction> {
  const prompt = `An admin is correcting my previous answer. Extract the knowledge.

Original question: "${originalQuestion}"
My previous (wrong) answer: "${botPreviousAnswer}"
Admin's correction: "${adminMessage}"

Analyze if this is a teaching moment and extract the Q&A pair.

Respond in JSON:
{
  "isTeaching": true/false,
  "question": "extracted or original question",
  "answer": "correct answer to learn",
  "confidence": 0.0-1.0
}

isTeaching is true if admin is providing correct information to learn from.`;

  try {
    const response = await generateChatResponse(prompt,
      'You extract knowledge from corrections. Respond only with valid JSON.');
    
    if (response) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as TeachingExtraction;
        // Validate
        if (result.isTeaching && result.question && result.answer) {
          return result;
        }
      }
    }
  } catch (e) {
    console.error('Teaching extraction failed:', e);
  }

  return { isTeaching: false, confidence: 0 };
}

/**
 * AI 生成回复（带边界约束）
 */
export async function generateBoundedReply(
  question: string,
  knowledge: string | null,
  tone: string,
  username: string
): Promise<string> {
  const systemPrompt = `You are CS-Agent, a helpful SNS (Solana Name Service) community support bot.

STRICT BOUNDARIES (Never violate):
1. NEVER include external URLs - if needed, say "visit sns.id"
2. NEVER answer non-SNS questions with technical details - deflect humorously
3. NEVER make up information - say "I don't know" if unsure
4. NEVER be rude or dismissive

BEHAVIOR:
- Answer SNS/sol.site questions concisely (under 300 chars)
- Use the provided knowledge if available
- Match the requested tone
- If no knowledge, say you don't know (with humor)`;

  const prompt = knowledge
    ? `Question from ${username}: "${question}"

Relevant knowledge: "${knowledge}"

Respond in ${tone} tone. Follow your boundaries.`
    : `Question from ${username}: "${question}"

I don't have specific knowledge about this. Respond that I don't know (with a touch of humor).`;

  const response = await generateChatResponse(prompt, systemPrompt);
  
  // Safety: remove any links that might have slipped through
  return (response || "Hmm, I'm speechless 🤔")
    .replace(/https?:\/\/[^\s]+/g, '[link removed - visit sns.id]');
}

/**
 * AI 生成闲聊/婉拒回复
 */
export async function generateCasualReply(
  message: string,
  intent: string,
  username: string
): Promise<string> {
  const systemPrompt = `You are CS-Agent, a friendly SNS community bot.

RULES:
- Keep it brief (under 150 chars)
- Be warm and human-like
- Gently steer back to SNS topics if off-topic
- NO external links`;

  const prompts: Record<string, string> = {
    greeting: `Say a warm, brief greeting to ${username}. Mention you're here for SNS questions.`,
    off_topic: `${username} asked something off-topic: "${message}". Respond humorously but steer back to SNS.`,
    chitchat: `Respond casually to: "${message}". Brief and friendly.`,
    unknown: `Not sure what ${username} wants. Ask how you can help with SNS.`
  };

  const prompt = prompts[intent] || prompts.unknown;
  
  const response = await generateChatResponse(prompt, systemPrompt);
  return (response || "Hello! 👋")
    .replace(/https?:\/\/[^\s]+/g, '[link removed]');
}
