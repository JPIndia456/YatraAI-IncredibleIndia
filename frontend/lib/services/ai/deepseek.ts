/**
 * DEEPSEEK SERVICE
 * High-value, high-performance fallback for YatraAI.
 * Can be used via DeepSeek direct API or OpenRouter.
 */

export async function callDeepSeek(prompt: string, model: string = "deepseek-chat"): Promise<string> {
  // Try DeepSeek Direct first, then fallback to OpenRouter
  const apiKey = (process.env.DEEPSEEK_API_KEY || "").trim();
  const orKey = (process.env.OPENROUTER_API_KEY || "").trim();

  const activeKey = apiKey || orKey;
  const endpoint = apiKey 
    ? "https://api.deepseek.com/chat/completions" 
    : "https://openrouter.ai/api/v1/chat/completions";

  if (!activeKey || activeKey.includes("PASTE_YOUR")) {
    throw new Error("DeepSeek or OpenRouter API key is missing.");
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${activeKey}`,
        "Content-Type": "application/json",
        ...(orKey ? { "HTTP-Referer": "https://yatra.ai", "X-Title": "Yatra" } : {}),
      },
      body: JSON.stringify({
        model: apiKey ? "deepseek-chat" : "deepseek/deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are Yatra, a professional Indian Travel Guide. You are an expert in Indian logistics (Rail, Air, Road) and cultural history. Be concise, budget-focused, and use 🇮🇳 emojis."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "DeepSeek API failure");
    }

    const data = await response.json();
    return data.choices[0].message.content || "";
  } catch (error: any) {
    console.error("DeepSeek Error:", error.message);
    throw error;
  }
}
