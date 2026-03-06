# ARCHITECTURE.md — Maintainer's Guide

> **Audience**: Doraemon (OpenClaw) and any developer/AI agent maintaining this project
> **Purpose**: Understand the design philosophy. Avoid regressing to old patterns.
> **Last updated**: 2026-03

---

## Core Design Principles

### Principle 1: The Prompt is the Brain. Code is the Guardrail.

All of Dory's behavioral decisions — tone, intent judgment, reply strategy, when to say "I don't know" — are controlled by `SOUL.md`, not code.

**Code only handles what LLMs can't do well:**
- Discord API interaction (receive messages, send replies)
- Data I/O (read knowledge base, write logs, manage sessions)
- Hard safety filters (strip URLs, truncate overly long replies)
- Infrastructure (model fallback, error handling, caching)

**Code must NEVER do:**
- Classify user intent (no intent classifier needed)
- Choose reply strategy (no switch/case routing)
- Control tone or style (no tone parameters)
- Categorize message types (no keyword matching)

If you find yourself writing `if (intent === 'greeting')` or `const keywords = ['bug', 'error', ...]` — **stop**. Ask: "Can I solve this by editing one sentence in SOUL.md?" The answer is almost always yes.

---

### Principle 2: One Message = One LLM Call

Current architecture:
```
Message → Code filter → RAG search → One LLM call → Code post-process → Send
```

Do not add intermediate layers. Do not add an "intent classification" call before the main LLM call. Do not add a "quality check" call after it. Every extra call = double the latency + double the cost + one more failure point.

**The only exception**: If a future feature requires genuinely complex multi-step tasks (e.g., querying on-chain data for the user), then multi-step calls may be justified. But for standard Q&A and chat, one call is enough.

---

### Principle 3: Knowledge is Data, Not Code

Knowledge lives in `data/knowledge-base.json` and is injected into the LLM context via embedding vector search.

**The right way to update knowledge**: Edit `knowledge-base.json` → regenerate embeddings
**The wrong way**: Hardcode answers in code, or put specific product details in the prompt

SOUL.md should NOT contain specific product information (prices, feature lists, etc.). It only defines "who you are, how you speak, where your boundaries are." All product knowledge goes through the knowledge base.

---

### Principle 4: Two Prompts, Two Personas, Never Mixed

| File | Purpose | Audience | Tone |
|------|---------|----------|------|
| `SOUL.md` | Live chat | Community users | Warm, concise, occasionally funny |
| `DIGEST_PROMPT.md` | Daily digest | Internal team | Clear, analytical, efficient |

These two prompts never appear in the same LLM call. They are independent tasks.

If a new feature is needed in the future (e.g., "weekly report mode" or "user onboarding mode"), create a new prompt file. Do not add logic to SOUL.md.

---

## File Responsibility Map (Read Before Changing Code)

```
SOUL.md                     ← Dory's persona and behavior rules (edit here to change behavior)
DIGEST_PROMPT.md            ← Digest analysis prompt (edit here to change report format)
data/knowledge-base.json    ← Product knowledge (edit here to update answers)
data/kb-embeddings.json     ← Knowledge vectors (regenerate after KB updates)

src/services/ai.ts          ← LLM call layer (reads prompt files, calls models)
src/core/soulEngine.ts      ← Main message flow (filter → RAG → LLM → post-process)
src/services/semanticKB.ts  ← Vector search (knowledge base retrieval)
src/services/messageLog.ts  ← Message logging (JSONL format, feeds daily digest)
src/services/dailyDigest.ts ← Digest generation (read logs → LLM analysis)
src/index.ts                ← Discord connection and event listeners
```

---

## Common Scenarios — The Right Way to Handle Them

### "Dory's answers aren't accurate enough"
**Don't**: Add more if/else or regex rules
**Do**: Improve the relevant Q&A entry in `knowledge-base.json`, or add a new entry

### "Dory's tone is off"
**Don't**: Add tone parameters or style variables in code
**Do**: Edit §2 PERSONALITY or the tone examples in `SOUL.md`

### "Dory shouldn't answer a certain type of question"
**Don't**: Add a keyword blacklist in code
**Do**: Add a new entry to §5 HARD LIMITS in `SOUL.md`

### "Users say Dory's replies are too long"
**Don't**: Hardcode a character truncation in code
**Do**: Adjust the §4 LENGTH guidance in `SOUL.md` so the LLM self-regulates (the 800-char code truncation is only a safety net)

### "Need a new feature (e.g., query on-chain data)"
**Do**: Add a new data source in `soulEngine.ts` (similar to the RAG pattern) and inject results into the LLM context. Do not create a new intent classifier for this.

### "Daily digest format needs changes"
**Don't**: Edit code in `dailyDigest.ts`
**Do**: Edit the OUTPUT FORMAT section in `DIGEST_PROMPT.md`

---

## Anti-Pattern Checklist (Never Do These)

❌ **Don't add an intent classifier** — No need to decide "is this a question or chitchat" before replying. SOUL.md describes how to handle all situations. The LLM judges on its own.

❌ **Don't add keyword matching** — No `const KEYWORDS = ['bug', 'error', ...]`. This was the v1 approach. The LLM understands natural language far better than keyword lists.

❌ **Don't write system prompts in code** — All persona and behavior definitions must live in SOUL.md or DIGEST_PROMPT.md. If you see `"You are a helpful..."` as a string in any `.ts` file, that's a bug.

❌ **Don't call the LLM twice per message** — Classify once + reply once = waste. Combine into one call.

❌ **Don't create separate prompts for different message types** — No `greetingPrompt`, `questionPrompt`, `offTopicPrompt`. One SOUL.md handles everything.

❌ **Don't put code logic in SOUL.md** — The prompt should never contain "when an @mention is received" or "log the message to a file." That's code's job.

---

## Recommended Maintenance Cadence

| Frequency | Action |
|-----------|--------|
| Daily | Review the digest. Note cases where Dory answered poorly. |
| Weekly | Update `knowledge-base.json` (add new Q&As, fix outdated info). |
| Monthly | Review SOUL.md — adjust personality or boundaries if needed. |
| As needed | Regenerate `kb-embeddings.json` after knowledge base updates. |

---

*This file is for maintainers, not for Dory. Dory only reads SOUL.md.*
