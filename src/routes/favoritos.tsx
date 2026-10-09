import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mimi/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/favoritos")({
  head: () => pageHead("Favoritos", "Las respuestas de Mimi que guardaste para usar después."),
  component: () => <AppShell>{(userId) => <Favorites userId={userId} />}</AppShell>,
});

function Favorites({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const key = ["favorites", userId];
  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const remove = async (id: string) => {
    const { error } = await supabase.from("favorites").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Favoritos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Toca la estrella debajo de una respuesta de Mimi para guardarla aquí.</p>
      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && data.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Aún no tienes favoritos.</p>}
      <div className="mt-6 space-y-4">
        {data.map((f) => (
          <div key={f.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="prose prose-sm max-w-none dark:prose-invert line-clamp-[12]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{f.content}</ReactMarkdown>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <span className="mr-auto">{new Date(f.created_at).toLocaleDateString("es-DO")}</span>
              {f.thread_id && (
                <Button asChild variant="ghost" size="icon" className="h-7 w-7" aria-label="Abrir chat">
                  <Link to="/chat/$threadId" params={{ threadId: f.thread_id }}><MessageSquare className="h-3.5 w-3.5" /></Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Copiar" onClick={() => { navigator.clipboard.writeText(f.content).then(() => toast.success("Copiado")).catch(() => toast.error("Error al copiar")); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Eliminar" onClick={() => void remove(f.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
