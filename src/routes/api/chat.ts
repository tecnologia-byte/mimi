import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, generateText, type UIMessage } from "ai";

import { createResponsesCall } from "@/lib/ai/responses";
import { MIMI_SYSTEM_PROMPT } from "@/lib/mimi";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
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

        let body: { messages?: UIMessage[]; threadId?: string; webSearch?: boolean };
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
              const title = messageText(lastUser).slice(0, 48) || "Nuevo chat";
              await supabase.from("threads").update({ title, updated_at: new Date().toISOString() }).eq("id", threadId);
            } else {
              await supabase.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
            }
          }
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
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
        const { result, response } = createResponsesCall(
          request,
          { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra", system: MIMI_SYSTEM_PROMPT + knowledgeBlock, webSearch: body.webSearch === true },
          modelMessages,
        );

        const streamResponse = result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: false,
          sendSources: true,
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

        // Reuse the run-id wrapper for header forwarding.
        void response;
        return streamResponse;
      },
    },
  },
});
