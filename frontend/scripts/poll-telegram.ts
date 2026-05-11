import { loadEnvConfig } from '@next/env';

// Load .env.local
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is missing in .env.local');
  process.exit(1);
}

async function poll() {
  console.log('🚀 Starting Telegram Polling Mode (Bypassing Webhooks/ngrok)...');
  
  // 1. Delete Webhook (Polling doesn't work if a webhook is set)
  console.log('🧹 Clearing existing webhooks...');
  await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
  
  let lastUpdateId = 0;

  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
      const data = await res.json() as any;
      
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          console.log(`📩 Received message from: ${update.message?.chat?.first_name || 'User'}`);
          
          // Forward to local server
          try {
            const serverRes = await fetch('http://localhost:3000/api/telegram/webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update)
            });
            const result = await serverRes.json();
            console.log('✅ AI Brain processed message');
          } catch (serverErr: any) {
            console.error('❌ Local server error (Is npm run dev running?):', serverErr.message);
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Polling error:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

poll();
