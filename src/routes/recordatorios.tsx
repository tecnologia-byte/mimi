import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mimi/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/head";
import { enablePush, isPushEnabled, PUSH_MESSAGES } from "@/lib/push";

export const Route = createFileRoute("/recordatorios")({
  head: () => pageHead("Recordatorios", "Recordatorios que Mimi te enviará como notificación."),
  component: () => <AppShell>{(userId) => <Reminders userId={userId} />}</AppShell>,
});

function Reminders({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const key = ["reminders", userId];
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    void isPushEnabled().then(setEnabled);
  }, []);
  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("reminders").select("*").order("remind_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const activate = async () => {
    const s = await enablePush(userId);
    if (s === "registered") {
      setEnabled(true);
      toast.success("Listo, este dispositivo recibirá las notificaciones de Mimi.");
    } else toast.error(PUSH_MESSAGES[s]);
  };

  const remove = async (id: string) => {
    await supabase.from("reminders").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: key });
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString("es-DO", { timeZone: "America/Santo_Domingo", dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Recordatorios</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Dile a Mimi en el chat «recuérdame llamar al proveedor mañana a las 10» y te llegará una notificación, aunque Mimi esté cerrada.
      </p>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        {enabled ? <BellRing className="h-6 w-6 text-primary" /> : <Bell className="h-6 w-6 text-muted-foreground" />}
        <p className="flex-1 text-sm">
          {enabled ? "Las notificaciones están activas en este dispositivo." : "Activa las notificaciones en cada dispositivo donde quieras recibirlas."}
        </p>
        <Button onClick={activate} variant={enabled ? "outline" : "default"}>
          {enabled ? "Volver a activar" : "Activar notificaciones"}
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        {isLoading ? null : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no tienes recordatorios.</p>
        ) : (
          data.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className={r.sent_at ? "text-sm text-muted-foreground line-through" : "text-sm font-medium"}>{r.title}</p>
                <p className="text-xs text-muted-foreground">{fmt(r.remind_at)}{r.sent_at ? " · enviado" : ""}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Eliminar recordatorio" onClick={() => remove(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
