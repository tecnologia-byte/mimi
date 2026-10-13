import { buildPushPayload } from "@block65/webcrypto-web-push";
import { VAPID_PUBLIC_KEY } from "@/lib/push";

/**
 * Creates a report request and pushes a notification to every user who can
 * access reports (admins, gerentes and people with Mimi Ejecutiva access).
 */
export async function requestReport(requestedBy: string, title: string, message?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: req, error } = await supabaseAdmin
    .from("report_requests")
    .insert({ requested_by: requestedBy, title, message: message ?? null })
    .select("id")
    .single();
  if (error || !req) throw new Error(error?.message ?? "No se pudo crear la solicitud");

  const [{ data: roles }, { data: access }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("user_id").in("role", ["administrador", "gerente"]),
    supabaseAdmin.from("agent_access").select("user_id").eq("agent", "ejecutiva"),
  ]);
  const userIds = [...new Set([...(roles ?? []), ...(access ?? [])].map((r) => r.user_id))];

  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  let sent = 0;
  if (privateKey && userIds.length) {
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    const vapid = { subject: "mailto:tecnologia@ivadsrl.com", publicKey: VAPID_PUBLIC_KEY, privateKey };
    const stale: string[] = [];
    for (const s of subs ?? []) {
      try {
        const payload = await buildPushPayload(
          {
            data: { title: "Mimi Ejecutiva · Reporte", body: message ? `${title}: ${message}` : `Súbeme el ${title}`, tag: req.id, url: "/reportes" },
            options: { ttl: 86400, urgency: "high" },
          },
          { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
          vapid,
        );
        const res = await fetch(s.endpoint, payload);
        if (res.status === 404 || res.status === 410) stale.push(s.id);
        else if (res.ok) sent++;
      } catch (e) {
        console.error("Push reporte error", e);
      }
    }
    if (stale.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
  }
  return { id: req.id, notified: userIds.length, sent };
}
