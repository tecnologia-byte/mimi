import { createOpenAI } from "@ai-sdk/openai";
import { experimental_fallback, stepCountIs, streamText, type ModelMessage, type ToolSet } from "ai";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.ts";
import { type AiConfig } from "./config.ts";

export function createResponsesCall(
  request: Request,
  configs: AiConfig[],
  options: {
    system?: string;
    webSearch?: boolean;
    tools?: ToolSet;
  },
  messages: ModelMessage[],
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  
  const models = configs.map(config => {
    const provider = createOpenAI({
      baseURL: `${config.baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`,
      apiKey: config.apiKey,
      headers: config.headers && Object.keys(config.headers).length > 0 ? config.headers : {
        "Lovable-API-Key": config.apiKey || "",
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      fetch: runIdFetch.fetch,
    });
    return provider.chat(config.model);
  });

  const tools: ToolSet = { ...(options.tools ?? {}) };
  const system = options.system ?? "";
  
  const result = streamText({
    model: experimental_fallback(models),
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
