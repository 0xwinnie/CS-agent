/**
 * SNS Domain Classifier
 * Determines if a question is SNS-specific or general
 */

// SNS-specific keywords - these indicate the question is about SNS/sol.site
const SNS_KEYWORDS = [
  // Domain-related
  'domain', 'domains', '.sol', 'sol domain', 'sns',
  'register', 'registration', 'buy domain', 'purchase domain',
  'renew', 'expiration', 'expiry', 'transfer', 'sell domain',
  'subdomain', 'sub-domain', 'dns', 'record', 'txt record',
  'mx record', 'cname', 'a record', 'ipfs', 'hosting',
  
  // sol.site related
  'sol.site', 'solsite', 'website builder', 'site builder',
  'website', 'site', 'template', 'publish',
  
  // Token/Platform
  '$sns', 'sns token', 'governance', 'referral',
  
  // Wallet/Blockchain specific to SNS
  'phantom', 'solflare', 'backpack', 'wallet connect',
  'magic eden', 'tensor', 'nft marketplace', 'nft trade',
  
  // Community & Partnership
  'partnership', 'collaboration', 'integrate', 'integration',
  'developer', 'dev', 'api', 'sdk', 'build on sns',
  'community', 'ambassador', 'contribute', 'join team',
  'marketing', 'promote', 'sponsor', 'event',
  
  // Chinese keywords
  '域名', '注册', '购买域名', '续费', '转让', '出售',
  '子域名', '解析', '记录', '网站', '建站', '模板',
  '钱包', '连接', '交易', '交易失败', '找不到',
  '合作', '开发', '开发者', '集成', '接入', 'API',
  '社区', '大使', '推广', '赞助', '活动',
  
  // Issues specific to SNS
  'domain not showing', 'not in wallet', 'missing domain',
  'transaction failed', 'register error', 'cannot register',
];

// General crypto/Web3 keywords - these are NOT SNS-specific
const GENERAL_CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'binance', 'bnb',
  'coinbase', 'kraken', 'crypto exchange', 'defi',
  'staking', 'yield', 'farming', 'liquidity',
  'altcoin', 'token price', 'market cap', 'trading',
  'ledger', 'trezor', 'hardware wallet',
  'gas fee', 'network fee', 'blockchain',
  
  // Chinese
  '比特币', '以太坊', '币安', '交易所', '质押', '挖矿',
];

/**
 * Classify if a question is SNS-specific
 * Returns confidence score 0-1
 */
export function classifySNSQuestion(message: string): {
  isSNSSpecific: boolean;
  confidence: number;
  reason: string;
} {
  const textLower = message.toLowerCase().trim();
  
  // Check for SNS keywords
  const snsMatches = SNS_KEYWORDS.filter(kw => 
    textLower.includes(kw.toLowerCase())
  );
  
  // Check for general crypto keywords (reduces SNS specificity)
  const generalMatches = GENERAL_CRYPTO_KEYWORDS.filter(kw => 
    textLower.includes(kw.toLowerCase())
  );
  
  // Calculate scores
  const snsScore = snsMatches.length * 0.3;
  const generalScore = generalMatches.length * 0.2;
  
  // Adjust confidence based on context
  let confidence = Math.min(snsScore, 1.0);
  
  // If general crypto keywords dominate, reduce SNS confidence
  if (generalScore > snsScore) {
    confidence = Math.max(0, confidence - generalScore);
  }
  
  // Special cases - very strong SNS indicators
  const strongIndicators = [
    '.sol', 'sns', 'sol.site', 'solsite',
    '域名', '注册域名', 'sol域名'
  ];
  if (strongIndicators.some(i => textLower.includes(i))) {
    confidence = Math.max(confidence, 0.9);
  }
  
  // Threshold for being "SNS-specific"
  const isSNSSpecific = confidence >= 0.5;
  
  let reason = '';
  if (isSNSSpecific) {
    reason = `Matched SNS keywords: ${snsMatches.slice(0, 3).join(', ')}`;
  } else if (snsMatches.length > 0) {
    reason = `Weak SNS match (${snsMatches.length} keywords), likely general question`;
  } else {
    reason = 'No SNS keywords detected';
  }
  
  return { isSNSSpecific, confidence, reason };
}

/**
 * Detect language of message
 */
export function detectLanguage(message: string): 'zh' | 'en' {
  const chineseChars = /[\u4e00-\u9fff]/.test(message);
  return chineseChars ? 'zh' : 'en';
}

/**
 * Check if question requires strict knowledge base lookup
 * (i.e., we should NOT let AI improvise)
 */
export function requiresStrictAnswer(message: string): boolean {
  const textLower = message.toLowerCase();
  
  // These types of questions MUST have accurate answers from KB
  const strictPatterns = [
    /how (do|can|to) (register|buy|purchase|renew|transfer)/i,
    /(price|cost|fee) (of|for)? .*(domain|registration)/i,
    /what.*(character|emoji|chinese|support|allowed)/i,
    /dns.*(setup|configure|record)/i,
    /wallet.*(support|connect)/i,
    /(scam|fake|admin).*(dm|message)/i,
    /(refund|money back)/i,
    /v1.*v2|version.*difference/i,
    /怎么.*(注册|购买|续费|转让)/,
    /域名.*(价格|费用|多少钱)/,
    /支持.*(中文|emoji|字符)/,
    /(退款|退钱)/,
  ];
  
  return strictPatterns.some(pattern => pattern.test(textLower));
}
