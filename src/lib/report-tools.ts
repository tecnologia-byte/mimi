import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const REPORTS_PROMPT =
  "\n\n## Reportes de IVAD\nPuedes leer los reportes subidos en la sección Reportes con listar_reportes, y pedirle a gerentes y administradores que suban uno con pedir_reporte (les llega una notificación en la web y la app). Tu papel es AYUDAR a decidir: analiza, compara días, señala riesgos y propone opciones con pros y contras, pero la decisión final siempre es de la persona. Nunca decidas por ella.";

export function createReportTools(supabase: SupabaseClient, userId: string) {
  return {
    listar_reportes: tool({
      description: "Lee los reportes subidos (ventas, inventario, etc.) de los últimos días, con su contenido.",
      inputSchema: z.object({
        dias: z.number().int().min(1).max(90).describe("Cuántos días hacia atrás"),
        categoria: z.string().nullable().describe("Filtrar por categoría, o null"),
      }),
      execute: async ({ dias, categoria }) => {
        const since = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
        let q = supabase
          .from("reports")
          .select("title, category, report_date, mime_type, content")
          .gte("report_date", since)
          .order("report_date", { ascending: false })
          .limit(20);
        if (categoria) q = q.ilike("category", `%${categoria}%`);
        const { data, error } = await q;
        if (error) return { error: "No tienes acceso a los reportes." };
        return {
          reportes: (data ?? []).map((r) => ({
            ...r,
            content: r.content ? r.content.slice(0, 8000) : "(Archivo PDF o imagen: pide que lo adjunten al chat para analizarlo.)",
          })),
        };
      },
    }),
    pedir_reporte: tool({
      description: "Envía una notificación a gerentes y administradores pidiéndoles subir un reporte (ej. 'reporte de ventas de hoy').",
      inputSchema: z.object({
        titulo: z.string().min(3).max(120).describe("Qué reporte se necesita"),
        mensaje: z.string().max(300).nullable().describe("Detalle opcional"),
      }),
      execute: async ({ titulo, mensaje }) => {
        const { requestReport } = await import("@/lib/report-notify.server");
        const r = await requestReport(userId, titulo, mensaje ?? undefined);
        return { ok: true, personas_avisadas: r.notified };
      },
    }),
  };
}
