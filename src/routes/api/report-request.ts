import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/report-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
        if (!token) return new Response("No autorizado", { status: 401 });
        const supabase = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false },
        });
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return new Response("Sesión inválida", { status: 401 });
        const { data: ok } = await supabase.rpc("can_access_reports", { _user_id: u.user.id });
        if (!ok) return new Response("Sin acceso a reportes", { status: 403 });
        const body = (await request.json().catch(() => ({}))) as { title?: string; message?: string };
        const title = String(body.title ?? "").trim().slice(0, 120);
        if (title.length < 3) return new Response("Falta el título", { status: 400 });
        const { requestReport } = await import("@/lib/report-notify.server");
        return Response.json(await requestReport(u.user.id, title, body.message?.slice(0, 300)));
      },
    },
  },
});
