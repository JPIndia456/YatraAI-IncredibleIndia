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
      const phone = contact.phone_number.replace(/\D/g, '');
      const digitsOnly = phone.length > 10 ? phone.slice(-10) : phone; 
      
      const { error } = await supabaseAdmin
        .from('yatra_profiles')
        .update({ 
          telegram_id: from,
          telegram_enabled: true,
          updated_at: new Date().toISOString()
        })
        .or(`phone.like.%${digitsOnly},telegram_id.eq.${phone}`);

      if (!error) {
        await this.sendMessage(from, "🙏 *Namaste!*\n\nYour account is now securely linked. I will send your PNRs and live itinerary updates directly to this chat.");
      } else {
        console.error(`[TelegramService] Profile Link Error:`, error);
      }
      return;
    }

    // 1. Handle Start Command
    if (text === '/start') {
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
   * Send Message via Telegram Bot API
   */
  async sendMessage(to: string, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("[TelegramService] ERROR: TELEGRAM_BOT_TOKEN missing in environment");
      return;
    }
    console.log(`[TelegramService] sendMessage to ${to}: ${text.slice(0, 30)}...`);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: to, 
          text: text,
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
