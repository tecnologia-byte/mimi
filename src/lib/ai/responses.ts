import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, type ModelMessage, type ToolSet } from "ai";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.ts";

export function createResponsesCall(
  request: Request,
  config: { baseURL: string; apiKey: string; model: string; system?: string; webSearch?: boolean; tools?: ToolSet },
  messages: ModelMessage[],
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: `${config.baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`,
    apiKey: config.apiKey,
    headers: { "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const reasoning = config.model !== "openai/chat-latest";
  const tools: ToolSet = {
    ...(config.tools ?? {}),
    ...(config.webSearch ? { web_search: provider.tools.webSearch({}) } : {}),
  };
  const system =
    (config.system ?? "") +
    (config.webSearch
      ? "\n\nBúsqueda web activada: busca en internet solo con términos generales de la pregunta. Nunca incluyas en las búsquedas datos internos, nombres de clientes, cifras ni contenido de documentos de IVAD. Cita las fuentes con enlaces."
      : "");
  const result = streamText({
    model: provider.responses(config.model),
    messages,
    ...(system ? { system } : {}),
    ...(Object.keys(tools).length ? { tools, stopWhen: stepCountIs(50) } : {}),

    abortSignal: request.signal,
    providerOptions: {
      openai: {
        store: false,
        ...(reasoning
          ? {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              include: ["reasoning.encrypted_content"],
            }
          : {}),
      },
    },
  });
  return {
    result,
    response: () =>
      withLovableAiGatewayRunIdHeader(result.toUIMessageStreamResponse({ sendReasoning: true }), runIdFetch),
  };
}
