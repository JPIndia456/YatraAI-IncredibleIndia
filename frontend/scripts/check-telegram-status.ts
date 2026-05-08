import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;

// Load .env.local
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is missing in .env.local');
  process.exit(1);
}

async function checkStatus() {
  console.log(`🔍 Checking Telegram Bot Status...`);
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json() as any;
    
    if (data.ok) {
      const info = data.result;
      console.log('✅ Connection to Telegram API: OK');
      console.log(`📡 Current Webhook URL: ${info.url || 'NONE (Polling mode)'}`);
      
      if (info.last_error_message) {
        console.error(`⚠️ Last Error: ${info.last_error_message}`);
        console.log(`⏰ Error Time: ${new Date(info.last_error_date * 1000).toLocaleString()}`);
      } else {
        console.log('✨ No recent errors reported by Telegram.');
      }
      
      if (info.pending_update_count > 0) {
        console.log(`⏳ Pending Messages: ${info.pending_update_count} (The bot is waiting to send these to your server!)`);
      }
      
      console.log('\n💡 Tip: If the URL above is empty or wrong, re-run your set-webhook script.');
    } else {
      console.error('❌ Failed to get status:', data.description);
      if (data.description.includes('unauthorized')) {
        console.log('🔑 Hint: Your TELEGRAM_BOT_TOKEN might be invalid.');
      }
    }
  } catch (err: any) {
    console.error('❌ Network error:', err.message);
  }
}

checkStatus();
