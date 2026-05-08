import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config({path: ".env.local"});
dotenv.config({path: ".env"});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const prompt = `Search Google Flights for one-way flights from Mumbai (BOM) to Goa (GOI) on May 3, 2026 for 1 adult(s).
List 5 to 8 real flights with current prices. Return ONLY raw JSON (no markdown):
{
  "flights": []
}`;
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.1 }
    });
    console.log(response.text);
  } catch (err) {
    console.error("ERROR", err);
  }
}
run();
