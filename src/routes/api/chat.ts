import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  type UIMessage,
} from "ai";
import { searchWeb, type WebResult } from "@/lib/web-search";

import { createResponsesCall } from "@/lib/ai/responses";
import { getAiConfig } from "@/lib/ai/config";
import { MIMI_SYSTEM_PROMPT } from "@/lib/mimi";
import { SPECIALISTS } from "@/lib/agents";
import { createMiltTools } from "@/lib/milt";
import { createGmailTools } from "@/lib/gmail-tools";
import { createMemoryTools, memoryPromptBlock } from "@/lib/memory-tools";
import { createReminderTools, reminderPromptBlock } from "@/lib/reminder-tools";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/** Creates a short, topical chat title (e.g. "Temas de la DGII") from the first message. */
async function generateChatTitle(firstMessage: string): Promise<string> {
  const fallback = firstMessage.slice(0, 48) || "Nuevo chat";
  const ai = getAiConfig();
  if (!ai.apiKey || !firstMessage.trim()) return fallback;
  try {
    const provider = createOpenAI({
      baseURL: ai.baseURL,
      apiKey: ai.apiKey,
      headers: ai.headers,
    });
    const { text } = await generateText({
      model: provider.chat(ai.titleModel),
      prompt: `Genera un título muy corto (máximo 5 palabras, en español, sin comillas ni punto final) que resuma el tema de este mensaje. Responde solo con el título.\n\nMensaje: ${firstMessage.slice(0, 500)}`,
    });
    const title = text.trim().replace(/^["']|["']$/g, "").slice(0, 60);
    return title || fallback;
  } catch (error) {
    console.error("No se pudo generar el título del chat:", error);
    return fallback;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
        if (!token) {
          return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
        }

        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
        );

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          return new Response(JSON.stringify({ error: "Sesión inválida" }), { status: 401 });
        }

        let body: { messages?: UIMessage[]; threadId?: string; webSearch?: boolean; agent?: string };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Solicitud inválida" }), { status: 400 });
        }

        const { messages, threadId } = body;
        if (!messages?.length || !threadId) {
          return new Response(JSON.stringify({ error: "Faltan mensajes o el chat" }), { status: 400 });
        }

        // Verify the thread belongs to this user (RLS also enforces this).
        const { data: thread, error: threadError } = await supabase
          .from("threads")
          .select("id, title")
          .eq("id", threadId)
          .single();
        if (threadError || !thread) {
          return new Response(JSON.stringify({ error: "Chat no encontrado" }), { status: 404 });
        }

        // Persist the latest user message if it is not stored yet.
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          const { data: existing } = await supabase
            .from("messages")
            .select("id")
            .eq("thread_id", threadId)
            .eq("sdk_id", lastUser.id)
            .maybeSingle();
          if (!existing) {
            const { error: insertError } = await supabase.from("messages").insert({
              thread_id: threadId,
              role: "user",
              content: messageText(lastUser),
              // Keep only file names in history; file contents stay in private storage.
              parts: lastUser.parts.map((p) =>
                p.type === "file" ? { type: "text", text: `📎 ${p.filename ?? "archivo"}` } : p,
              ) as unknown as Record<string, unknown>[],
              sdk_id: lastUser.id,
            });
            if (insertError) {
              console.error("No se pudo guardar el mensaje del usuario:", insertError);
            }
            if (thread.title === "Nuevo chat") {
              const title = await generateChatTitle(messageText(lastUser));
              await supabase.from("threads").update({ title, updated_at: new Date().toISOString() }).eq("id", threadId);
            } else {
              await supabase.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
            }
          }
        }

        const ai = getAiConfig();
        if (!ai.apiKey) {
          return new Response(JSON.stringify({ error: "IA no configurada" }), { status: 500 });
        }

        const modelMessages = await convertToModelMessages(messages);
        const { data: knowledge } = await supabase
          .from("knowledge_entries")
          .select("title, category, content")
          .order("updated_at", { ascending: false })
          .limit(40);
        const knowledgeBlock = knowledge?.length
          ? `\n\n## Base de Conocimientos de IVAD\nUsa esta información interna cuando sea relevante y cítala como [Conocimiento: título]. Si la respuesta no está aquí, dilo con honestidad.\n\n${knowledge
              .map((k) => `### ${k.title} (${k.category})\n${k.content.slice(0, 3000)}`)
              .join("\n\n")}`
          : "";
        const agent = body.agent ?? "mimi";
        if (agent !== "mimi") {
          const { data: allowed } = await supabase.rpc("has_agent_access", {
            _user_id: userData.user.id,
            _agent: agent,
          });
          if (!allowed) {
            return new Response("Esta Mimi es privada. Solicita acceso a un administrador.", { status: 403 });
          }
        }
        let agentBlock = "";
        if (agent === "contadora" || agent === "logistica" || agent === "ejecutiva") {
          agentBlock = `\n\n## Tu versión activa\n${SPECIALISTS[agent]}\nSi la tarea también necesita a otra especialista, consúltala con la herramienta consultar_agente.`;
        } else if (agent === "milt") {
          agentBlock =
            "\n\n## Modo Milt\nEres la coordinadora de Milt, el equipo de agentes de IVAD. Para cada tarea divide el trabajo y consulta a Mimi Contadora, Mimi Logística y/o Mimi Ejecutiva con la herramienta consultar_agente (pueden ser varias consultas). Luego une sus respuestas en una solución final clara, indicando qué aportó cada agente.";
        }
        // Mimi general solo consulta a las privadas si el usuario tiene acceso a Milt.
        let canConsult = agent !== "mimi";
        if (agent === "mimi") {
          const { data } = await supabase.rpc("has_agent_access", { _user_id: userData.user.id, _agent: "milt" });
          canConsult = Boolean(data);
          if (canConsult) {
            agentBlock =
              "\n\n## Milt\nPuedes consultar a Mimi Contadora (finanzas, impuestos), Mimi Logística (inventario, envíos) o Mimi Ejecutiva (gerencia, reportes, decisiones) con la herramienta consultar_agente cuando la pregunta lo requiera.";
          }
        }
        const memoryBlock = await memoryPromptBlock(supabase);
        let webResults: WebResult[] = [];
        let webBlock = "";
        if (body.webSearch === true && lastUser) {
          webResults = await searchWeb(messageText(lastUser));
          webBlock = webResults.length
            ? `\n\n## Resultados de búsqueda web (actuales)\nResponde usando estos resultados. Cita cada dato con el número entre corchetes, por ejemplo [1]. No inventes fuentes.\n\n${webResults
                .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
                .join("\n\n")}`
            : "\n\nLa búsqueda web no devolvió resultados; dilo con honestidad y responde con lo que sabes.";
        }
        const { result } = createResponsesCall(
          request,
          {
            baseURL: ai.baseURL,
            apiKey: ai.apiKey,
            model: ai.model,
            headers: ai.headers,
            system: MIMI_SYSTEM_PROMPT + agentBlock + knowledgeBlock + reminderPromptBlock() + memoryBlock + webBlock,
            tools: { ...(canConsult ? createMiltTools(request.signal) : {}), ...createGmailTools(), ...createReminderTools(supabase, userData.user.id, threadId), ...createMemoryTools(supabase, userData.user.id) },
          },
          modelMessages,
        );

        const stream = createUIMessageStream({
          originalMessages: messages,
          execute: ({ writer }) => {
            webResults.forEach((r, i) =>
              writer.write({ type: "source-url", sourceId: `web-${i + 1}`, url: r.url, title: r.title }),
            );
            writer.merge(result.toUIMessageStream({ sendReasoning: false, sendSources: true }));
          },
          onFinish: async ({ responseMessage }) => {
            const { error } = await supabase.from("messages").insert({
              thread_id: threadId,
              role: "assistant",
              content: messageText(responseMessage),
              parts: responseMessage.parts as unknown as Record<string, unknown>[],
              sdk_id: responseMessage.id,
            });
            if (error) console.error("No se pudo guardar la respuesta de Mimi:", error);
          },
        });
        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
