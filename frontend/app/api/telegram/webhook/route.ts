import { NextResponse } from 'next/server';
import { TelegramService } from '@/lib/services/automation/telegram';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
  console.log('>> WEBHOOK REACHED <<');
  try {
    const payload = await req.json();
    console.log('>> PAYLOAD RECEIVED:', JSON.stringify(payload).slice(0, 100));
    
    // Process in background (don't wait for AI to respond to avoid Telegram timeout)
    // Telegram expects a 200 OK within a few seconds
    TelegramService.handleIncoming(payload).catch(err => {
      console.error('Telegram Webhook Background Error:', err);
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Telegram Webhook Error:', err);
    return NextResponse.json({ error: errorMessage(err, 'Internal Server Error') }, { status: 500 });
  }
}
