# CS-Agent Optimization Plan - First Principles Analysis

## First Principles Thinking

### 1. The Essence of Response Speed Issues
**Core Problem**: Users wait too long (API call latency)

**First Principles Breakdown**:
- Each message → AI API call → Wait for generation → Return
- This is a **sequential blocking** pattern
- AI generation is an uncontrollable external dependency

**Optimization Directions**:
- **Knowledge base priority**: Local matching first, if hit return directly (zero latency)
- **Preload hotspots**: Pre-generate answers for common questions
- **Streaming responses**: First reply "Thinking...", then edit message
- **Edge caching**: Cache answers for similar questions

### 2. The Essence of Accuracy Issues
**Core Problem**: AI doesn't know the accurate answer, or confuses concepts

**First Principles Breakdown**:
- LLM is probability-based pattern matching, not a knowledge base
- Training data may be incorrect/outdated
- No clear "I don't know" boundary

**Optimization Directions**:
- **Strict knowledge boundaries**: Knowledge base hit → Use fixed answer; Miss → Clearly say "I don't know"
- **Intent classifier**: First classify question type, then decide response strategy
- **Answer validation**: Knowledge base answers need regular human review
- **Fallback mechanism**: AI only answers "knowledge base uncovered but safe" questions

## Specific Optimization Solutions

### Solution A: Tiered Response Architecture

```
User Message
  ↓
[Intent Classification] (Local, <10ms)
  - FAQ match → Return preset answer directly
  - Knowledge base match → Return structured answer
  - Sentiment/Feedback → Record and acknowledge
  - Complex question → AI generation
  ↓
[Streaming Response]
  - First send "🤔 Let me think..."
  - Background AI call
  - Edit message to update answer
```

### Solution B: Knowledge Base Enhancement

Current State:
- 12 simple FAQ entries
- Keyword matching (inaccurate)

Optimized:
- 50+ entries covering all common scenarios
- Vector similarity search (semantic matching)
- Tiered confidence thresholds
- Regular supplementation from actual conversations

### Solution C: Pre-generation Strategy

For high-frequency questions, pre-generate answer templates:
- "What is sol.site" → Fixed 3 sentences
- "How to register domain" → Step list
- "What is the cost" → Price table

### Solution D: Response Time Budget

```
Goal: <2 seconds to provide useful information

Allocation:
- Intent classification: 50ms
- Knowledge base query: 100ms
- Streaming ACK: Send immediately
- AI generation (if needed): 1-3s (background)
- Message edit: 100ms
```

## Implementation Plan

### Phase 1: Knowledge Base Expansion (Immediate)
- [x] Add emoji/CJK entries
- [ ] Add all SNS V1/V2 operation guides
- [ ] Add all sol.site feature descriptions
- [ ] Add troubleshooting entries

### Phase 2: Matching Algorithm Optimization (Short-term)
- [ ] Implement vector similarity search
- [ ] Add semantic understanding layer
- [ ] Multi-turn conversation context tracking

### Phase 3: Streaming Response (Medium-term)
- [ ] Implement "typing" status
- [ ] Message edit updates
- [ ] Loading indicator

### Phase 4: Monitoring & Feedback (Long-term)
- [ ] Record user feedback for all AI replies
- [ ] Regular manual review of inaccurate answers
- [ ] Automatic knowledge base updates

## Current Improvements (Based on Document Scraping)

1. **Structured Knowledge Base**: Extract all official answers from docs.sns.id
2. **Unified Terminology**: Distinguish SNS domain service vs sol.site website builder
3. **Troubleshooting**: Cover common issues (DNS, wallet, transaction failures, etc.)
4. **Boundary Statements**: Clarify which are ICANN rules vs SNS decisions
