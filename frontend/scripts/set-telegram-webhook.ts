import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;

// Load .env.local
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.argv[2];

if (!token) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is missing in .env.local');
  process.exit(1);
}

if (!webhookUrl) {
  console.error('❌ Error: Please provide the public webhook URL as an argument.');
  console.log('Usage: npx ts-node scripts/set-telegram-webhook.ts https://xxxx.ngrok-free.app');
  process.exit(1);
}

const finalUrl = `${webhookUrl.replace(/\/$/, '')}/api/telegram/webhook`;

async function setWebhook() {
  console.log(`🚀 Setting Telegram Webhook to: ${finalUrl}...`);
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: finalUrl })
    });
    
    const data = await res.json() as any;
    
    if (data.ok) {
      console.log('✅ Success! Telegram Webhook has been set.');
      console.log(`📡 Bot: ${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME}`);
      console.log('✨ You can now start testing by sending /start to your bot.');
    } else {
      console.error('❌ Failed to set webhook:', data.description);
    }
  } catch (err: any) {
    console.error('❌ Network error:', err.message);
  }
}

setWebhook();
