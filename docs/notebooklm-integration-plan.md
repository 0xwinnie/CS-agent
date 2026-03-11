# CS Agent + NotebookLM Integration Plan

## Architecture Design

```
User Question
    ↓
CS Agent Classifies Question
    ↓
┌─────────────────┬─────────────────┐
↓                 ↓                 ↓
SNS Specific    General Question  Unknown Question
    ↓               ↓               ↓
Query NotebookLM  AI Free Answer   Say Don't Know
    ↓
Get Accurate Answer
    ↓
Reply to User
```

## Notebook Structure Design

### Notebook 1: SNS Core Knowledge (Primary)
- **Purpose**: Store all SNS official documentation
- **Sources**:
  - GitBook: https://docs.sns.id (entire site)
  - GitHub: SNS contract README
  - User guide PDF
  - FAQ documents

### Notebook 2: Sol.site Guide (Secondary)
- **Purpose**: sol.site website building tutorials
- **Sources**:
  - sol.site documentation
  - Video tutorials (YouTube)
  - Template instructions

### Notebook 3: Troubleshooting (Dynamic)
- **Purpose**: Common questions and solutions
- **Update Frequency**: Weekly generation from Discord feedback

## Code Integration

### New Service: `notebookLMService.ts`

```typescript
interface NotebookQueryResult {
  answer: string;
  sources: string[];
  confidence: number;
}

export async function querySNSKnowledge(question: string): Promise<NotebookQueryResult | null> {
  const NOTEBOOK_ID = "sns-core-knowledge"; // or alias

  try {
    // Query using MCP tool
    const result = await mcp__notebooklm_mcp__notebook_query({
      notebook_id: NOTEBOOK_ID,
      query: question,
      max_tokens: 500
    });

    return {
      answer: result.response,
      sources: result.cited_sources || [],
      confidence: result.confidence || 0.8
    };
  } catch (error) {
    console.error('NotebookLM query failed:', error);
    return null;
  }
}
```

### Modify `soulEngine.ts` Response Flow

```typescript
async function generateSoulfulResponse(
  userMessage: string,
  username: string,
  userMemory: UserMemory,
  isDirectMention: boolean
): Promise<string | null> {

  const userLanguage = detectLanguage(userMessage);
  const classification = classifySNSQuestion(userMessage);

  // CASE 1: SNS Specific Question → Query NotebookLM
  if (classification.isSNSSpecific || classification.confidence >= 0.5) {
    console.log('🔍 Querying NotebookLM for SNS question...');

    const notebookResult = await querySNSKnowledge(userMessage);

    if (notebookResult && notebookResult.confidence >= 0.7) {
      // NotebookLM has answer
      const prefix = userLanguage === 'zh' ? '' : '';
      const suffix = `\n\n📚 Source: ${notebookResult.sources.slice(0, 2).join(', ')}`;

      return prefix + notebookResult.answer + suffix;
    }

    // NotebookLM also can't find → Log and guide
    console.log('⚠️ NotebookLM has no answer');
    logUnknownQuestion(userMessage, username);

    return userLanguage === 'zh'
      ? `This question is quite complex, I need to verify 🤔\n\nI suggest checking the official documentation: https://docs.sns.id\nOr contact human support for accurate information.`
      : `That's a complex question - I want to make sure I get it right 🤔\n\nCheck the official docs: https://docs.sns.id\nOr contact human support for accurate info.`;
  }

  // CASE 2: Non-SNS Question → AI Free Answer
  return generateAIFallbackResponse(userMessage, username, userMemory, userLanguage, isDirectMention);
}
```

## Workflow

### Initialization (One-time)
```bash
# 1. Install NotebookLM CLI
npm install -g @notebooklm/cli

# 2. Login
nlm login

# 3. Create main knowledge base notebook
nlm notebook create "SNS Core Knowledge"
nlm alias set sns-core <notebook-id>

# 4. Add document sources
nlm source add sns-core --url "https://docs.sns.id"
nlm source add sns-core --url "https://github.com/SolanaNameService/README.md"

# 5. Wait for indexing to complete
nlm source list sns-core
```

### Daily Updates
```bash
# Weekly sync document updates
nlm source stale sns-core          # Check which documents are outdated
nlm source sync sns-core --confirm # Sync updates

# Generate new content from Discord feedback
nlm source add sns-core --text "$(cat new-faq.md)" --title "Community FAQ Update $(date)"
```

### Monitoring
```bash
# Check NotebookLM status
nlm notebook describe sns-core

# Review answer quality (sample)
nlm notebook query sns-core "How to register a .sol domain?"
```

## Advantages

| Feature | Local JSON KB | NotebookLM |
|---------|-------------|------------|
| **Content Maintenance** | Manual editing required | Auto-sync GitBook |
| **Semantic Understanding** | Keyword matching | AI deep understanding |
| **Citation Sources** | None | Auto-document citations |
| **Multi-language** | Requires separate translation | AI auto-translates answers |
| **Update Latency** | Instant | Hours (sync cycle) |

## Implementation Steps

### Phase 1: Preparation (Now)
- [ ] Install `nlm` CLI: `npm install -g @notebooklm/cli`
- [ ] Run `nlm login` authentication
- [ ] Create SNS Core Knowledge notebook
- [ ] Add docs.sns.id as source

### Phase 2: Development (Tomorrow)
- [ ] Implement `notebookLMService.ts`
- [ ] Modify `soulEngine.ts` integration query
- [ ] Add caching mechanism (avoid duplicate queries)

### Phase 3: Testing
- [ ] Compare NotebookLM vs local KB answer quality
- [ ] Adjust confidence threshold
- [ ] Handle timeout/failure cases

### Phase 4: Migration
- [ ] Disable local JSON KB (or keep as fallback)
- [ ] Full NotebookLM usage
- [ ] Monitor unknown question count

## Fallback Strategy

When NotebookLM is unavailable:
```typescript
// Priority: NotebookLM → Local KB → Say Don't Know
const result = await querySNSKnowledge(question)
  ?? searchKnowledgeBase(question)  // Local JSON
  ?? null;
```

## Cost Estimate

NotebookLM is currently **free** (Google provides), but has implicit costs:
- Query latency: ~1-3 seconds
- Token consumption: Medium (document indexed once, queries reuse)

If charging begins in the future:
1. Add local cache (Redis/memory)
2. Return cached answers for similar questions
3. Reduce query frequency
