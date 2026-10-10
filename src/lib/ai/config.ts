/**
 * Proveedor de IA de Mimi.
 * Prioridad de resolución:
 * 1. OpenRouter (OPENROUTER_API_KEY)
 * 2. Google Gemini (GEMINI_API_KEY)
 * 3. OpenAI (OPENAI_API_KEY)
 * 4. Groq (GROQ_API_KEY)
 * 5. Pasarela de Lovable (LOVABLE_API_KEY)
 */
export type AiConfig = {
  provider: "openrouter" | "gemini" | "openai" | "groq" | "lovable";
  baseURL: string;
  apiKey: string;
  model: string;
  titleModel: string;
  headers: Record<string, string>;
};

export function getAiConfigs(): AiConfig[] {
  const configs: AiConfig[] = [];

  const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
  if (geminiKey) {
    configs.push({
      provider: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: geminiKey,
      model: process.env["GEMINI_MODEL"]?.trim() || "gemini-2.0-flash",
      titleModel: "gemini-2.0-flash",
      headers: {},
    });
  }

  const groqKey = process.env["GROQ_API_KEY"]?.trim();
  if (groqKey) {
    configs.push({
      provider: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      model: process.env["GROQ_MODEL"]?.trim() || "llama-3.3-70b-versatile",
      titleModel: "llama-3.1-8b-instant",
      headers: {},
    });
  }

  const openAiKey = process.env["OPENAI_API_KEY"]?.trim();
  if (openAiKey) {
    configs.push({
      provider: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: openAiKey,
      model: process.env["OPENAI_MODEL"]?.trim() || "gpt-4o-mini",
      titleModel: "gpt-4o-mini",
      headers: {},
    });
  }

  const openRouterKey = process.env["OPENROUTER_API_KEY"]?.trim();
  if (openRouterKey) {
    const model = process.env["OPENROUTER_MODEL"]?.trim() || "nvidia/nemotron-3-super-120b-a12b:free";
    configs.push({
      provider: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
      model,
      titleModel: model,
      headers: {
        "HTTP-Referer": "https://mimi.lovable.app",
        "X-Title": "Mimi - Asistente IA de IVAD",
      },
    });
  }

  const lovableKey = process.env["LOVABLE_API_KEY"]?.trim();
  if (lovableKey) {
    configs.push({
      provider: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: lovableKey,
      model: "google/gemini-3-flash-preview",
      titleModel: "google/gemini-3-flash-preview",
      headers: {
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
  }

  return configs;
}

export function getAiConfig(): AiConfig {
  const configs = getAiConfigs();
  if (configs.length > 0) return configs[0]!;
  
  // Fallback default
  return {
    provider: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: "",
    model: "google/gemini-3-flash-preview",
    titleModel: "google/gemini-3-flash-preview",
    headers: {},
  };
}
