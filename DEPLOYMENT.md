# Deployment Guide

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Or build and run
npm run build
npm start
```

## Discord Setup Required

Before the bot can work, you need to enable intents in Discord Developer Portal:

1. Go to https://discord.com/developers/applications
2. Select your bot application
3. Go to "Bot" section in left sidebar
4. Under "Privileged Gateway Intents", enable:
   - ☑️ **MESSAGE CONTENT INTENT** (Required for reading messages)
   - ☑️ **SERVER MEMBERS INTENT** (Optional, for future features)
5. Click "Save Changes"

## Vercel Deployment

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variable
vercel env add DISCORD_TOKEN
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Connect repo to Vercel
3. Add `DISCORD_TOKEN` in Vercel Environment Variables
4. Deploy

### Important Note About Vercel

Discord bots need persistent connections (WebSocket), but Vercel uses serverless functions that terminate after requests. For a Discord bot, consider:

1. **Railway.app** - Better for bots (persistent hosting)
2. **Fly.io** - Docker-based, good for bots
3. **Replit** - Simple hosting (keep alive needed)
4. **Self-hosted** - Run on your own server

For this Phase 1 MVP, you can run locally or use Railway/Fly.io instead of Vercel.

## Testing the Bot

1. Invite bot to your server with this URL:
   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3072&integration_type=0&scope=bot
   ```

2. In Discord, type: `!ping`

3. Bot should reply: `🏓 Pong! Latency: Xms`

## Expected Console Output

```
✅ Environment variables validated
🔌 Connecting to Discord...
========================================
🤖 Connected as CS Agent#1234
========================================
📊 Serving 1 server(s)
✅ Bot is ready to receive messages
========================================
[2025-03-03T...] #general | user#1234: !ping
📤 Replied to ping from user#1234
```