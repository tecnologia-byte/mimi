import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BC-8Rdh6Zh8yl1EEmx51S6ly0jRBYRcUx_lYohiXKwSjqxdfJN3kCtX4q4f3XDHrUWwrV3XzCw9qZpII4Mzu9qo";

export type PushStatus = "registered" | "unsupported" | "open-in-new-tab" | "denied" | "error";

function urlB64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  return !!(await reg?.pushManager.getSubscription());
}

/** Call from a click: asks permission and saves this device for notifications. */
export async function enablePush(userId: string): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  if (window.top !== window.self) return "open-in-new-tab";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  try {
    const reg = await navigator.serviceWorker.register("/push-sw.js");
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(VAPID_PUBLIC_KEY) }));
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: "endpoint" });
    if (error) throw error;
    return "registered";
  } catch (e) {
    console.error("No se pudo activar notificaciones", e);
    return "error";
  }
}

export const PUSH_MESSAGES: Record<Exclude<PushStatus, "registered">, string> = {
  unsupported: "Este navegador no permite notificaciones. Prueba con Chrome o instala Mimi en tu teléfono.",
  "open-in-new-tab": "Abre Mimi en su propia pestaña (o la app instalada) para activar las notificaciones.",
  denied: "Bloqueaste las notificaciones. Actívalas en la configuración del sitio de tu navegador.",
  error: "No se pudieron activar las notificaciones. Inténtalo de nuevo.",
};
