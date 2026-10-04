import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Lock, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/mimi/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos — Mimi, IA de IVAD" },
      { name: "description", content: "Tus documentos privados guardados en Mimi, la asistente de IVAD Home & Goods." },
      { property: "og:title", content: "Documentos — Mimi, IA de IVAD" },
      { property: "og:description", content: "Sube, guarda y analiza tus documentos con Mimi de forma privada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  return <AppShell>{(userId) => <DocumentsList userId={userId} />}</AppShell>;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentsList({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["documents", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = async (files: FileList | null) => {
    for (const file of Array.from(files ?? [])) {
      const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (error) {
        toast.error(`No se pudo subir ${file.name}`);
        continue;
      }
      await supabase.from("documents").insert({
        user_id: userId,
        name: file.name,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        storage_path: path,
      });
    }
    qc.invalidateQueries({ queryKey: ["documents", userId] });
    toast.success("Documento guardado");
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("No se pudo abrir el documento");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (id: string, path: string) => {
    await supabase.storage.from("documents").remove([path]);
    await supabase.from("documents").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["documents", userId] });
    toast.success("Documento eliminado");
  };

  return (
    <div className="chat-scroll mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documentos</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Solo tú puedes ver tus documentos.
          </p>
        </div>
        <Button className="rounded-full" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Subir documento
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.txt,.md,.csv,.json,.docx,.xlsx,image/*"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-4 rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
        Para que Mimi analice un documento, ábrelo en un chat con el botón + del cuadro de escribir (PDF, imágenes y
        archivos de texto). Todo lo que adjuntes en el chat también se guarda aquí.
      </p>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : data.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Aún no tienes documentos.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {data.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(d.size)} · {new Date(d.created_at).toLocaleDateString("es-DO")}
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Descargar" onClick={() => download(d.storage_path)}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => remove(d.id, d.storage_path)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
