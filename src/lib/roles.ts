import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "empleado" | "gerente" | "ejecutivo" | "administrador";

export const ROLE_LABELS: Record<AppRole, string> = {
  empleado: "Empleado",
  gerente: "Gerente",
  ejecutivo: "Ejecutivo",
  administrador: "Administrador",
};

export const ROLE_ORDER: AppRole[] = ["empleado", "gerente", "ejecutivo", "administrador"];

// Untyped client for tables/functions added after the generated types.
export const db = supabase as unknown as SupabaseClient;

export const myRolesKey = (userId: string) => ["my-roles", userId];

export async function fetchMyRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.role as AppRole);
}

export async function fetchMyPendingRequest(userId: string): Promise<boolean> {
  const { data, error } = await db
    .from("access_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pendiente")
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}
