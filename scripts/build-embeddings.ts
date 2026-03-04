/**
 * Build KB Embeddings Script
 * Run this to generate vector embeddings for all FAQ entries
 */

import { buildKBEmbeddings, getKBStats } from '../src/services/semanticKB';

async function main() {
  console.log('🚀 Building Knowledge Base Embeddings\n');

  const stats = getKBStats();
  console.log(`Current stats:`);
  console.log(`  Total KB entries: ${stats.total}`);
  console.log(`  Embedded entries: ${stats.embedded}`);
  console.log();

  console.log('⏳ Generating embeddings (this may take a few minutes)...\n');

  try {
    await buildKBEmbeddings();
    console.log('\n✅ Embeddings built successfully!');
  } catch (error) {
    console.error('\n❌ Failed to build embeddings:', error);
    process.exit(1);
  }
}

main();
