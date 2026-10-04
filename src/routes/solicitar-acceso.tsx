import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Lock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mimi/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AGENTS } from "@/lib/agents";
import { pageHead } from "@/lib/head";
import { PRIVATE_AGENTS, fetchMyAgentAccess, myAgentAccessKey, type PrivateAgent } from "@/lib/roles";

export const Route = createFileRoute("/solicitar-acceso")({
  head: () => pageHead("Solicitar acceso", "Pide acceso a las Mimi privadas de IVAD: Contadora, Logística, Ejecutiva y Milt."),
  component: () => <AppShell>{(userId) => <RequestAccess userId={userId} />}</AppShell>,
});

function RequestAccess({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const { data: allowed = [] } = useQuery({ queryKey: myAgentAccessKey, queryFn: fetchMyAgentAccess });
  const pendingKey = ["my-pending-agents", userId];
  const { data: pending = [] } = useQuery({
    queryKey: pendingKey,
    queryFn: async () => {
      const { data } = await supabase
        .from("access_requests")
        .select("agent")
        .eq("user_id", userId)
        .eq("status", "pendiente");
      return (data ?? []).map((r) => r.agent);
    },
  });

  const request = async (agent: PrivateAgent) => {
    const { error } = await supabase
      .from("access_requests")
      .insert({ user_id: userId, agent, reason: reasons[agent]?.trim() || null });
    if (error) {
      toast.error("No se pudo enviar la solicitud");
      return;
    }
    toast.success("Solicitud enviada. Un administrador la revisará.");
    qc.invalidateQueries({ queryKey: pendingKey });
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Solicitar acceso</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Estas Mimi son privadas. Un administrador de IVAD debe aprobar tu acceso.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {PRIVATE_AGENTS.map((id) => {
          const a = AGENTS.find((x) => x.id === id)!;
          const has = allowed.includes(id);
          const isPending = pending.includes(id);
          return (
            <div key={id} className="flex flex-col rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <p className="flex-1 font-semibold">{a.name}</p>
                {has ? <Check className="h-4 w-4 text-online" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{a.tag}</p>
              {has ? (
                <p className="mt-4 text-sm text-online">Ya tienes acceso</p>
              ) : isPending ? (
                <p className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /> Solicitud pendiente
                </p>
              ) : (
                <>
                  <textarea
                    value={reasons[id] ?? ""}
                    onChange={(e) => setReasons((r) => ({ ...r, [id]: e.target.value }))}
                    placeholder="¿Para qué la necesitas? (opcional)"
                    rows={2}
                    maxLength={300}
                    className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button size="sm" className="mt-3" onClick={() => request(id)}>
                    Solicitar acceso
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
