/**
 * Vercel Serverless Entry Point
 * Discord bots need persistent WebSocket connections.
 * This is a workaround that initializes the bot when the function is called.
 * Note: Vercel's serverless model isn't ideal for Discord bots.
 * Consider Railway.app or Fly.io for better compatibility.
 */

// Track if bot is initialized
let botInitialized = false;

/**
 * Vercel serverless handler
 */
export default function handler(req: any, res: any) {
  // Health check endpoint
  if (req.url === '/health') {
    return res.status(200).json({
      status: 'ok',
      botInitialized,
      timestamp: new Date().toISOString()
    });
  }

  // Initialize bot on first request (cold start)
  if (!botInitialized) {
    try {
      // Import and start the bot
      require('../index');
      botInitialized = true;
      
      return res.status(200).json({
        status: 'bot_starting',
        message: 'Discord bot is initializing...',
        note: 'Bot requires persistent connection. Use Railway.app for production.'
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Bot already running
  return res.status(200).json({
    status: 'bot_running',
    message: 'Bot is active'
  });
}