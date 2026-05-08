import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type ItineraryDay = { title?: string; activities?: string[] };

function normalizeTelegramHandle(s: string): string {
  return String(s || '')
    .trim()
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
}

function digitsOnly(s: string): string {
  return String(s || '').replace(/\D/g, '');
}

/** Allow send when `to` matches saved profile telegram_id or phone (handles @user vs user, spacing, last-10 digits). */
function isAllowedTelegramRecipient(
  to: string,
  profileTg: string | null | undefined,
  profilePhone: string | null | undefined
): boolean {
  const rawTo = String(to || '').trim();
  const hTo = normalizeTelegramHandle(rawTo);
  const dTo = digitsOnly(rawTo);

  const candidates = [profileTg, profilePhone].filter(Boolean) as string[];
  for (const c of candidates) {
    const h = normalizeTelegramHandle(c);
    const d = digitsOnly(c);
    if (hTo && h && hTo === h) return true;
    if (dTo.length >= 10 && d.length >= 10 && dTo.slice(-10) === d.slice(-10)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────
// Core send function — Telegram Bot API
// ─────────────────────────────────────────────────────────
async function sendTelegramMessage(chatId: string, text: string) {
  if (!TELEGRAM_TOKEN) {
    throw new Error("Telegram API is not configured. Please check your environment variables.");
  }

  const resp = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    }
  );
  return resp.json();
}

// ─────────────────────────────────────────────────────────
// POST /api/telegram/send
// Accepts: { type, to, payload }
// Types: 'welcome' | 'booking_confirm' | 'itinerary' | 'price_alert' | 'custom'
// ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { type, to, payload } = await req.json();
    if (!to) return NextResponse.json({ error: 'target (chat_id) required' }, { status: 400 });

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('tourplan_profiles')
      .select('telegram_id, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!isAllowedTelegramRecipient(String(to), profile?.telegram_id, profile?.phone)) {
      return NextResponse.json(
        {
          error:
            'Forbidden target — save this Telegram username or phone in your TourPlan profile first (Booking → Connect Telegram).',
        },
        { status: 403 }
      );
    }

    let message = '';

    switch (type) {
      case 'welcome':
        message =
          `🙏 *Welcome to TourPlan!*\n\n` +
          `Namaste ${payload?.name || 'Traveler'}! Your Telegram is now connected.\n\n` +
          `From now on you'll receive:\n` +
          `• ✅ Booking confirmations\n` +
          `• 🗓️ Itinerary updates\n` +
          `• 💰 Price alerts\n` +
          `• 🤖 AI travel tips\n\n` +
          `_Travel safely with TourPlan._`;
        break;

      case 'booking_confirm':
        message =
          `🎉 *Booking Confirmed — TourPlan*\n\n` +
          `📋 *PNR:* ${payload?.ref || 'TP-XXXXXX'}\n` +
          `🗺️ *Route:* ${payload?.origin} → ${payload?.destination}\n` +
          `🚆 *Transport:* ${payload?.transport}\n` +
          `🏨 *Hotel:* ${payload?.hotel}\n` +
          `👥 *Tier:* ${payload?.tier}\n` +
          `💳 *Amount Paid:* ₹${Number(payload?.total || 0).toLocaleString('en-IN')}\n\n` +
          `Your full itinerary is ready in the app 📱\n` +
          `_Travel safely. TourPlan is with you._`;
        break;

      case 'itinerary':
        message =
          `🗓️ *Your AI Itinerary — Day-by-Day*\n\n` +
          `*${payload?.origin} → ${payload?.destination}*\n\n` +
          ((payload?.days as ItineraryDay[] | undefined) || [])
            .slice(0, 5)
            .map((d, i: number) => `*Day ${i + 1}:* ${d.title || 'Plan'}\n_${d.activities?.[0] || ''}_`)
            .join('\n\n') +
          (payload?.days?.length > 5 ? `\n\n...and ${payload.days.length - 5} more days in the app.` : '') +
          `\n\n_Open TourPlan for the full plan._`;
        break;

      case 'price_alert':
        const diff = payload?.newPrice - payload?.oldPrice;
        const up = diff > 0;
        message =
          `${up ? '📈' : '📉'} *Price ${up ? 'Increased' : 'Dropped'} — TourPlan Alert*\n\n` +
          `*${payload?.origin} → ${payload?.destination}*\n` +
          `Old Price: ₹${Number(payload?.oldPrice || 0).toLocaleString('en-IN')}\n` +
          `New Price: ₹${Number(payload?.newPrice || 0).toLocaleString('en-IN')}\n` +
          `Change: ${up ? '+' : ''}₹${Math.abs(diff).toLocaleString('en-IN')} (${payload?.percent}%)\n\n` +
          `_Open TourPlan to review and confirm._`;
        break;

      case 'custom':
        message = payload?.text || '';
        break;

      default:
        return NextResponse.json({ error: 'Unknown message type' }, { status: 400 });
    }

    if (!message) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

    const result = await sendTelegramMessage(to, message);

    return NextResponse.json({
      success: true,
      to,
      type,
      result
    });

  } catch (err: unknown) {
    console.error('Telegram send error:', err);
    return NextResponse.json({ error: errorMessage(err, 'Telegram send failed') }, { status: 500 });
  }
}
