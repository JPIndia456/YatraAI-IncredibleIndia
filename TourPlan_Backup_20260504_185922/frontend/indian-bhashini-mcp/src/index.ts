import { transcribeIndianVoice, translateText, speakIndianText } from "../../lib/bhashini";

/**
 * Bhashini MCP Tool Definitions
 * Exposes Indian Language STT, TTS, and Translation to Gemini
 */

export const bhashiniTools = [
  {
    name: "transcribeVoice",
    description: "Transcribe voice from an Indian language audio (base64) specifically for a known language.",
    parameters: {
      type: "OBJECT",
      properties: {
        audioBase64: { type: "STRING", description: "Base64 encoded wav audio content." },
        sourceLang: { type: "STRING", description: "The source language code (e.g., 'hi', 'ta')." }
      },
      required: ["audioBase64"]
    }
  },
  {
    name: "detectAndTranscribe",
    description: "Detect the language of an Indian voice audio (base64) and return transcribed text.",
    parameters: {
      type: "OBJECT",
      properties: {
        audioBase64: { type: "STRING", description: "Base64 encoded wav audio content." }
      },
      required: ["audioBase64"]
    }
  },
  {
    name: "translateIndianText",
    description: "Translate text between any of the 22 Indian languages and English.",
    parameters: {
      type: "OBJECT",
      properties: {
        text: { type: "STRING", description: "The text to translate." },
        from: { type: "STRING", description: "Source language code." },
        to: { type: "STRING", description: "Target language code." }
      },
      required: ["text", "from", "to"]
    }
  },
  {
    name: "speakText",
    description: "Convert Indian text to audible voice (TTS).",
    parameters: {
      type: "OBJECT",
      properties: {
        text: { type: "STRING", description: "The text to speak." },
        lang: { type: "STRING", description: "Language code." }
      },
      required: ["text", "lang"]
    }
  }
];

/**
 * Execute Bhashini MCP tool
 */
export async function executeBhashiniTool(name: string, args: any) {
  switch (name) {
    case "transcribeVoice":
      return await transcribeIndianVoice(args.audioBase64, args.sourceLang);
    case "detectAndTranscribe":
      return await transcribeIndianVoice(args.audioBase64);
    case "translateIndianText":
      return await translateText(args.text, args.from, args.to);
    case "speakText":
      return await speakIndianText(args.text, args.lang);
    default:
      throw new Error(`Tool ${name} not found in Bhashini MCP server`);
  }
}
