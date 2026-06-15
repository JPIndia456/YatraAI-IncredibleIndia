import { NextResponse } from 'next/server';
import { TelegramService } from '@/lib/services/automation/telegram';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Verifies the request actually came from Telegram.
 *
 * Telegram echoes the secret configured via setWebhook(secret_token=...)
 * in the `X-Telegram-Bot-Api-Secret-Token` header. Without this check any
 * caller could spoof "contact shared" events and hijack a user's linked
 * Telegram channel. When the secret is configured we fail closed; when it is
 * not yet configured we allow (to avoid breaking an existing deployment) but
 * log a loud warning so it can be locked down.
 */
function isVerifiedTelegramRequest(req: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn(
      '[telegram/webhook] TELEGRAM_WEBHOOK_SECRET is not set — webhook is UNAUTHENTICATED. ' +
        'Set it and re-register the webhook with secret_token to prevent spoofed updates.'
    );
    return true;
  }
  const provided = req.headers.get('x-telegram-bot-api-secret-token');
  return provided === secret;
}

export async function POST(req: Request) {
  try {
    if (!isVerifiedTelegramRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();

    // Process in background (don't wait for AI to respond to avoid Telegram timeout).
    // Telegram expects a 200 OK within a few seconds.
    TelegramService.handleIncoming(payload).catch(err => {
      console.error('Telegram Webhook Background Error:', err);
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Telegram Webhook Error:', err);
    return NextResponse.json({ error: errorMessage(err, 'Internal Server Error') }, { status: 500 });
  }
}
