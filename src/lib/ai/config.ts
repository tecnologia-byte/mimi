/**
 * Proveedor de IA de Mimi.
 * Si existe OPENROUTER_API_KEY se usa OpenRouter (modelos gratuitos);
 * si no, se usa la pasarela de Lovable.
 */
export function getAiConfig() {
  const openRouterKey = process.env["OPENROUTER_API_KEY"]?.trim();
  if (openRouterKey) {
    const model = process.env["OPENROUTER_MODEL"]?.trim() || "nvidia/nemotron-3-super-120b-a12b:free";
    return {
      provider: "openrouter" as const,
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
      model,
      titleModel: model,
      headers: {
        "HTTP-Referer": "https://mimi.lovable.app",
        "X-Title": "Mimi - Asistente IA de IVAD",
      } as Record<string, string>,
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
