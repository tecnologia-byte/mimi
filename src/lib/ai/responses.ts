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
  const tools: ToolSet = { ...(config.tools ?? {}) };
  const system =
    (config.system ?? "") +
    (config.webSearch
      ? "\n\nBúsqueda web activada: si la pregunta requiere datos actuales de internet, usa tu conocimiento general y dilo con honestidad. Nunca inventes cifras ni fuentes."
      : "");
  const result = streamText({
    model: provider.chat(config.model),
    messages,
    ...(system ? { system } : {}),
    ...(Object.keys(tools).length ? { tools, stopWhen: stepCountIs(50) } : {}),
    abortSignal: request.signal,
  });
  return {
    result,
    response: () =>
      withLovableAiGatewayRunIdHeader(result.toUIMessageStreamResponse({ sendReasoning: true }), runIdFetch),
  };
}
