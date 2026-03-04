const { searchKnowledgeBase } = require('./src/services/knowledgeBase');

// Test the exact question from user
const testQuestion = "how do I set up a sol.site website?";
console.log('Testing:', testQuestion);

const result = searchKnowledgeBase(testQuestion);
if (result) {
  console.log('✅ Match found:', result.entry.question);
  console.log('   Score:', result.score.toFixed(2));
} else {
  console.log('❌ No match found');
}
