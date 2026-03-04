/**
 * Embedding Service
 * Converts text to vector embeddings for semantic search
 * Uses OpenRouter's embedding API
 */

import { config } from '../config/env';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

/**
 * Generate embedding for text using OpenRouter
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sns.id',
        'X-Title': 'SNS CS Agent'
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small', // Cheap and effective
        input: text.slice(0, 8000) // Token limit
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>;
    };

    return data.data[0]?.embedding || null;
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    return null;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Batch generate embeddings
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    if (embedding) {
      results.push({ embedding, text });
    }
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
