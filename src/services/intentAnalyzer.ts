/**
 * AI-Powered Feedback Intent Detection
 * Uses LLM to understand message intent instead of keyword matching
 */

import { config } from '../config/env';

interface IntentAnalysis {
  isFeedback: boolean;
  category: 'performance' | 'bug' | 'ui' | 'feature' | 'confusion' | 'complaint' | 'general' | 'none';
  confidence: number;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionNeeded: boolean;
}

/**
 * Analyze message intent using AI
 * Much more accurate than keyword matching
 */
export async function analyzeMessageIntent(
  message: string,
  username: string,
  context?: string[]
): Promise<IntentAnalysis> {
  // If no AI configured, fall back to keyword method
  if (!config.openrouterApiKey) {
    return fallbackKeywordAnalysis(message);
  }

  const systemPrompt = `You are an expert at analyzing user feedback in community discussions.
Your task is to determine if a message contains product feedback, bug reports, or issues.

Categories:
- performance: Loading slow, timeout, lag, speed issues
- bug: Errors, crashes, broken features, not working
- ui: Design issues, layout problems, display errors
- feature: Feature requests, suggestions, "would be nice"
- confusion: User doesn't understand how to use something
- complaint: General dissatisfaction, frustration
- general: Other feedback not fitting above
- none: Not feedback (just chat, question, greeting, etc.)

Respond ONLY in this JSON format:
{
  "isFeedback": true/false,
  "category": "performance|bug|ui|feature|confusion|complaint|general|none",
  "confidence": 0.0-1.0,
  "summary": "Brief 1-sentence summary of the issue",
  "severity": "low|medium|high|critical",
  "actionNeeded": true/false
}

Rules:
- isFeedback=true ONLY if user is reporting an issue, problem, or suggestion
- Questions like "How do I...?" are confusion, not feedback
- "I love this!" is compliment → general
- Casual chat, greetings, off-topic → none
- Be conservative: when in doubt, set isFeedback=false`;

  const userPrompt = `Message from user "${username}":
"${message}"

${context && context.length > 0 ? `Recent context:\n${context.slice(-3).join('\n')}` : ''}

Analyze this message and respond with JSON only.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sns.id',
        'X-Title': 'SNS CS Agent'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/```\n?([\s\S]*?)\n?```/) ||
                      [null, content];
    
    const jsonStr = jsonMatch[1] || content;
    const analysis: IntentAnalysis = JSON.parse(jsonStr);

    console.log(`🤖 AI Intent Analysis: ${analysis.isFeedback ? analysis.category : 'not feedback'} (${(analysis.confidence * 100).toFixed(0)}%)`);
    
    return analysis;

  } catch (error) {
    console.error('❌ AI intent analysis failed:', error);
    // Fallback to keyword method
    return fallbackKeywordAnalysis(message);
  }
}

/**
 * Fallback keyword-based analysis (when AI unavailable)
 */
function fallbackKeywordAnalysis(message: string): IntentAnalysis {
  const text = message.toLowerCase();
  
  // Quick keyword checks
  const hasPerformanceKeywords = ['慢', '卡顿', 'loading', 'lag', 'timeout', '超时', '卡'].some(k => text.includes(k));
  const hasBugKeywords = ['bug', '错误', 'error', '崩溃', 'crash', 'broken', 'failed'].some(k => text.includes(k));
  const hasUIKeywords = ['页面', '界面', '显示', 'layout', 'ui', '乱码'].some(k => text.includes(k));
  const hasFeatureKeywords = ['想要', '建议', '能不能', 'feature', 'suggestion'].some(k => text.includes(k));
  const hasConfusionKeywords = ['不懂', '怎么', '找不到', '怎么用'].some(k => text.includes(k));
  const hasComplaintKeywords = ['讨厌', '失望', '垃圾', '难用', 'terrible'].some(k => text.includes(k));
  
  let category: IntentAnalysis['category'] = 'none';
  let confidence = 0.5;
  
  if (hasPerformanceKeywords) { category = 'performance'; confidence = 0.7; }
  else if (hasBugKeywords) { category = 'bug'; confidence = 0.75; }
  else if (hasUIKeywords) { category = 'ui'; confidence = 0.65; }
  else if (hasFeatureKeywords) { category = 'feature'; confidence = 0.6; }
  else if (hasConfusionKeywords) { category = 'confusion'; confidence = 0.55; }
  else if (hasComplaintKeywords) { category = 'complaint'; confidence = 0.6; }
  
  return {
    isFeedback: category !== 'none',
    category,
    confidence,
    summary: category !== 'none' ? `Detected ${category} issue via keywords` : 'Not identified as feedback',
    severity: category === 'bug' || category === 'performance' ? 'high' : 'medium',
    actionNeeded: category !== 'none' && confidence > 0.6
  };
}

/**
 * Batch analyze multiple messages (for report generation)
 */
export async function batchAnalyzeMessages(
  messages: Array<{ content: string; username: string; timestamp: string }>
): Promise<Array<{ message: typeof messages[0]; analysis: IntentAnalysis }>> {
  const results: Array<{ message: typeof messages[0]; analysis: IntentAnalysis }> = [];
  
  for (const message of messages) {
    const analysis = await analyzeMessageIntent(message.content, message.username);
    results.push({ message, analysis });
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}
