import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { transcribeIndianVoice, translateText } from '@/lib/bhashini';
import { runIntelligence } from '@/lib/services/ai/intelligence';
import { SysLogger } from '@/lib/services/sys/sysLogger';

/**
 * Telegram Automation Service
 * Centralizes Telegram Bot API interactions and AI Brain integration
 */
export const TelegramService = {
  /**
   * Main Handler for Incoming Messages (Webhooks)
   */
  async handleIncoming(payload: any) {
    const message = payload.message;
    if (!message) return;

    const from = message.chat.id.toString();
    const contact = message.contact;
    const text = message.text;
    const msgId = message.message_id?.toString() || Date.now().toString();

    console.log(`[TelegramService] Incoming: from=${from}, text="${text}", hasContact=${!!contact}`);

    // 0. Handle Contact Sharing (Linking)
    if (contact) {
      console.log(`[TelegramService] Linking contact for phone: ${contact.phone_number}`);
      const phone = contact.phone_number.replace(/\D/g, ''); // e.g. 919876543210
      const digits10 = phone.slice(-10); // e.g. 9876543210
      
      // Try to find the profile by matching the last 10 digits in either phone or telegram_id
      // This handles +91, 91, or just 10-digit formats.
      const { data: updated, error } = await supabaseAdmin
        .from('yatra_profiles')
        .update({ 
          telegram_id: from,
          telegram_enabled: true,
          updated_at: new Date().toISOString()
        })
        .or(`phone.ilike.%${digits10},telegram_id.ilike.%${digits10}`)
        .select();

      if (!error && updated && updated.length > 0) {
        console.log(`[TelegramService] Successfully linked profile for ${digits10}`);
        await this.sendMessage(from, "🙏 *Namaste!*\n\nYour account is now securely linked. I will send your PNRs and live itinerary updates directly to this chat.");
      } else {
        console.error(`[TelegramService] Profile Link Error or No Match:`, error || 'No matching profile found for ' + digits10);
        await this.sendMessage(from, "❌ *Linkage Failed*\n\nI couldn't find a profile with the phone number you shared. Please ensure your mobile number is correctly set in the Yatra app profile first.");
      }
      return;
    }

    // 1. Handle Start Command (including deep links like /start link)
    if (text?.startsWith('/start')) {
      console.log(`[TelegramService] Sending contact request to: ${from}`);
      await this.sendContactRequest(from);
      return;
    }

    const voice = message.voice || message.audio;

    // 0. Idempotency Check
    const isNew = await SysLogger.claim('TELEGRAM', msgId);
    if (!isNew) {
      SysLogger.info('TELEGRAM', `Skipping duplicate message: ${msgId}`);
      return;
    }

    try {
      // 1. Fetch Profile by Telegram ID or Phone
      let { data: profile } = await supabaseAdmin
        .from('yatra_profiles')
        .select('*')
        .eq('telegram_id', from)
        .maybeSingle();

      // Fallback: Check if they are registered with phone (some users might start with phone)
      if (!profile) {
        // This is a bit tricky since we don't know their phone from TG unless they share contact
        // For now, we'll assume they need to link it or we just create a session-based identity
      }

      const userLanguage = profile?.language_code || 'hin';
      const userId = profile?.user_id || `tg-${from}`;
      const userName = profile?.full_name || message.from?.first_name || 'Traveler';

      // 2. Extract Text (via Transcript if Voice)
      let userText = text || '';
      if (voice) {
        const fileId = voice.file_id;
        if (fileId) {
          const audioBase64 = await this.downloadMedia(fileId);
          if (audioBase64) {
            const transcriptObj = await transcribeIndianVoice(audioBase64, userLanguage);
            userText = transcriptObj?.text || '';
          }
        }
      }

      if (!userText) return;

      // 3. AI Brain Processing (Translate -> Process -> Translate Back)
      const intentInEnglish = await translateText(userText, userLanguage, 'en');
      const brainResponseInEnglish = await runIntelligence(intentInEnglish, {
        userId: userId,
        uiLanguage: userLanguage,
        userName: userName,
        destination: profile?.destination, // Optional: if we store last known dest in profile
      });
      const finalResponse = await translateText(brainResponseInEnglish, 'en', userLanguage);

      // 4. Log and Send
      // We might want a yatra_telegram_log table, but for now we can use sys_logs or a general automation log
      await this.sendMessage(from, finalResponse);
      SysLogger.info('TELEGRAM', `Response sent to ${from}`);

    } catch (err: any) {
      await SysLogger.error('TELEGRAM', `Failed handling message from ${from}`, { error: err.message, stack: err.stack });
    }
  },

  /**
   * Download Media from Telegram
   */
  async downloadMedia(fileId: string): Promise<string> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return "";
    try {
      // Get File path
      const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      if (!fileData.result?.file_path) return "";

      // Download file
      const downloadRes = await fetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`);
      const buffer = await downloadRes.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    } catch (err) {
      console.error("Telegram Media Error:", err);
      return "";
    }
  },

  /**
   * Send Message via Telegram Bot API with Discovery Tag formatting
   */
  async sendMessage(to: string, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("[TelegramService] ERROR: TELEGRAM_BOT_TOKEN missing in environment");
      return;
    }

    // 1. Format Discovery Tags into User-Friendly Text
    let formattedText = text;
    const discoveryMatches = [...text.matchAll(/\[DISCOVERY:\s*(.*?)\]/g)];
    
    if (discoveryMatches.length > 0) {
      discoveryMatches.forEach(m => {
        const params: Record<string, string> = {};
        m[1].split(/\s+/).forEach(pair => {
          const [k, v] = pair.split('=');
          if (k && v) params[k] = v.replace(/_/g, ' ');
        });

        const icon = params.type === 'stay' ? '🏨' : params.type === 'air' ? '✈️' : params.type === 'rail' ? '🚆' : '📍';
        const stars = params.stars ? ` (${params.stars} ⭐)` : '';
        const price = params.price ? `\n💰 *Total:* ${params.price}` : '';
        const features = params.features ? `\n✨ _${params.features}_` : '';
        const link = params.link ? `\n🔗 [Explore Option](${params.link})` : '';

        const card = `\n\n${icon} *${params.name}*${stars}${price}${features}${link}`;
        formattedText = formattedText.replace(m[0], card);
      });
    }

    console.log(`[TelegramService] sendMessage to ${to}: ${formattedText.slice(0, 30)}...`);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: to, 
          text: formattedText,
          parse_mode: 'Markdown'
        })
      });
      if (!res.ok) {
        const errBody = await res.json();
        console.error(`[TelegramService] sendMessage FAILED:`, res.status, errBody);
      } else {
        console.log(`[TelegramService] sendMessage SUCCESS`);
      }
    } catch (err) {
      console.error("Telegram Send Error:", err);
    }
  },

  /**
   * Request Contact Sharing via Keyboard
   */
  async sendContactRequest(to: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("[TelegramService] ERROR: TELEGRAM_BOT_TOKEN missing in environment");
      return;
    }
    console.log(`[TelegramService] Requesting contact from ${to}`);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: to, 
          text: "🙏 *Namaste!*\n\nWelcome to Yatra AI Concierge. Please tap the button below to share your contact so I can securely link your account and send your live PNRs and itinerary updates.",
          parse_mode: 'Markdown',
          reply_markup: {
            keyboard: [[{ text: "📲 Share Contact", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        })
      });
      if (!res.ok) {
        const errBody = await res.json();
        console.error(`[TelegramService] sendContactRequest FAILED:`, res.status, errBody);
      } else {
        console.log(`[TelegramService] sendContactRequest SUCCESS`);
      }
    } catch (err) {
      console.error("Telegram Contact Request Error:", err);
    }
  }
};
