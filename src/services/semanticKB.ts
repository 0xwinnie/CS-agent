/**
 * Semantic Knowledge Base
 * Vector-based semantic search for FAQ matching
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateEmbedding, cosineSimilarity } from './embeddingService';

// Re-export for other modules
export { generateEmbedding, cosineSimilarity };

const KB_PATH = path.resolve(__dirname, '../../data/knowledge-base.json');
const EMBEDDINGS_PATH = path.resolve(__dirname, '../../data/kb-embeddings.json');

interface KnowledgeBaseEntry {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  confidence: number;
}

interface EmbeddedEntry extends KnowledgeBaseEntry {
  embedding: number[];
}

// In-memory cache
let embeddedKB: EmbeddedEntry[] = [];
let kbLoaded = false;

/**
 * Load knowledge base with embeddings
 */
function loadEmbeddedKB(): EmbeddedEntry[] {
  if (kbLoaded) return embeddedKB;

  try {
    // Try to load pre-computed embeddings
    if (fs.existsSync(EMBEDDINGS_PATH)) {
      const data = fs.readFileSync(EMBEDDINGS_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      // Support both { entries: [...] } and flat array formats
      embeddedKB = parsed.entries || parsed;
      kbLoaded = true;
      console.log(`✅ Loaded ${embeddedKB.length} embedded KB entries`);
      return embeddedKB;
    }
  } catch (error) {
    console.error('❌ Failed to load embeddings:', error);
  }

  return [];
}

/**
 * Build embeddings for entire knowledge base
 * Run this once when KB changes
 */
export async function buildKBEmbeddings(): Promise<void> {
  console.log('🔨 Building KB embeddings...');

  try {
    const kbData = fs.readFileSync(KB_PATH, 'utf-8');
    const entries: KnowledgeBaseEntry[] = JSON.parse(kbData);

    const embedded: EmbeddedEntry[] = [];

    for (const entry of entries) {
      // Combine question + keywords for better semantic coverage
      const textToEmbed = `${entry.question} ${entry.keywords.join(' ')}`;
      const embedding = await generateEmbedding(textToEmbed);

      if (embedding) {
        embedded.push({
          ...entry,
          embedding
        });
        console.log(`✅ Embedded: ${entry.question.substring(0, 50)}...`);
      }

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Save to disk (wrapped in { entries: [...] } structure)
    fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify({ entries: embedded }));
    console.log(`✅ Saved ${embedded.length} embeddings to ${EMBEDDINGS_PATH}`);

    // Update cache
    embeddedKB = embedded;
    kbLoaded = true;
  } catch (error) {
    console.error('❌ Failed to build embeddings:', error);
    throw error;
  }
}

/**
 * Semantic search - find most similar FAQ entries
 */
export async function semanticSearch(
  query: string,
  topK: number = 3
): Promise<Array<{ entry: KnowledgeBaseEntry; similarity: number }>> {
  // Ensure KB is loaded
  const kb = loadEmbeddedKB();

  if (kb.length === 0) {
    console.warn('⚠️ No embedded KB found, run buildKBEmbeddings() first');
    return [];
  }

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    console.error('❌ Failed to generate query embedding');
    return [];
  }

  // Calculate similarities
  const results = kb.map(entry => ({
    entry: {
      id: entry.id,
      question: entry.question,
      keywords: entry.keywords,
      answer: entry.answer,
      confidence: entry.confidence
    },
    similarity: cosineSimilarity(queryEmbedding, entry.embedding)
  }));

  // Sort by similarity (descending)
  results.sort((a, b) => b.similarity - a.similarity);

  // Return top K
  return results.slice(0, topK);
}

/**
 * Check if embeddings exist
 */
export function hasEmbeddings(): boolean {
  return fs.existsSync(EMBEDDINGS_PATH);
}

/**
 * Get KB stats
 */
export function getKBStats(): { total: number; embedded: number } {
  try {
    const kbData = fs.readFileSync(KB_PATH, 'utf-8');
    const entries: KnowledgeBaseEntry[] = JSON.parse(kbData);

    let embedded = 0;
    if (fs.existsSync(EMBEDDINGS_PATH)) {
      const raw = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf-8'));
      embedded = raw.entries ? raw.entries.length : raw.length;
    }

    return { total: entries.length, embedded };
  } catch {
    return { total: 0, embedded: 0 };
  }
}
