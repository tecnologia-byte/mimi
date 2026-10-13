import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, BellRing, Download, Loader2, Lock, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/mimi/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ALLOWED_FILE_ACCEPT, isCodeFile } from "@/lib/files";
import { extractOfficeText } from "@/lib/office";
import { setActiveAgent } from "@/lib/agents";
import { useStartChat } from "@/hooks/use-start-chat";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — Mimi, IA de IVAD" },
      { name: "description", content: "Reportes diarios de IVAD organizados por Mimi Ejecutiva para apoyar decisiones de gerencia." },
      { property: "og:title", content: "Reportes — Mimi, IA de IVAD" },
      { property: "og:description", content: "Sube reportes de ventas e inventario y analízalos con Mimi Ejecutiva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{(userId) => <Reports userId={userId} />}</AppShell>,
});

const CATEGORIES = ["Ventas", "Inventario", "Finanzas", "Logística", "General"];

function dayLabel(d: string) {
  const date = parseISO(d);
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "EEEE d 'de' MMMM yyyy", { locale: es });
}

function Reports({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const startChat = useStartChat(userId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Ventas");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [requestId, setRequestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askTitle, setAskTitle] = useState("");

  const { data: allowed, isLoading: loadingAccess } = useQuery({
    queryKey: ["can-reports", userId],
    queryFn: async () => (await supabase.rpc("can_access_reports", { _user_id: userId })).data === true,
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    enabled: allowed === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").order("report_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["report-requests"],
    enabled: allowed === true,
    queryFn: async () => (await supabase.from("report_requests").select("*").eq("status", "pendiente").order("created_at", { ascending: false })).data ?? [],
  });

  if (loadingAccess) return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!allowed)
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Lock className="h-8 w-8 text-primary" />
        <p className="text-lg font-semibold">Reportes es privado</p>
        <p className="text-sm text-muted-foreground">Solo administradores, gerentes y personas con acceso a Mimi Ejecutiva pueden verlo.</p>
      </div>
    );

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (isCodeFile(file)) { toast.error("No se permiten archivos de código"); return; }
    setBusy(true);
    try {
      const path = `${date}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage.from("reports").upload(path, file, { contentType: file.type });
      if (error) throw error;
      let content: string | null = null;
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        content = ((await extractOfficeText(file).catch(() => null)) ?? (await file.text())).slice(0, 60000);
      }
      const { error: e2 } = await supabase.from("reports").insert({
        uploaded_by: userId,
        title: title.trim() || file.name,
        category,
        report_date: date,
        storage_path: path,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        content,
        request_id: requestId,
      });
      if (e2) throw e2;
      if (requestId) await supabase.from("report_requests").update({ status: "recibido", fulfilled_at: new Date().toISOString() }).eq("id", requestId);
      setTitle(""); setRequestId(null);
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["report-requests"] });
      toast.success("Reporte guardado");
    } catch {
      toast.error("No se pudo subir el reporte");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const ask = async () => {
    const t = askTitle.trim();
    if (t.length < 3) { toast.error("Escribe qué reporte necesitas"); return; }
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/report-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ title: t }),
    });
    if (!res.ok) { toast.error("No se pudo enviar el aviso"); return; }
    const r = (await res.json()) as { notified: number };
    setAskTitle("");
    qc.invalidateQueries({ queryKey: ["report-requests"] });
    toast.success(`Aviso enviado a ${r.notified} persona(s)`);
  };

  const open = async (path: string) => {
    const { data } = await supabase.storage.from("reports").createSignedUrl(path, 60);
    if (data) window.open(data.signedUrl, "_blank");
  };
  const remove = async (id: string, path: string) => {
    if (!window.confirm("¿Eliminar este reporte?")) return;
    await supabase.storage.from("reports").remove([path]);
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) toast.error("Solo quien lo subió o un administrador puede eliminarlo");
    qc.invalidateQueries({ queryKey: ["reports"] });
  };
  const analyze = (day: string) => {
    setActiveAgent("ejecutiva");
    void startChat(`Analiza los reportes del ${day} con listar_reportes y ayúdame a tomar decisiones: resume lo importante, señala riesgos y dame opciones con pros y contras.`);
  };

  const groups = reports.reduce<Record<string, typeof reports>>((acc, r) => {
    (acc[r.report_date] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="chat-scroll flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><BarChart3 className="h-6 w-6 text-primary" /> Reportes</h1>
          <p className="text-sm text-muted-foreground">Mimi Ejecutiva organiza los reportes por día y te ayuda a decidir. La decisión siempre es tuya.</p>
        </div>

        {requests.length > 0 && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><BellRing className="h-4 w-4" /> Reportes pedidos</p>
            <ul className="space-y-2">
              {requests.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{q.title}{q.message ? ` — ${q.message}` : ""}</span>
                  <Button size="sm" variant="outline" onClick={() => { setRequestId(q.id); setTitle(q.title); fileRef.current?.click(); }}>
                    <Upload className="mr-1 h-4 w-4" /> Subir
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <p className="font-medium">Subir reporte</p>
            <Input placeholder="Título (ej. Ventas del día)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex gap-2">
              <select className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <Input type="date" className="flex-1" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <input ref={fileRef} type="file" hidden accept={ALLOWED_FILE_ACCEPT} onChange={(e) => upload(e.target.files?.[0])} />
            <Button className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Elegir archivo
            </Button>
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <p className="font-medium">Pedir un reporte</p>
            <p className="text-xs text-muted-foreground">Avisa a gerentes y administradores en la web y en la app.</p>
            <Input placeholder="Ej. Reporte de ventas de hoy" value={askTitle} onChange={(e) => setAskTitle(e.target.value)} />
            <Button variant="outline" className="w-full" onClick={ask}><BellRing className="mr-2 h-4 w-4" /> Enviar aviso</Button>
          </div>
        </div>

        {Object.keys(groups).length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay reportes.</p>
        ) : (
          Object.entries(groups).map(([day, items]) => (
            <section key={day} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold capitalize text-muted-foreground">{dayLabel(day)}</h2>
                <Button size="sm" variant="ghost" className="text-primary" onClick={() => analyze(day)}>
                  <Sparkles className="mr-1 h-4 w-4" /> Analizar con Mimi Ejecutiva
                </Button>
              </div>
              {items.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs text-primary">{r.category}</span>
                  <p className="min-w-0 flex-1 truncate text-sm">{r.title}</p>
                  <Button size="icon" variant="ghost" aria-label="Abrir" onClick={() => open(r.storage_path)}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => remove(r.id, r.storage_path)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
