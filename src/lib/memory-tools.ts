import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Loads this user's private memories and builds the prompt section. */
export async function memoryPromptBlock(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("user_memories")
    .select("id, content")
    .order("created_at", { ascending: false })
    .limit(60);
  const list = data?.length ? data.map((m) => `- (${m.id}) ${m.content}`).join("\n") : "(aún no sabes nada de esta persona)";
  return `\n\n## Lo que recuerdas de esta persona (privado, solo suyo)\n${list}\n\nUsa estos datos con naturalidad (por ejemplo, llámala por su nombre). Cuando te diga algo duradero sobre sí misma (nombre, cargo, área, preferencias, clientes o proyectos habituales), guárdalo con guardar_recuerdo sin anunciarlo de forma exagerada; basta un breve «lo tendré en cuenta». No guardes contraseñas, datos bancarios ni información sensible. Si pide olvidar algo, usa olvidar_recuerdo. Nunca reveles recuerdos de otras personas.`;
}

export function createMemoryTools(supabase: SupabaseClient, userId: string) {
  return {
    guardar_recuerdo: tool({
      description: "Guarda un dato duradero y privado sobre el usuario (nombre, cargo, preferencias, etc.). Una frase corta en tercera persona.",
      inputSchema: z.object({ dato: z.string().min(2).max(300) }),
      execute: async ({ dato }) => {
        const { error } = await supabase.from("user_memories").insert({ user_id: userId, content: dato });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
    }),
    olvidar_recuerdo: tool({
      description: "Borra un recuerdo del usuario por su id (el que aparece entre paréntesis).",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) => {
        const { error } = await supabase.from("user_memories").delete().eq("id", id);
        return error ? { ok: false, error: error.message } : { ok: true };
      },
    }),
  };
}
