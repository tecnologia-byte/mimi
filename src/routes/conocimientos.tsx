import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mimi/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/conocimientos")({
  head: () => pageHead("Conocimientos", "Base de conocimientos de IVAD que Mimi usa para responder con fuentes."),
  component: () => <AppShell>{(userId) => <Knowledge userId={userId} />}</AppShell>,
});

function Knowledge({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["knowledge"],
    queryFn: async () => {
      const { data, error } = await supabase.from("knowledge_entries").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Escribe un título y el contenido");
      return;
    }
    const { error } = await supabase.from("knowledge_entries").insert({
      title: title.trim(),
      category: category.trim() || "General",
      content: content.trim(),
      created_by: userId,
    });
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    setTitle(""); setCategory(""); setContent(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["knowledge"] });
    toast.success("Conocimiento agregado. Mimi ya lo usa.");
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar este conocimiento?")) return;
    const { error } = await supabase.from("knowledge_entries").delete().eq("id", id);
    if (error) {
      toast.error("No tienes permiso para eliminarlo");
      return;
    }
    qc.invalidateQueries({ queryKey: ["knowledge"] });
  };

  const filtered = data.filter((k) =>
    `${k.title} ${k.category} ${k.content}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Conocimientos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Políticas, productos y procesos de IVAD. Mimi los usa y los cita al responder.</p>
        </div>
        <Button onClick={() => setOpen((o) => !o)}><Plus className="mr-1 h-4 w-4" /> Agregar</Button>
      </div>

      {open && (
        <div className="mt-5 space-y-3 rounded-2xl border border-primary/40 bg-card p-4">
          <Input placeholder="Título (ej. Política de devoluciones)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Categoría (ej. Ventas, Productos, RR. HH.)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Textarea rows={6} placeholder="Contenido…" value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => void save()}>Guardar</Button>
          </div>
        </div>
      )}

      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar en conocimientos" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && filtered.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No hay conocimientos todavía.</p>}
      <div className="mt-4 space-y-3">
        {filtered.map((k) => (
          <div key={k.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{k.title}</p>
                <span className="text-xs text-primary">{k.category}</span>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground line-clamp-6">{k.content}</p>
              </div>
              {k.created_by === userId && (
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Eliminar" onClick={() => void remove(k.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
