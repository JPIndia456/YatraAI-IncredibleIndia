const GROQ_MODELS_BY_PRIORITY = [
  "llama-3.3-70b-versatile",    // Best quality, 128K context — primary
  "llama-3.1-70b-versatile",    // Llama 3.1 70B, separate quota
  "llama-3.1-8b-instant",       // Fast & lightweight, high rate limit
  "gemma2-9b-it",               // Google Gemma via Groq, separate quota
  "llama-3.2-11b-vision-preview",// Llama 3.2, vision-capable fallback
];

export async function callGroq(prompt: string, model: string = "llama"): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing.");
  }

  // Legacy alias support
  const modelAliasMap: Record<string, string> = {
    "llama": "llama-3.3-70b-versatile",
    "mistral": "mixtral-8x7b-32768",
    "phi": "gemma2-9b-it",
  };

  // If an alias is given, resolve it — otherwise use the raw model name
  const primaryModel = modelAliasMap[model] || model;

  // Build the ordered list: try the requested model first, then all others as fallback
  const modelsToTry = [
    primaryModel,
    ...GROQ_MODELS_BY_PRIORITY.filter(m => m !== primaryModel),
  ];

  let lastError: Error | null = null;

  for (const selectedModel of modelsToTry) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content: "You are TourPlan, an elite Indian travel assistant. Provide accurate, culturally rich travel advice. Use 🇮🇳 emojis and maintain a premium concierge tone.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const msg = error.error?.message || "Groq API failure";
        // Rate limit hit — try next model instead of throwing
        if (response.status === 429 || msg.toLowerCase().includes("rate limit")) {
          console.warn(`⚡ Groq model [${selectedModel}] rate-limited, trying next...`);
          lastError = new Error(msg);
          continue;
        }
        throw new Error(msg);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        if (selectedModel !== primaryModel) {
          console.info(`✅ Groq fallback succeeded with model: ${selectedModel}`);
        }
        return text;
      }
    } catch (e: any) {
      if (e.message?.toLowerCase().includes("rate limit") || e.message?.includes("429")) {
        console.warn(`⚡ Groq model [${selectedModel}] rate-limited, trying next...`);
        lastError = e;
        continue;
      }
      throw e; // Non-rate-limit errors bubble up immediately
    }
  }

  throw lastError || new Error("All Groq models exhausted — daily token limits reached. Resets in ~24h.");
}
