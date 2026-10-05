import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SHOWN_KEY = "mimi-reminders-shown";

/** While Mimi is open, show due reminders on screen and as a system notification. */
export function useReminderAlerts(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    const check = async () => {
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const { data } = await supabase
        .from("reminders")
        .select("id, title, thread_id, remind_at")
        .gte("remind_at", since)
        .lte("remind_at", new Date().toISOString());
      if (stopped || !data?.length) return;
      const shown: string[] = JSON.parse(localStorage.getItem(SHOWN_KEY) ?? "[]");
      const fresh = data.filter((r) => !shown.includes(r.id));
      if (!fresh.length) return;
      localStorage.setItem(SHOWN_KEY, JSON.stringify([...shown, ...fresh.map((r) => r.id)].slice(-100)));
      for (const r of fresh) {
        toast(`Recordatorio: ${r.title}`, { duration: 15000 });
        if ("Notification" in window && Notification.permission === "granted") {
          const reg = await navigator.serviceWorker?.getRegistration("/push-sw.js");
          const opts = { body: r.title, icon: "/icon-192.png", tag: r.id, data: { url: r.thread_id ? `/chat/${r.thread_id}` : "/recordatorios" } };
          if (reg) await reg.showNotification("Mimi · Recordatorio", opts);
          else new Notification("Mimi · Recordatorio", opts);
        }
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
      // The background sender may not have run yet; mark as sent so it is not repeated.
      await supabase.from("reminders").update({ sent_at: new Date().toISOString() }).in("id", fresh.map((r) => r.id)).is("sent_at", null);
    };
    void check();
    const t = window.setInterval(check, 15_000);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [userId]);
}
