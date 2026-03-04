# SNS Developer Docs

## Welcome & Basics
SNS maps human-readable `.sol` domain names to on-chain data (SOL addresses, IPFS CIDs). Fully decentralized and censorship-resistant.

### The Name Registry
Everything in Solana is identifiable by a public key. A domain's data is stored in a Name Registry account containing a header (Parent, Owner, Class) and payload (arbitrary binary data).

### TLD hierarchy
- Root TLD: `ZoAhWEqTVqHVqupYmEanDobY7dee5YKbQox9BNASZzU`
- `.sol` TLD: `58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx`
Every registered `.sol` domain is a child of the `.sol` TLD, and subdomains are children of the registered domain.

### On-Chain Resolution
Resolution logic:
1. If domain is tokenized (NFT), destination is the token holder.
2. If SOL record V2 is set (staleness & RoA verified), use the public key in the record.
3. If SOL record V1 is set and signature is valid, use the public key in the record.
4. If neither, resolve to the wallet address holding the domain account.

**Troubleshooting / FAQ:**
- **What if funds are sent to the NameRegistry owner when tokenized?** The NFT holder can withdraw from the escrow that received the funds.
- **Signature in V1?** Prevents funds from being sent to a stale SOL record after a domain changes hands.

### Web Resolution
- Browsers like **Brave** support native resolution. Type `domain.sol` into the URL bar.
- **sol-domain.org** proxy resolves names over DNS: `https://domain.sol-domain.org`.
- Resolution order: URL -> IPFS (via gateways) -> Arweave (via gateways) -> Shadow Drive.

### Domain Records
Instead of traditional DNS, SNS has web3 records like `IPFS`, `ARWV`, `SOL`, `ETH`, `BTC`, `twitter`, `discord`, `pic`, etc.
Records V2 encode differently than V1, using classes and providing a validation ID system to combat staleness. Both co-exist but V2 is the standard.

### Tokenization
Domains can be tokenized into Metaplex NFTs. While resolution still works, domain editing features are locked until unwrapped. Primarily used for selling domains on MagicEden/Tensor.

## SNS SDKs
SDKs exist for JS/TS (web3.js v1 and @solana/kit for v2), Rust, React, and Vue. Packages include `@bonfida/spl-name-service` (V1) and `@solana-name-service/sns-sdk-kit` (V2 kit).

### Quickstart Integration
1. **Resolve Domain:** `resolve(connection, "sns.sol")`
2. **Primary Domain:** `getPrimaryDomain({ rpc, walletAddress })` -> highly recommended over pure resolution for identifying users.
3. **Domain Records:** Fetch records using `getDomainRecords({ rpc, domain, records: [Record.Twitter, Record.Discord] })`. Use `verifyStaleness` and RoA checks.

### Registration
Use the `@bonfida/sns-widget` React component to embed registrations, or manual code using `registerDomainNameV2()`. Registration token mint defaults to USDC.

### Sales & Listings
NPM package `@bonfida/name-offers` manages fixed price, unsolicited, category, and P2P trades. Built-in referral system for secondary market shares 15% of transaction fees.

### Resolving, Subdomains & Deletion
- **Resolve:** Find wallet owner using `resolveDomain`.
- **Primary domains:** Retrieve 1-100 domains optimized with `getMultiplePrimaryDomains`.
- **Subdomains:** created via `createSubdomain()`. Note: Parent domain owner can transfer subdomains without their owner's signature.
- **Delete:** `deleteInstruction()`. **Warning:** Irreversible, burns domain, subdomains, and records. It returns to the global name pool.

### X Handle Methods
Find a twitter handle from pubkey using `getHandleAndRegistryKey` or reverse using `getTwitterRegistry`. All twitter handles are subdomains of the `.twitter` Root TLD.

## SNS API
Base URL: `https://sns-api.bonfida.com`
Provides high-speed indexing for domains, bypassing slow on-chain RPC lookup.

- **Domains:** `/v2/domains/history` for domain transactions (sales/registrations).
- **Primary Domains:** `/v2/user/fav-domains/{pubkeys}` gets the preferred domains for wallets.
- **Categories:** `/categories/list`, `/categories/stats`, and `/categories/floors`.
- **Users:** `/v2/user/domains/{pubkey}` lists all domains for a user.
- **Listings:** `/v2/listings/listings-v3` allows robust filtering (palindrome, emoji, mints, lengths). `/v2/listings/listing/{domain}` gets details for a single domain.
- **Sales:** `/sales/last`, `/sales/leaderboard`.
- **Trade Volume:** `/sales/volumes/sales`.
- **Owners:** `/owners/distribution` lists ownership distribution.
- **Images:** Image generation API at `https://image-api.bonfida.com`. E.g., `/image?domain=foo`. Cache-optimized.
- **Quicknode API:** JSON-RPC over HTTP POST using `get_domain_key` natively loaded into Quicknode nodes.