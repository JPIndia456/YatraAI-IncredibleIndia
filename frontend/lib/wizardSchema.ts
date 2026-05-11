import { WizardField } from './store';
import { 
  parseBudget, parseDate, parseAdults, parseTripType, parseLanguage,
  getStartDateChips, getEndDateChips 
} from './wizardParsers';

export const getPlannerWizardSchema = (t: (key: string, def?: string) => string): WizardField[] => [
  {
    id: 'language', label: t('wizard_language_label', 'Support Language'), emoji: '🗣️',
    question: t('wizard_language_question', 'Namaste! I am your Travel Guide. 🇮🇳\n\nTo begin, would you like me to provide travel support in a specific language?'),
    chips: [
      { label: t('language_en', 'English'), value: 'en' },
      { label: t('language_hi', 'Hindi'), value: 'hi' },
      { label: t('language_ta', 'Tamil'), value: 'ta' },
      { label: t('language_mr', 'Marathi'), value: 'mr' },
    ],
    parse: (text) => parseLanguage(text),
    confirm: (v) => {
      const langMap: Record<string, string> = { hi: t('language_hi', 'Hindi'), ta: t('language_ta', 'Tamil'), mr: t('language_mr', 'Marathi'), en: t('language_en', 'English') };
      return t('wizard_language_confirm', `✅ I'll support you in **${langMap[v] || 'English'}**.`).replace('{{value}}', langMap[v] || 'English');
    },
  },
  {
    id: 'tripType', label: t('wizard_tripType_label', 'Trip Type'), emoji: '✈️',
    question: t('wizard_tripType_question', 'Excellent! Are we planning a **Round Trip** or a **Single Trip** (One-way)?'),
    chips: [
      { label: t('wizard_tripType_round', '🔄 Round Trip'), value: 'round' },
      { label: t('wizard_tripType_single', '➡️ One Way'), value: 'single' },
    ],
    parse: (text) => parseTripType(text),
    confirm: (v) => {
      const val = v === 'round' ? t('wizard_tripType_round', 'Round Trip') : t('wizard_tripType_single', 'Single Trip');
      return t('wizard_tripType_confirm', `✅ **${val}** selected.`).replace('{{value}}', val);
    },
  },
  {
    id: 'startDate', label: t('wizard_startDate_label', 'Departure Date'), emoji: '📅',
    question: t('wizard_startDate_question', 'When do you plan to leave?\n\nSay "next weekend", "May 15", or pick below:'),
    chips: getStartDateChips(),
    parse: (text) => parseDate(text),
    confirm: (v) => { 
      try { 
        const dateStr = new Date(String(v)).toLocaleDateString(t('locale', 'en-IN'), { weekday: 'short', day: 'numeric', month: 'long' });
        return t('wizard_startDate_confirm', `✅ Departure set to **${dateStr}**.`).replace('{{value}}', dateStr);
      } catch { 
        return t('wizard_startDate_confirm_fallback', `✅ Departure date saved.`); 
      } 
    },
  },
  {
    id: 'endDate', label: t('wizard_endDate_label', 'Return Date'), emoji: '🔙',
    question: t('wizard_endDate_question', 'When will you return?\n\nSay how many nights (e.g. "5 nights") or pick below:'),
    chips: (collected: Record<string, any>) => getEndDateChips(collected.startDate),
    parse: (text, collected) => {
      const m = text.match(/^(\d+)\s*(?:night|nights|n|days?)?$/i);
      if (m) { const base = collected.startDate ? new Date(String(collected.startDate)) : new Date(); base.setDate(base.getDate() + parseInt(m[1])); return base.toISOString().split('T')[0]; }
      return parseDate(text);
    },
    confirm: (v) => { 
      try { 
        const dateStr = new Date(String(v)).toLocaleDateString(t('locale', 'en-IN'), { weekday: 'short', day: 'numeric', month: 'long' });
        return t('wizard_endDate_confirm', `✅ Return date: **${dateStr}**.`).replace('{{value}}', dateStr);
      } catch { 
        return t('wizard_endDate_confirm_fallback', `✅ Return date saved.`); 
      } 
    },
  },
  {
    id: 'origin', label: t('wizard_origin_label', 'Departure City'), emoji: '🏙️',
    question: t('wizard_origin_question', 'Which city are you departing from?\n\nYour nearest major station or airport:'),
    chips: [
      { label: t('city_delhi', '🏛️ Delhi'), value: 'New Delhi' },
      { label: t('city_mumbai', '🌆 Mumbai'), value: 'Mumbai' },
      { label: t('city_bangalore', '💻 Bangalore'), value: 'Bangalore' },
      { label: t('city_chennai', '🎭 Chennai'), value: 'Chennai' },
      { label: t('city_hyderabad', '🌸 Hyderabad'), value: 'Hyderabad' },
      { label: t('city_kolkata', '📚 Kolkata'), value: 'Kolkata' },
    ],
    parse: (text) => text.trim(),
    confirm: (v) => t('wizard_origin_confirm', `✅ Departing from **${v}**. Got it!`).replace('{{value}}', v),
  },
  {
    id: 'specificDest', label: t('wizard_specificDest_label', 'Destination'), emoji: '🗺️',
    question: t('wizard_specificDest_question', 'Where would you like to travel in India?\n\nType a city name, or tap a popular pick below:'),
    chips: [
      { label: t('dest_manali', '🏔️ Manali'), value: 'Manali, Himachal Pradesh' },
      { label: t('dest_goa', '🏖️ Goa'), value: 'Goa' },
      { label: t('dest_jaipur', '🕌 Jaipur'), value: 'Jaipur, Rajasthan' },
      { label: t('dest_munnar', '🌿 Munnar'), value: 'Munnar, Kerala' },
      { label: t('dest_agra', '🏛️ Agra'), value: 'Agra, Uttar Pradesh' },
      { label: t('dest_varanasi', '🙏 Varanasi'), value: 'Varanasi, UP' },
      { label: t('dest_ladakh', '⛰️ Ladakh'), value: 'Leh, Ladakh' },
      { label: t('dest_andaman', '🌊 Andaman'), value: 'Port Blair, Andaman' },
    ],
    parse: (text) => text.trim(),
    confirm: (v) => t('wizard_specificDest_confirm', `✅ **${v}** — excellent pick!`).replace('{{value}}', v),
  },
  {
    id: 'targetBudget', label: t('wizard_targetBudget_label', 'Total Budget'), emoji: '💰',
    question: t('wizard_targetBudget_question', 'What is your total trip budget for ALL travelers?\n\nSay "30k", "1 lakh", or pick:'),
    chips: [
      { label: '₹15,000', value: '15000' }, { label: '₹30,000', value: '30000' },
      { label: '₹50,000', value: '50000' }, { label: '₹1,00,000', value: '100000' },
      { label: '₹2,00,000', value: '200000' }, { label: '₹5,00,000', value: '500000' },
    ],
    parse: (text) => parseBudget(text),
    confirm: (v) => {
      const val = Number(v).toLocaleString(t('locale', 'en-IN'));
      return t('wizard_targetBudget_confirm', `✅ Budget set to **₹${val}**.`).replace('{{value}}', val);
    },
  },
  {
    id: 'adults', label: t('wizard_adults_label', 'Adults'), emoji: '👥',
    question: t('wizard_adults_question', 'How many adults are travelling?\n\n(Children under 12 can be added on the form afterward)'),
    chips: [
      { label: t('wizard_adults_one', '1 — Just me'), value: '1' }, { label: t('wizard_adults_two', '2 — Couple'), value: '2' },
      { label: t('wizard_adults_three', '3 people'), value: '3' },     { label: t('wizard_adults_four', '4 — Family'), value: '4' },
      { label: t('wizard_adults_five', '5 people'), value: '5' },     { label: t('wizard_adults_six_plus', '6+'), value: '6' },
    ],
    parse: (text) => parseAdults(text),
    confirm: (v) => {
      const label = Number(v) > 1 ? t('wizard_adults_label_plural', 'adults') : t('wizard_adults_label_singular', 'adult');
      return t('wizard_adults_confirm', `✅ Party size: **${v} ${label}**. Perfect!`).replace('{{count}}', String(v)).replace('{{label}}', label);
    },
  },
  {
    id: 'kids', label: t('wizard_kids_label', 'Children'), emoji: '👶',
    question: t('wizard_kids_question', 'Any children under 12 travelling with you?'),
    chips: [
      { label: t('wizard_kids_zero', 'No children'), value: '0' }, { label: t('wizard_kids_one', '1 child'), value: '1' },
      { label: t('wizard_kids_two', '2 children'), value: '2' }, { label: t('wizard_kids_three_plus', '3+ children'), value: '3' },
    ],
    parse: (text) => {
       const n = parseInt(text.replace(/\D/g, ''));
       return isNaN(n) ? 0 : n;
    },
    confirm: (v) => t('wizard_kids_confirm', `✅ **${v}** children. Noted!`).replace('{{value}}', String(v)),
  },
  {
    id: 'dietary', label: t('wizard_dietary_label', 'Dietary'), emoji: '🍱',
    question: t('wizard_dietary_question', 'Any dietary preferences for the group?'),
    chips: [
      { label: t('wizard_dietary_veg', '🥦 Vegetarian'), value: 'veg' },
      { label: t('wizard_dietary_jain', '🥣 Jain'), value: 'jain' },
      { label: t('wizard_dietary_nonveg', '🍗 Non-Veg'), value: 'non-veg' },
      { label: t('wizard_dietary_vegan', '🥗 Vegan'), value: 'vegan' },
    ],
    parse: (text) => {
      const t = text.toLowerCase();
      if (t.includes('jain')) return 'jain';
      if (t.includes('non')) return 'non-veg';
      if (t.includes('vegan')) return 'vegan';
      return 'veg';
    },
    confirm: (v) => {
      const val = t(`wizard.dietary.${v}`, v);
      return t('wizard_dietary_confirm', `✅ Preference set to **${val}**.`).replace('{{value}}', val);
    },
  },
];
