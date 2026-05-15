// Free models on OpenRouter (no credits needed, just rate limits)
const OPENROUTER_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-3-12b-it:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "google/gemma-3-4b-it:free",
];

// Paid models (requires OpenRouter credits)
const OPENROUTER_PAID_MODEL = "anthropic/claude-opus-4.7";

export async function callAnthropic(prompt: string, model?: string): Promise<string> {
  const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing.");
  }

  const isOpenRouter = apiKey.startsWith("sk-or-v1");

  if (isOpenRouter) {
    // Try free models first (no credits needed), then paid model
    const modelsToTry = model
      ? [model, ...OPENROUTER_FREE_MODELS]
      : [...OPENROUTER_FREE_MODELS, OPENROUTER_PAID_MODEL];

    let lastError: Error | null = null;

    for (const selectedModel of modelsToTry) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://yatra.ai",
            "X-Title": "Yatra",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: "system",
                content: "You are Yatra, a professional Indian Travel Guide. You are strictly budget-aware: ONLY suggest or announce travel options that fall within the user's specific budget. Avoid words like 'Premium' or 'Elite' unless requested; focus on 'budget-perfect' and 'high-value' options. If all options exceed the budget, advise the user to adjust their budget or origin/destination rather than announcing 'Found options'. Respond with precision and 🇮🇳 emojis.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 2048,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          const msg = error.error?.message || `HTTP ${response.status}`;
          // Rate limit, credits, or provider error — try next model
          if (response.status === 429 || response.status === 402 || 
              msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("provider returned error") ||
              msg.toLowerCase().includes("unavailable") || msg.toLowerCase().includes("overloaded")) {
            console.warn(`⚡ OpenRouter model [${selectedModel}] unavailable: ${msg}`);
            lastError = new Error(msg);
            continue;
          }
          throw new Error(msg);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          if (selectedModel !== modelsToTry[0]) {
            console.info(`✅ OpenRouter fallback succeeded with: ${selectedModel}`);
          }
          return text;
        }
      } catch (e: any) {
        if (e.message?.includes("rate") || e.message?.includes("credits") || 
            e.message?.includes("402") || e.message?.includes("429") ||
            e.message?.toLowerCase().includes("provider returned error") ||
            e.message?.toLowerCase().includes("overloaded")) {
          lastError = e;
          continue;
        }
        throw e;
      }
    }

    throw lastError || new Error("All OpenRouter models rate-limited. Try again in a few minutes.");
  }

    const preferredModel = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model?.replace("anthropic/", "") || preferredModel,
        max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Anthropic API failure");
  }

  const data = await response.json();
  return data.content[0].text;
}
