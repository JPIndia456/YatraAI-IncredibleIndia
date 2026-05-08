import { WizardField } from './store';
import { 
  parseBudget, parseDate, parseAdults, parseTripType, parseLanguage,
  getStartDateChips, getEndDateChips 
} from './wizardParsers';

export const getPlannerWizardSchema = (): WizardField[] => [
  {
    id: 'language', label: 'Support Language', emoji: '🗣️',
    question: 'Namaste! I am your AI travel architect. 🇮🇳\n\nTo begin, would you like me to provide travel support in a specific language?',
    chips: [
      { label: 'English', value: 'en' },
      { label: 'Hindi', value: 'hi' },
      { label: 'Tamil', value: 'ta' },
      { label: 'Marathi', value: 'mr' },
    ],
    parse: (text) => parseLanguage(text),
    confirm: (v) => `✅ I'll support you in **${v === 'hi' ? 'Hindi' : v === 'ta' ? 'Tamil' : 'English'}**.`,
  },
  {
    id: 'tripType', label: 'Trip Type', emoji: '✈️',
    question: 'Excellent! Are we planning a **Round Trip** or a **Single Trip** (One-way)?',
    chips: [
      { label: '🔄 Round Trip', value: 'round' },
      { label: '➡️ One Way', value: 'single' },
    ],
    parse: (text) => parseTripType(text),
    confirm: (v) => `✅ **${v === 'round' ? 'Round Trip' : 'Single Trip'}** selected.`,
  },
  {
    id: 'startDate', label: 'Departure Date', emoji: '📅',
    question: 'When do you plan to leave?\n\nSay "next weekend", "May 15", or pick below:',
    chips: getStartDateChips(),
    parse: (text) => parseDate(text),
    confirm: (v) => { try { return `✅ Departure set to **${new Date(String(v)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}**.`; } catch { return `✅ Departure date saved.`; } },
  },
  {
    id: 'endDate', label: 'Return Date', emoji: '🔙',
    question: 'When will you return?\n\nSay how many nights (e.g. "5 nights") or pick below:',
    chips: (collected: Record<string, any>) => getEndDateChips(collected.startDate),
    parse: (text, collected) => {
      const m = text.match(/^(\d+)\s*(?:night|nights|n|days?)?$/i);
      if (m) { const base = collected.startDate ? new Date(String(collected.startDate)) : new Date(); base.setDate(base.getDate() + parseInt(m[1])); return base.toISOString().split('T')[0]; }
      return parseDate(text);
    },
    confirm: (v) => { try { return `✅ Return date: **${new Date(String(v)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}**.`; } catch { return `✅ Return date saved.`; } },
  },
  {
    id: 'origin', label: 'Departure City', emoji: '🏙️',
    question: 'Which city are you departing from?\n\nYour nearest major station or airport:',
    chips: [
      { label: '🏛️ Delhi', value: 'New Delhi' },
      { label: '🌆 Mumbai', value: 'Mumbai' },
      { label: '💻 Bangalore', value: 'Bangalore' },
      { label: '🎭 Chennai', value: 'Chennai' },
      { label: '🌸 Hyderabad', value: 'Hyderabad' },
      { label: '📚 Kolkata', value: 'Kolkata' },
    ],
    parse: (text) => text.trim(),
    confirm: (v) => `✅ Departing from **${v}**. Got it!`,
  },
  {
    id: 'specificDest', label: 'Destination', emoji: '🗺️',
    question: 'Where would you like to travel in India?\n\nType a city name, or tap a popular pick below:',
    chips: [
      { label: '🏔️ Manali', value: 'Manali, Himachal Pradesh' },
      { label: '🏖️ Goa', value: 'Goa' },
      { label: '🕌 Jaipur', value: 'Jaipur, Rajasthan' },
      { label: '🌿 Munnar', value: 'Munnar, Kerala' },
      { label: '🏛️ Agra', value: 'Agra, Uttar Pradesh' },
      { label: '🙏 Varanasi', value: 'Varanasi, UP' },
      { label: '⛰️ Ladakh', value: 'Leh, Ladakh' },
      { label: '🌊 Andaman', value: 'Port Blair, Andaman' },
    ],
    parse: (text) => text.trim(),
    confirm: (v) => `✅ **${v}** — excellent pick!`,
  },
  {
    id: 'targetBudget', label: 'Total Budget', emoji: '💰',
    question: 'What is your total trip budget for ALL travelers?\n\nSay "30k", "1 lakh", or pick:',
    chips: [
      { label: '₹15,000', value: '15000' }, { label: '₹30,000', value: '30000' },
      { label: '₹50,000', value: '50000' }, { label: '₹1,00,000', value: '100000' },
      { label: '₹2,00,000', value: '200000' }, { label: '₹5,00,000', value: '500000' },
    ],
    parse: (text) => parseBudget(text),
    confirm: (v) => `✅ Budget set to **₹${Number(v).toLocaleString('en-IN')}**.`,
  },
  {
    id: 'adults', label: 'Adults', emoji: '👥',
    question: 'How many adults are travelling?\n\n(Children under 12 can be added on the form afterward)',
    chips: [
      { label: '1 — Just me', value: '1' }, { label: '2 — Couple', value: '2' },
      { label: '3 people', value: '3' },     { label: '4 — Family', value: '4' },
      { label: '5 people', value: '5' },     { label: '6+', value: '6' },
    ],
    parse: (text) => parseAdults(text),
    confirm: (v) => `✅ Party size: **${v} adult${Number(v) > 1 ? 's' : ''}**. Perfect!`,
  },
  {
    id: 'kids', label: 'Children', emoji: '👶',
    question: 'Any children under 12 travelling with you?',
    chips: [
      { label: 'No children', value: '0' }, { label: '1 child', value: '1' },
      { label: '2 children', value: '2' }, { label: '3+ children', value: '3' },
    ],
    parse: (text) => {
       const n = parseInt(text.replace(/\D/g, ''));
       return isNaN(n) ? 0 : n;
    },
    confirm: (v) => `✅ **${v}** children. Noted!`,
  },
  {
    id: 'dietary', label: 'Dietary', emoji: '🍱',
    question: 'Any dietary preferences for the group?',
    chips: [
      { label: '🥦 Vegetarian', value: 'veg' },
      { label: '🥣 Jain', value: 'jain' },
      { label: '🍗 Non-Veg', value: 'non-veg' },
      { label: '🥗 Vegan', value: 'vegan' },
    ],
    parse: (text) => {
      const t = text.toLowerCase();
      if (t.includes('jain')) return 'jain';
      if (t.includes('non')) return 'non-veg';
      if (t.includes('vegan')) return 'vegan';
      return 'veg';
    },
    confirm: (v) => `✅ Preference set to **${v}**.`,
  },
];
