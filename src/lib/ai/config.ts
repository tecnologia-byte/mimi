/**
 * Proveedor de IA de Mimi.
 * Prioridad de resolución:
 * 1. OpenRouter (OPENROUTER_API_KEY)
 * 2. Google Gemini (GEMINI_API_KEY)
 * 3. OpenAI (OPENAI_API_KEY)
 * 4. Groq (GROQ_API_KEY)
 * 5. Pasarela de Lovable (LOVABLE_API_KEY)
 */
export function getAiConfig() {
  const openRouterKey = process.env["OPENROUTER_API_KEY"]?.trim();
  if (openRouterKey) {
    const model = process.env["OPENROUTER_MODEL"]?.trim() || "anthropic/claude-sonnet-5.5";
    return {
      provider: "openrouter" as const,
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
      model,
      titleModel: "google/gemini-2.5-flash",
      headers: {
        "HTTP-Referer": "https://mimi.ivadsrl.com",
        "X-Title": "Mimi - Asistente IA de IVAD",
      } as Record<string, string>,
    };
  }

  const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
  if (geminiKey) {
    const model = process.env["GEMINI_MODEL"]?.trim() || "gemini-2.0-flash";
    return {
      provider: "gemini" as const,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: geminiKey,
      model,
      titleModel: "gemini-2.0-flash",
      headers: {} as Record<string, string>,
    };
  }

  const openAiKey = process.env["OPENAI_API_KEY"]?.trim();
  if (openAiKey) {
    const model = process.env["OPENAI_MODEL"]?.trim() || "gpt-4o";
    return {
      provider: "openai" as const,
      baseURL: "https://api.openai.com/v1",
      apiKey: openAiKey,
      model,
      titleModel: "gpt-4o-mini",
      headers: {} as Record<string, string>,
    };
  }

  const groqKey = process.env["GROQ_API_KEY"]?.trim();
  if (groqKey) {
    const model = process.env["GROQ_MODEL"]?.trim() || "llama-3.3-70b-versatile";
    return {
      provider: "groq" as const,
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      model,
      titleModel: "llama-3.1-8b-instant",
      headers: {} as Record<string, string>,
    };
  }

  const lovableKey = process.env["LOVABLE_API_KEY"] ?? "";
  return {
    provider: "lovable" as const,
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: lovableKey,
    model: "google/gemini-3-flash-preview",
    titleModel: "google/gemini-3-flash-preview",
    headers: {
      "Lovable-API-Key": lovableKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    } as Record<string, string>,
  };
}
