import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

import { SPECIALISTS } from "./agents";
import { MIMI_SYSTEM_PROMPT } from "./mimi";
import { getAiConfig } from "./ai/config";

/** Milt: herramienta para que una Mimi consulte a otra versión especialista. */
export function createMiltTools(signal: AbortSignal) {
  const ai = getAiConfig();
  const provider = createOpenAI({
    baseURL: ai.baseURL,
    apiKey: ai.apiKey,
    headers: ai.headers,
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
          model: provider.chat(ai.model),
          system: `${MIMI_SYSTEM_PROMPT}\n\n${SPECIALISTS[agente]}\n\nOtra Mimi te consulta como parte de Milt (agentes de IVAD). Responde directo, completo y conciso para que ella lo use.`,
          prompt: tarea,
          abortSignal: signal,
        });
        return { agente, respuesta: await result.text };
      },
    }),
  };
}
