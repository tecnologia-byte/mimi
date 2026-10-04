import { supabase } from "@/integrations/supabase/client";
import { db, fetchMyRoles } from "@/lib/roles";

/** Dominio corporativo con acceso directo. */
export const IVAD_DOMAIN = "ivadsrl.com";

/** Cuentas externas autorizadas directamente por IVAD. */
export const ALLOWED_EMAILS: string[] = ["anotasy@gmail.com"];

export type AccountGate = "ok" | "pendiente" | "rechazada";

export function hasDirectAccess(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return e.endsWith(`@${IVAD_DOMAIN}`) || ALLOWED_EMAILS.includes(e);
}

/**
 * Decide si el usuario puede usar Mimi.
 * - Correos @ivadsrl.com y la lista blanca entran directo.
 * - Administradores entran siempre.
 * - El resto necesita una solicitud aprobada (agent = 'cuenta'); si no existe, se crea.
 */
export async function checkAccountAccess(userId: string, email?: string | null): Promise<AccountGate> {
  if (hasDirectAccess(email)) return "ok";
  const roles = await fetchMyRoles(userId).catch(() => [] as string[]);
  if (roles.includes("administrador")) return "ok";

  const { data } = await db
    .from("access_requests")
    .select("id,status")
    .eq("user_id", userId)
    .eq("agent", "cuenta")
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = data?.[0];
  if (latest?.status === "aprobada") return "ok";
  if (latest?.status === "pendiente") return "pendiente";

  // Sin solicitud (o rechazada): crear una nueva pendiente.
  const { error } = await db.from("access_requests").insert({
    user_id: userId,
    agent: "cuenta",
    reason: "Solicitud automática: correo fuera de ivadsrl.com",
  });
  if (error) return latest?.status === "rechazada" ? "rechazada" : "pendiente";
  return "pendiente";
}
