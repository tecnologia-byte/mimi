import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Hourglass, Loader2, LogOut } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { MimiSidebar } from "./MimiSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { checkAccountAccess } from "@/lib/access";
import { useReminderAlerts } from "@/hooks/use-reminder-alerts";

export function AppShell({ children }: { children: (userId: string) => ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: gate, isLoading: gateLoading } = useQuery({
    queryKey: ["account-gate", user?.id],
    enabled: !!user,
    queryFn: () => checkAccountAccess(user!.id, user!.email),
    staleTime: 30_000,
  });
  useReminderAlerts(gate === "ok" ? user?.id : undefined);

  if (loading || !user || gateLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (gate !== "ok") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <Hourglass className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-foreground">Acceso en revisión</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Mimi es exclusiva para el equipo de IVAD Home & Goods. Tu correo{" "}
            <span className="font-medium text-foreground">{user.email}</span> no pertenece a
            ivadsrl.com, por lo que un administrador debe aprobar tu acceso.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {gate === "rechazada"
              ? "Tu solicitud anterior fue rechazada. Se envió una nueva; espera a que te den el acceso."
              : "Tu solicitud ya fue enviada. Espera a que te den el acceso e intenta de nuevo más tarde."}
          </p>
          <Button
            variant="outline"
            className="mt-6 gap-2"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <MimiSidebar user={user} />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between px-3">
            <SidebarTrigger />
            <ThemeToggle />
          </header>
          <main className="relative flex min-h-0 flex-1 flex-col">{children(user.id)}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
