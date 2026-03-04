# CS Agent - Discord Bot

A Discord bot for community support and customer service automation.

## Phase 1 Features

- ✅ Bot login and connection
- ✅ Message logging
- ✅ Basic command: `!ping` → "Pong!"

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure `.env` file with your Discord token

3. Run the bot:
```bash
# Development (with auto-reload)
npm run watch

# Or build and run
npm run build
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `!ping` | Tests bot connectivity |

## Project Structure

```
src/
├── index.ts              # Main entry point
├── config/
│   └── env.ts           # Environment configuration
└── handlers/
    └── messageHandler.ts # Message processing logic
```