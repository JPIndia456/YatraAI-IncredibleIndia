/**
 * OPENAI SERVICE (ChatGPT)
 * Primary fallback for high-reasoning tasks in YatraAI.
 */

export async function callOpenAI(prompt: string, model: string = "gpt-4o"): Promise<string> {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();

  if (!apiKey || apiKey.includes("PASTE_YOUR")) {
    throw new Error("OPENAI_API_KEY is missing or not configured.");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are Yatra, a professional Indian Travel Guide. You are warm, sharp, and strictly budget-aware. ONLY suggest options within the specified budget. Respond with precision and 🇮🇳 emojis."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API failure");
    }

    const data = await response.json();
    return data.choices[0].message.content || "";
  } catch (error: any) {
    console.error("OpenAI Error:", error.message);
    throw error;
  }
}
