import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export function reminderPromptBlock() {
  const now = new Date().toLocaleString("es-DO", { timeZone: "America/Santo_Domingo", dateStyle: "full", timeStyle: "short" });
  return `\n\n## Recordatorios\nFecha y hora actual en República Dominicana (UTC-4): ${now}. Cuando el usuario pida que le recuerdes algo, usa la herramienta crear_recordatorio con la fecha/hora en formato ISO con zona -04:00. Si no dice la hora, pregunta solo la hora. Luego confirma brevemente cuándo le avisarás con una notificación.`;
}

export function createReminderTools(supabase: SupabaseClient, userId: string, threadId: string) {
  return {
    crear_recordatorio: tool({
      description: "Programa un recordatorio que llegará como notificación al usuario en la fecha indicada.",
      inputSchema: z.object({
        tarea: z.string().min(1).max(200).describe("Lo que hay que recordar, breve"),
        fecha_hora: z.string().describe("ISO 8601 con zona, ej. 2026-10-05T15:00:00-04:00"),
      }),
      execute: async ({ tarea, fecha_hora }) => {
        const at = new Date(fecha_hora);
        if (Number.isNaN(at.getTime())) return { ok: false, error: "Fecha inválida" };
        const { error } = await supabase
          .from("reminders")
          .insert({ user_id: userId, title: tarea, remind_at: at.toISOString(), thread_id: threadId });
        if (error) return { ok: false, error: error.message };
        return {
          ok: true,
          tarea,
          cuando: at.toLocaleString("es-DO", { timeZone: "America/Santo_Domingo", dateStyle: "medium", timeStyle: "short" }),
        };
      },
    }),
  };
}
