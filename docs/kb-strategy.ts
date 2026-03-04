/**
 * Knowledge Base Strategy Options
 * 
 * Option 1: Full Text (Current)
 *    - Pros: User gets immediate answer in chat
 *    - Pros: Bot can do semantic matching on content
 *    - Cons: Need to update when docs change
 * 
 * Option 2: Link Only
 *    - Pros: Always points to latest docs
 *    - Pros: Zero maintenance for content updates
 *    - Cons: User must click link (friction)
 *    - Cons: Poor UX in chat (being sent away)
 *    - Cons: Can't match keywords in linked content
 * 
 * Option 3: Hybrid (Recommended) ★
 *    - Short summary + "Learn more" link
 *    - Best of both worlds
 *    - Example below
 */

export const HYBRID_EXAMPLE = {
  id: "setup-sol-site",
  question: "How do I set up my sol.site website?",
  keywords: ["set up", "setup", "sol.site", "website", "configure", "create site"],
  
  // Short, stable summary (rarely changes)
  answer: `To set up sol.site:
1. Visit https://sol.site and connect wallet
2. Select your .sol domain  
3. Choose template & customize
4. Publish instantly

📚 Full guide with screenshots: https://docs.sns.id/sol-site-guide`,
  
  confidence: 1.0
};

/**
 * Recommended Strategy by Content Type:
 */
export const CONTENT_STRATEGY = {
  // Type 1: Stable Procedures → Keep full text in KB
  stableProcedures: [
    "How to register a domain",
    "How to transfer ownership", 
    "Wallet connection steps",
    "DNS record setup"
  ],
  
  // Type 2: Frequently Changing → Summary + Link
  dynamicContent: [
    "Current pricing (depends on SOL price)",
    "Active promotions/campaigns",
    "Tokenomics details",
    "Partner integrations"
  ],
  
  // Type 3: Complex Documentation → Link only is OK
  complexDocs: [
    "Developer API reference",
    "Smart contract integration",
    "Advanced DNS configuration",
    "Migration guides"
  ]
};

/**
 * If you want to use GitBook as source of truth:
 * 
 * 1. Keep KB entries minimal:
 *    - 2-3 sentence summary
 *    - Keywords for matching
 *    - Link to full doc
 * 
 * 2. Structure GitBook with stable URLs:
 *    - /getting-started (stable)
 *    - /domain-management (stable)  
 *    - /pricing (stable, content updates)
 * 
 * 3. Avoid link rot:
 *    - Don't use: /guide-v2, /new-pricing-2026
 *    - Use: /guide, /pricing (permanent URLs)
 */
