import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Trash2 } from "lucide-react";
import { AppShell } from "@/components/mimi/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/memoria")({
  head: () => pageHead("Memoria", "Lo que Mimi recuerda de ti, privado y solo visible para ti."),
  component: () => <AppShell>{(userId) => <Memory userId={userId} />}</AppShell>,
});

function Memory({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const key = ["memories", userId];
  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_memories").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const remove = async (id?: string) => {
    const q = supabase.from("user_memories").delete();
    await (id ? q.eq("id", id) : q.eq("user_id", userId));
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Memoria</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> Lo que Mimi recuerda de ti. Es privado: solo tú lo ves.
      </p>
      <div className="mt-6 space-y-2">
        {isLoading ? null : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no recuerda nada. Cuéntale tu nombre o tu cargo en el chat.</p>
        ) : (
          data.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <p className="flex-1 text-sm">{m.content}</p>
              <Button variant="ghost" size="icon" aria-label="Olvidar" onClick={() => remove(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      {data.length > 0 && (
        <Button variant="outline" className="mt-6" onClick={() => remove()}>
          Borrar toda la memoria
        </Button>
      )}
    </div>
  );
}
