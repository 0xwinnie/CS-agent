#!/usr/bin/env node
/**
 * Daily Digest Generator
 * Run this via cron: node scripts/generateDailyReport.js
 */

import { generateDailyDigest } from '../src/services/dailyDigest';

console.log('📊 Generating daily digest...\n');

generateDailyDigest()
  .then((digest) => {
    console.log('\n✅ Digest generated:\n');
    console.log('---');
    console.log(digest);
  })
  .catch((error) => {
    console.error('❌ Failed to generate digest:', error);
    process.exit(1);
  });
