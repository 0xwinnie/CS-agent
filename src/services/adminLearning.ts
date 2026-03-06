/**
 * Admin Teaching / Auto-Learning Service
 * Simplified version - core knowledge base operations
 */

import { config } from '../config/env';
import * as fs from 'fs';
import * as path from 'path';
import { generateEmbedding, cosineSimilarity } from './semanticKB';

const KB_PATH = path.resolve(__dirname, '../../data/knowledge-base.json');
const EMBEDDINGS_PATH = path.resolve(__dirname, '../../data/kb-embeddings.json');

/**
 * Check if a user is an admin
 */
export function isAdmin(userId: string): boolean {
  return config.adminUserIds.includes(userId);
}

/**
 * Check if similar question already exists in KB
 */
async function checkDuplicate(question: string): Promise<boolean> {
  try {
    const questionEmbedding = await generateEmbedding(question);
    
    if (!questionEmbedding) {
      return false;
    }
    
    if (!fs.existsSync(EMBEDDINGS_PATH)) {
      return false;
    }
    
    const rawData = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf-8'));
    const entries = rawData.entries || rawData;
    
    for (const entry of entries) {
      const similarity = cosineSimilarity(questionEmbedding, entry.embedding);
      if (similarity > 0.92) {
        return true;
      }
    }
  } catch (e) {
    console.error('Error checking duplicate:', e);
  }
  
  return false;
}

/**
 * Add new Q&A to knowledge base
 */
export async function addToKnowledgeBase(
  question: string,
  answer: string,
  keywords: string[],
  addedBy: string
): Promise<{ success: boolean; entryId?: string; error?: string }> {
  try {
    // Check for duplicate
    const isDuplicate = await checkDuplicate(question);
    if (isDuplicate) {
      return { success: false, error: 'Similar question already exists' };
    }
    
    // Load existing KB
    let kb: any[] = [];
    if (fs.existsSync(KB_PATH)) {
      kb = JSON.parse(fs.readFileSync(KB_PATH, 'utf-8'));
    }
    
    // Create new entry
    const entryId = `admin-taught-${Date.now()}`;
    
    // If no keywords provided, extract simple ones
    const extractedKeywords = keywords.length > 0 ? keywords : 
      question.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 8);
    
    const newEntry = {
      id: entryId,
      question,
      keywords: extractedKeywords,
      answer,
      confidence: 1.0,
      source: `admin:${addedBy}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    kb.push(newEntry);
    
    // Save KB
    fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2));
    
    // Generate and save embedding
    const embedding = await generateEmbedding(`${question} ${answer}`);
    
    if (!embedding) {
      return { success: false, error: 'Failed to generate embedding' };
    }

    let embeddingsData: any = { entries: [] };
    if (fs.existsSync(EMBEDDINGS_PATH)) {
      embeddingsData = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf-8'));
    }
    
    embeddingsData.entries.push({
      id: entryId,
      question,
      answer,
      keywords: extractedKeywords,
      embedding
    });
    
    fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(embeddingsData, null, 2));
    
    console.log(`✅ New KB entry added: ${entryId}`);
    return { success: true, entryId };
    
  } catch (error) {
    console.error('Error adding to KB:', error);
    return { success: false, error: String(error) };
  }
}
