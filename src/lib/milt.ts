import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

import { SPECIALISTS } from "./agents";
import { MIMI_SYSTEM_PROMPT } from "./mimi";

/** Milt: herramienta para que una Mimi consulte a otra versión especialista. */
export function createMiltTools(apiKey: string, signal: AbortSignal) {
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  return {
    consultar_agente: tool({
      description:
        "Milt: consulta a otra versión de Mimi especialista (contadora, logistica o ejecutiva) para que analice una tarea concreta y devuelva su solución.",
      inputSchema: z.object({
        agente: z.enum(["contadora", "logistica", "ejecutiva"]),
        tarea: z.string().describe("La tarea o pregunta detallada para el agente, con todo el contexto necesario."),
      }),
      execute: async ({ agente, tarea }) => {
        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          system: `${MIMI_SYSTEM_PROMPT}\n\n${SPECIALISTS[agente]}\n\nOtra Mimi te consulta como parte de Milt (agentes de IVAD). Responde directo, completo y conciso para que ella lo use.`,
          prompt: tarea,
          abortSignal: signal,
          providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low" } },
        });
        return { agente, respuesta: await result.text };
      },
    }),
  };
}
