const { generateRAGAnswer } = require('./dist/services/ragService');

async function test() {
  const result = await generateRAGAnswer("how to set up sol.site", "en");
  console.log("Result:", JSON.stringify(result, null, 2));
}

test();
