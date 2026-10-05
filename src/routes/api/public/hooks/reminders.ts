import { createFileRoute } from "@tanstack/react-router";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { VAPID_PUBLIC_KEY } from "@/lib/push";

export const Route = createFileRoute("/api/public/hooks/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["REMINDERS_CRON_TOKEN"];
        const got = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        const { createHash, timingSafeEqual } = await import("node:crypto");
        const h = (v: string) => createHash("sha256").update(v).digest();
        if (!expected || !timingSafeEqual(h(got), h(expected))) return new Response("Unauthorized", { status: 401 });
        const privateKey = process.env["VAPID_PRIVATE_KEY"];
        if (!privateKey) return new Response("VAPID no configurado", { status: 500 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: due, error } = await supabaseAdmin
          .from("reminders")
          .select("id, user_id, title, thread_id")
          .is("sent_at", null)
          .lte("remind_at", new Date().toISOString())
          .limit(50);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!due?.length) return Response.json({ sent: 0 });

        // Mark first so a slow run never sends twice.
        await supabaseAdmin.from("reminders").update({ sent_at: new Date().toISOString() }).in("id", due.map((r) => r.id));

        const userIds = [...new Set(due.map((r) => r.user_id))];
        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, user_id, endpoint, p256dh, auth")
          .in("user_id", userIds);

        const vapid = { subject: "mailto:tecnologia@ivadsrl.com", publicKey: VAPID_PUBLIC_KEY, privateKey };
        let sent = 0;
        const stale: string[] = [];
        for (const r of due) {
          for (const s of subs?.filter((x) => x.user_id === r.user_id) ?? []) {
            try {
              const payload = await buildPushPayload(
                {
                  data: { title: "Mimi · Recordatorio", body: r.title, tag: r.id, url: r.thread_id ? `/chat/${r.thread_id}` : "/recordatorios" },
                  options: { ttl: 3600, urgency: "high" },
                },
                { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
                vapid,
              );
              const res = await fetch(s.endpoint, payload);
              if (res.status === 404 || res.status === 410) stale.push(s.id);
              else if (res.ok) sent++;
              else console.error("Push falló", res.status, await res.text());
            } catch (e) {
              console.error("Push error", e);
            }
          }
        }
        if (stale.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
        return Response.json({ due: due.length, sent });
      },
    },
  },
});
