# SNS User Guide

## Overview
Solana Name Service (SNS) provides decentralized identities on the Solana blockchain. By mapping human-readable names (.sol) to on-chain data like wallet addresses, IPFS CIDs, and images, it simplifies interactions and promotes web3 mass adoption. Users control their domains and data in a privacy-preserving way.

## Tokenomics ($SNS Token)
$SNS is a community token created for .sol holders with a 10 billion total supply. 40% of the supply is claimable by existing .sol domain holders, Solana communities, and SNS users via the Genesis Airdrop and LFG Campaign. Genesis Airdrop snapshot was April 30, 2025.

**Common Questions:**
- **What is $SNS?** A community token by and for .sol holders.
- **Where can I trade $SNS?** Jupiter and other major Solana DEXs.
- **Is there a vesting schedule?** Yes, for ecosystem growth (linear over 4 years) and core contributors (1-year cliff, 3-year linear).

## SNS V2

### Introduction
SNS offers a decentralized and affordable way to map .sol domain names to on-chain data. It creates a web3 identity, replacing long SOL addresses with readable names for crypto payments and beyond.

### Discover Domains
Visit sns.id to search for lowercase .sol domains. AI suggestions generate name ideas directly in the search bar. Use Bulk search to look up multiple domains simultaneously.
**Troubleshooting/Warnings:** Be cautious of emojis using variation selectors (U+FE0F or U+FE0E) which scam buyers. Suspect unicodes are hidden by default with a warning sign.

### Register
Unregistered domains can be bought instantly on sns.id. Payment options include crypto (SOL, $FIDA - 5% discount) or credit card via Coinflow. Once registered, there are NO renewal fees.
**Pricing:**
- 1 char: $750 USD
- 2 char: $700 USD
- 3 char: $640 USD
- 4 char: $160 USD
- 5+ char: $20 USD

### Trade
Buy registered domains at fixed prices or via category bids on the SNS Marketplace. To sell, list for a fixed price or accept unsolicited/category offers. Domain listings use an escrow account. Transferring funds to a listed domain WILL result in loss of funds.

### Manage Your Domains
- **Profile:** Set avatar, website, and social handles on your domain.
- **Subdomains:** Create endless subdomains under a parent domain for a gas fee to organize or share.
- **Transfers:** Irreversible transfers to other wallets via the "Transfer" function.
- **Wrap/Unwrap:** Tokenize domains into NFTs for trading on Magic Eden etc. Wrapping locks editing and transferring until unwrapped. Wait, Phantom & Solflare support wrapped domains directly, but others need unwrapping to retrieve sent funds.
- **Primary Domain:** Set a domain as primary to represent your identity across Solana Dapps.

### Using SNS
Use .sol domains (like `domain.sol`) for sending SPL tokens and SOL. If supported, you can also use Twitter handles (e.g., `@handle`) in wallets like Solflare. 
**Resolving:** domains can resolve to URLs, IPFS CIDs, or Arweave hashes. Brave natively resolves `.sol` domains. sol-domain.org acts as a web proxy.

### List of Integrations
Over 80 integrations exist, including wallets (Phantom, Solflare, Backpack), explorers (Solscan.io), browsers (Brave), NFT platforms (Magic Eden), and analytics tools (Step Finance).

## SNS V1 (Legacy)

### Discover & Register
V1 is accessible at v1.sns.id. Allows discovering, searching by certified sellers, or using the SNS search bot. Registration allows picking storage size (1kb default, 10kb for advanced IPFS hosts). Pricing remains the same as v2.

### Trade
Follows a maker-taker fee schedule based on $FIDA holdings. More $FIDA means lower taker fees or maker rebates. Includes P2P trading where users can offer domains and SOL.

### Records
Manage domain data with records (IPFS, ARWV, SOL, ETH, BTC, URL, Discord, Twitter). Records have staleness (invalidated if transferred) and Right of Association (prevents impersonation, e.g., verifying ETH address ownership). Records V2 supports Ledger wallets for cold storage while routing SOL to hot wallets.

### Cross-Chain Domains
Experimental feature allowing users to bridge their .sol domains to Injective, BNB, and Base via Wormhole. You can register natively on Injective with $INJ at injective.sns.id. Bridging allows using the `.sol` domain for transactions on non-Solana chains. 

## Programs

### Community Voting
$SNS holders can vote on proposals on Realms. 5 day review, 3 day voting. 1 $SNS = 1 vote. 1% quorum needed.

### Refer & Earn
Turn your .sol domain into a referral code and earn kickbacks. Tiers scale with $SNS holdings up to 20% kickbacks and 5% discounts.

### Anti-Squatting
Program preventing bad-faith registration of trademarks, projects, or identities.
**Troubleshooting:** If you are a victim, contact SNS support on Discord or Twitter.

### Grant & Bug Bounty
Grants provided in $SNS for beneficial projects/integrations. Bug bounties hosted on Immunefi offer $1K to $100K for medium/critical smart contract bugs.

### Ambassador Program
Program for community builders, content creators, and innovators. Apply via form to earn monthly incentives, merch, and revenue sharing.