/**
 * RAG (Retrieval-Augmented Generation) Service
 * Generates answers based on retrieved FAQ context
 */

import { config } from '../config/env';
import { semanticSearch } from './semanticKB';
import { KnowledgeBaseEntry } from './knowledgeBase';

interface RAGResult {
  answer: string;
  sources: KnowledgeBaseEntry[];
  confidence: number;
}

/**
 * Generate answer using RAG approach
 * 1. Retrieve relevant FAQs
 * 2. Use AI to synthesize answer from context
 */
export async function generateRAGAnswer(
  question: string,
  userLanguage: 'zh' | 'en',
  context?: string[]
): Promise<RAGResult | null> {
  console.log('🔍 RAG: Retrieving relevant FAQs...');

  // Step 1: Retrieve top relevant FAQs
  const retrieved = await semanticSearch(question, 3);

  if (retrieved.length === 0) {
    console.log('⚠️ RAG: No relevant FAQs found');
    return null;
  }

  const topMatch = retrieved[0];
  console.log(`✅ RAG: Top match similarity: ${topMatch.similarity.toFixed(3)}`);

  // If similarity is very high (>0.85), use directly with light editing
  if (topMatch.similarity > 0.85) {
    return {
      answer: topMatch.entry.answer,
      sources: [topMatch.entry],
      confidence: topMatch.similarity
    };
  }

  // If similarity is medium (0.6-0.85), use AI to synthesize
  if (topMatch.similarity >= 0.6) {
    return await synthesizeAnswer(question, retrieved, userLanguage, context);
  }

  // Similarity too low - don't answer
  console.log(`⚠️ RAG: Similarity too low (${topMatch.similarity.toFixed(3)}), skipping`);
  return null;
}

/**
 * Use AI to synthesize answer from retrieved context
 */
async function synthesizeAnswer(
  question: string,
  retrieved: Array<{ entry: KnowledgeBaseEntry; similarity: number }>,
  userLanguage: 'zh' | 'en',
  context?: string[]
): Promise<RAGResult | null> {
  // Build context from retrieved FAQs
  const contextText = retrieved
    .map((r, i) => `FAQ ${i + 1} (relevance: ${(r.similarity * 100).toFixed(0)}%):\nQ: ${r.entry.question}\nA: ${r.entry.answer}`)
    .join('\n\n');

  const systemPrompt = `You are a helpful assistant for the SNS (Solana Name Service) community. Answer based on the provided FAQ content.

IMPORTANT RULES:
1. ALWAYS respond in ENGLISH (default for international community)
2. Only use the provided FAQ content, do not make up information
3. If the FAQ content is insufficient, honestly say you don't know
4. Keep a friendly, concise tone
5. Use emoji appropriately (1-2 max)
6. DO NOT include any URLs or links in your answer
7. If the FAQ mentions a website/link, summarize the information without including the URL`;

  const userPrompt = `User question: "${question}"\n\nRelevant FAQs:\n${contextText}\n\nPlease answer based on the FAQs above. Respond in ENGLISH:`;

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
        model: config.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    let answer = data.choices?.[0]?.message?.content?.trim();

    // Safety: if AI returns JSON, extract the text content
    if (answer && answer.startsWith('{') && answer.endsWith('}')) {
      try {
        const parsed = JSON.parse(answer);
        answer = parsed.response || parsed.text || parsed.answer || answer;
      } catch {
        // Not valid JSON, use as is
      }
    }

    if (answer && answer.length > 2) {
      return {
        answer,
        sources: retrieved.map(r => r.entry),
        confidence: retrieved[0].similarity
      };
    }

    return null;
  } catch (error) {
    console.error('❌ RAG synthesis failed:', error);
    // Fallback to best matching FAQ answer
    return {
      answer: retrieved[0].entry.answer,
      sources: [retrieved[0].entry],
      confidence: retrieved[0].similarity
    };
  }
}

/**
 * Quick semantic match - for fast responses
 */
export async function quickSemanticMatch(
  question: string,
  threshold: number = 0.75
): Promise<KnowledgeBaseEntry | null> {
  const results = await semanticSearch(question, 1);

  if (results.length > 0 && results[0].similarity >= threshold) {
    return results[0].entry;
  }

  return null;
}
