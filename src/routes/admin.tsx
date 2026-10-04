import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mimi/AppShell";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/head";
import { ROLE_LABELS, ROLE_ORDER, db, fetchMyRoles, myRolesKey, type AppRole } from "@/lib/roles";

export const Route = createFileRoute("/admin")({
  head: () => pageHead("Administración", "Gestiona los roles del equipo y las solicitudes de acceso a Mimi."),
  component: () => <AppShell>{(userId) => <AdminPage userId={userId} />}</AppShell>,
});

type AdminUser = { user_id: string; email: string; full_name: string | null; created_at: string; role: AppRole | null };
type Request = { id: string; user_id: string; requested_role: AppRole; created_at: string };

function AdminPage({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: roles, isLoading } = useQuery({ queryKey: myRolesKey(userId), queryFn: () => fetchMyRoles(userId) });
  const isAdmin = roles?.includes("administrador") ?? false;

  const { data: adminExists } = useQuery({
    queryKey: ["admin-exists"],
    enabled: !isLoading && !isAdmin,
    queryFn: async () => {
      const { data } = await db.rpc("admin_exists");
      return Boolean(data);
    },
  });

  const claim = async () => {
    const { data, error } = await db.rpc("claim_first_admin");
    if (error || !data) {
      toast.error("Ya existe un administrador.");
      return;
    }
    toast.success("Ahora eres administrador.");
    qc.invalidateQueries({ queryKey: myRolesKey(userId) });
  };

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Cargando…</p>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md flex-1 px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">Solo administradores</h1>
        {adminExists === false ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Todavía no hay ningún administrador. La primera persona que lo active controlará los roles del equipo.
            </p>
            <Button className="mt-6" onClick={claim}>Convertirme en administrador</Button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Pide a un administrador de IVAD que te dé acceso.</p>
        )}
      </div>
    );
  }

  return <AdminPanel userId={userId} />;
}

function AdminPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await db.rpc("admin_list_users");
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });
  const requests = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await db
        .from("access_requests")
        .select("id,user_id,requested_role,created_at")
        .eq("status", "pendiente")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Request[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
  };

  const setRole = async (target: string, role: AppRole) => {
    const { error } = await db.rpc("admin_set_role", { _user_id: target, _role: role });
    if (error) {
      toast.error(error.message.includes("propio") ? "No puedes quitarte tu propio rol de administrador." : "No se pudo cambiar el rol.");
      return;
    }
    toast.success(`Rol cambiado a ${ROLE_LABELS[role]}.`);
    refresh();
  };

  const resolve = async (id: string, approve: boolean) => {
    const { error } = await db.rpc("admin_resolve_request", { _id: id, _approve: approve });
    if (error) {
      toast.error("No se pudo actualizar la solicitud.");
      return;
    }
    toast.success(approve ? "Acceso aprobado." : "Solicitud rechazada.");
    refresh();
  };

  const nameOf = (id: string) => {
    const u = users.data?.find((x) => x.user_id === id);
    return u?.full_name || u?.email || "Usuario";
  };

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 py-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Administración</h1>
      <p className="mt-1 text-sm text-muted-foreground">Asigna roles al equipo y aprueba solicitudes de acceso.</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Solicitudes pendientes</h2>
        {requests.data?.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No hay solicitudes pendientes.</p>}
        <div className="mt-3 space-y-2">
          {requests.data?.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{nameOf(r.user_id)}</p>
                <p className="text-xs text-muted-foreground">
                  Pide acceso a Mimi Ejecutiva · {new Date(r.created_at).toLocaleDateString("es-DO")}
                </p>
              </div>
              <Button size="sm" onClick={() => resolve(r.id, true)}>
                <Check className="mr-1 h-4 w-4" /> Aprobar
              </Button>
              <Button size="sm" variant="outline" onClick={() => resolve(r.id, false)}>
                <X className="mr-1 h-4 w-4" /> Rechazar
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Equipo</h2>
        {users.isLoading && <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>}
        <div className="mt-3 space-y-2">
          {users.data?.map((u) => (
            <div key={u.user_id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {u.full_name || "Sin nombre"} {u.user_id === userId && <span className="text-xs text-primary">(tú)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <select
                aria-label={`Rol de ${u.email}`}
                value={u.role ?? "empleado"}
                onChange={(e) => setRole(u.user_id, e.target.value as AppRole)}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
              >
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
