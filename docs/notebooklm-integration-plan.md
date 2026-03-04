# CS Agent + NotebookLM 集成方案

## 架构设计

```
用户提问
    ↓
CS Agent 分类问题
    ↓
┌─────────────────┬─────────────────┐
↓                 ↓                 ↓
SNS 特定问题    一般问题        未知问题
    ↓               ↓               ↓
查 NotebookLM   AI 自由回答    说不知道
    ↓
获取准确答案
    ↓
回复用户
```

## Notebook 结构设计

### Notebook 1: SNS Core Knowledge (主要)
- **用途**: 存放所有 SNS 官方文档
- **Sources**:
  - GitBook: https://docs.sns.id (整站)
  - GitHub: SNS 合约 README
  - 用户指南 PDF
  - FAQ 文档

### Notebook 2: Sol.site Guide (次要)  
- **用途**: sol.site 建站教程
- **Sources**:
  - sol.site 文档
  - 视频教程 (YouTube)
  - 模板说明

### Notebook 3: Troubleshooting (动态)
- **用途**: 常见问题和解决方案
- **更新频率**: 每周从 Discord 反馈生成

## 代码集成

### 新增服务: `notebookLMService.ts`

```typescript
interface NotebookQueryResult {
  answer: string;
  sources: string[];
  confidence: number;
}

export async function querySNSKnowledge(question: string): Promise<NotebookQueryResult | null> {
  const NOTEBOOK_ID = "sns-core-knowledge"; // 或 alias
  
  try {
    // 使用 MCP 工具查询
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

### 修改 `soulEngine.ts` 回答流程

```typescript
async function generateSoulfulResponse(
  userMessage: string,
  username: string,
  userMemory: UserMemory,
  isDirectMention: boolean
): Promise<string | null> {
  
  const userLanguage = detectLanguage(userMessage);
  const classification = classifySNSQuestion(userMessage);
  
  // CASE 1: SNS 特定问题 → 查 NotebookLM
  if (classification.isSNSSpecific || classification.confidence >= 0.5) {
    console.log('🔍 Querying NotebookLM for SNS question...');
    
    const notebookResult = await querySNSKnowledge(userMessage);
    
    if (notebookResult && notebookResult.confidence >= 0.7) {
      // NotebookLM 有答案
      const prefix = userLanguage === 'zh' ? '' : '';
      const suffix = `\n\n📚 来源: ${notebookResult.sources.slice(0, 2).join(', ')}`;
      
      return prefix + notebookResult.answer + suffix;
    }
    
    // NotebookLM 也找不到 → 记录并引导
    console.log('⚠️ NotebookLM has no answer');
    logUnknownQuestion(userMessage, username);
    
    return userLanguage === 'zh' 
      ? `这个问题比较复杂，我需要确认一下 🤔\n\n建议你查看官方文档: https://docs.sns.id\n或者联系人工客服获取准确信息。`
      : `That's a complex question - I want to make sure I get it right 🤔\n\nCheck the official docs: https://docs.sns.id\nOr contact human support for accurate info.`;
  }
  
  // CASE 2: 非 SNS 问题 → AI 自由回答
  return generateAIFallbackResponse(userMessage, username, userMemory, userLanguage, isDirectMention);
}
```

## 工作流程

### 初始化 (一次性)
```bash
# 1. 安装 NotebookLM CLI
npm install -g @notebooklm/cli

# 2. 登录
nlm login

# 3. 创建主知识库笔记本
nlm notebook create "SNS Core Knowledge"
nlm alias set sns-core <notebook-id>

# 4. 添加文档源
nlm source add sns-core --url "https://docs.sns.id"
nlm source add sns-core --url "https://github.com/SolanaNameService/README.md"

# 5. 等待索引完成
nlm source list sns-core
```

### 日常更新
```bash
# 每周同步文档更新
nlm source stale sns-core          # 检查哪些文档过期
nlm source sync sns-core --confirm # 同步更新

# 从 Discord 反馈生成新内容
nlm source add sns-core --text "$(cat new-faq.md)" --title "Community FAQ Update $(date)"
```

### 监控
```bash
# 检查 NotebookLM 状态
nlm notebook describe sns-core

# 查看回答质量（抽查）
nlm notebook query sns-core "How to register a .sol domain?"
```

## 优势

| 特性 | 本地 JSON KB | NotebookLM |
|------|-------------|------------|
| **内容维护** | 需手动编辑 | 自动同步 GitBook |
| **语义理解** | 关键词匹配 | AI 深度理解 |
| **引用来源** | 无 | 自动标注文档出处 |
| **多语言** | 需单独翻译 | AI 自动翻译回答 |
| **更新延迟** | 即时 | 几小时（同步周期） |

## 实施步骤

### Phase 1: 准备 (现在)
- [ ] 安装 `nlm` CLI: `npm install -g @notebooklm/cli`
- [ ] 运行 `nlm login` 认证
- [ ] 创建 SNS Core Knowledge notebook
- [ ] 添加 docs.sns.id 作为 source

### Phase 2: 开发 (明天)
- [ ] 实现 `notebookLMService.ts`
- [ ] 修改 `soulEngine.ts` 集成查询
- [ ] 添加缓存机制（避免重复查询）

### Phase 3: 测试
- [ ] 对比 NotebookLM vs 本地 KB 回答质量
- [ ] 调整 confidence threshold
- [ ] 处理超时/失败情况

### Phase 4: 切换
- [ ] 停用本地 JSON KB（或作为 fallback）
- [ ] 全量使用 NotebookLM
- [ ] 监控未知问题数量

## Fallback 策略

当 NotebookLM 不可用时：
```typescript
// 优先级：NotebookLM → 本地 KB → 说不知道
const result = await querySNSKnowledge(question) 
  ?? searchKnowledgeBase(question)  // 本地 JSON
  ?? null;
```

## 成本预估

NotebookLM 目前 **免费**（Google 提供），但有隐性成本：
- 查询延迟: ~1-3 秒
- Token 消耗: 中等（文档索引一次，查询复用）

如果将来收费，可以：
1. 加本地缓存（Redis/内存）
2. 相似问题直接返回缓存答案
3. 降低查询频率
