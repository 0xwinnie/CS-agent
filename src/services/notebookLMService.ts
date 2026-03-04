/**
 * NotebookLM Knowledge Service
 * Queries SNS documentation via NotebookLM
 */

import { execSync } from 'child_process';
import { config } from '../config/env';

const NOTEBOOK_ALIAS = 'sns-core';
const NLM_CMD = '~/.local/bin/uvx --from notebooklm-mcp-cli nlm';

interface NotebookLMResult {
  answer: string;
  sources: string[];
  confidence: number;
}

/**
 * Execute nlm command and parse result
 */
function executeNLM(command: string): string | null {
  try {
    const result = execSync(`${NLM_CMD} ${command}`, {
      encoding: 'utf-8',
      timeout: 30000, // 30 second timeout
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.trim();
  } catch (error) {
    console.error('❌ NLM command failed:', error);
    return null;
  }
}

/**
 * Query NotebookLM for SNS knowledge
 */
export async function queryNotebookLM(question: string): Promise<NotebookLMResult | null> {
  console.log(`📓 Querying NotebookLM: "${question.substring(0, 50)}..."`);
  
  const result = executeNLM(`notebook query ${NOTEBOOK_ALIAS} "${question.replace(/"/g, '\\"')}"`);
  
  if (!result) {
    console.log('⚠️ NotebookLM query returned no result');
    return null;
  }
  
  // Parse the response (NotebookLM returns plain text answer)
  return {
    answer: result,
    sources: ['docs.sns.id'],
    confidence: 0.85 // NotebookLM generally provides good answers
  };
}

/**
 * Check if NotebookLM is available
 */
export function isNotebookLMAvailable(): boolean {
  try {
    const result = executeNLM('login --check');
    return result?.includes('Authentication valid') ?? false;
  } catch {
    return false;
  }
}

/**
 * Get notebook stats
 */
export function getNotebookStats(): { sourceCount: number; status: string } | null {
  try {
    const result = executeNLM(`notebook describe ${NOTEBOOK_ALIAS}`);
    if (!result) return null;
    
    return {
      sourceCount: 1, // Simplified
      status: 'active'
    };
  } catch {
    return null;
  }
}
