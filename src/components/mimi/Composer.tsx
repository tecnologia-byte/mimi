import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, ChevronDown, File, Globe, Lock, Mic, Plus, Square, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ALLOWED_FILE_ACCEPT, isCodeFile } from "@/lib/files";
import { AGENTS, getActiveAgent, setActiveAgent, type AgentId } from "@/lib/agents";
import { fetchMyAgentAccess, myAgentAccessKey } from "@/lib/roles";

export interface ComposerHandle {
  focus: () => void;
  fillAndSubmit: (text: string, files?: File[], webSearch?: boolean) => void;
}

interface ComposerProps {
  onSend: (text: string, opts: { webSearch: boolean; files: File[] }) => void;
  allowAttach?: boolean;
  onStop?: () => void;
  busy?: boolean;
  large?: boolean;
  placeholder?: string;
  onVoice?: () => void;
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { onSend, onStop, busy, large, placeholder = "Escribe tu mensaje a Mimi...", onVoice, allowAttach = true },
  ref,
) {
  const [value, setValue] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const imagePreviews = useMemo(
    () => new Map(files.filter((file) => file.type.startsWith("image/")).map((file) => [file, URL.createObjectURL(file)])),
    [files],
  );

  useEffect(
    () => () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    },
    [imagePreviews],
  );

  // Versiones de Mimi (agentes) + Milt. Las especialistas son privadas.
  const MIMI_MODELS = AGENTS;
  const navigate = useNavigate();
  const { data: allowedAgents = ["mimi"] } = useQuery({ queryKey: myAgentAccessKey, queryFn: fetchMyAgentAccess });
  const [agentId, setAgentId] = useState<AgentId>("mimi");
  useEffect(() => {
    const sync = () => setAgentId(getActiveAgent());
    sync();
    window.addEventListener("mimi-agent", sync);
    return () => window.removeEventListener("mimi-agent", sync);
  }, []);
  // Si perdió el acceso, vuelve a Mimi general.
  useEffect(() => {
    if (agentId !== "mimi" && allowedAgents.length > 0 && !allowedAgents.includes(agentId)) setActiveAgent("mimi");
  }, [agentId, allowedAgents]);
  const activeModel = AGENTS.find((a) => a.id === agentId) ?? AGENTS[0]!;

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    // Sends the text straight through onSend. Clicking the real send button
    // raced with the disabled state and silently did nothing.
    fillAndSubmit: (text: string, pendingFiles = [], pendingWebSearch = false) => {
      setValue("");
      onSend(text || "Analiza estos archivos.", { webSearch: pendingWebSearch, files: pendingFiles });
    },
  }));

  const submit = () => {
    const text = value.trim();
    if ((!text && files.length === 0) || busy) return;
    onSend(text || "Analiza este documento.", { webSearch, files });
    setValue("");
    setFiles([]);
  };

  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card shadow-lg transition-colors focus-within:border-primary/50",
        large ? "p-4" : "p-3",
      )}
    >
      {files.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {files.map((f, i) => (
            <div key={`${f.name}-${f.lastModified}-${i}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-accent">
              {imagePreviews.get(f) ? (
                <img src={imagePreviews.get(f)} alt={`Vista previa de ${f.name}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-1.5 text-center text-accent-foreground">
                  <File className="h-6 w-6" />
                  <span className="w-full truncate text-[10px]">{f.name}</span>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-1 top-1 h-6 w-6 rounded-full shadow-sm"
                aria-label={`Quitar ${f.name}`}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        accept={ALLOWED_FILE_ACCEPT}
        onChange={(e) => {
          const all = Array.from(e.target.files ?? []);
          if (all.some(isCodeFile)) toast.error("Mimi no acepta archivos de código. Sube documentos, imágenes u hojas de cálculo.");
          const picked = all.filter((f) => !isCodeFile(f) && f.size <= 20 * 1024 * 1024);
          setFiles((prev) => [...prev, ...picked].slice(0, 5));
          e.target.value = "";
        }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        rows={large ? 3 : 2}
        className="w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <div className="mt-2 flex items-center gap-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setModelMenuOpen((o) => !o)}
            className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
            aria-label="Elegir modelo de Mimi"
            title="Elegir modelo de Mimi"
          >
            {activeModel.name}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", modelMenuOpen && "rotate-180")} />
          </button>
          {modelMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setModelMenuOpen(false)} />
              <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-2xl border border-border bg-popover p-1.5 shadow-xl">
                <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Modelos de Mimi
                </p>
                {MIMI_MODELS.map((m) => {
                  const locked = !allowedAgents.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModelMenuOpen(false);
                        if (locked) {
                          toast.info(`${m.name} es privada. Solicita acceso.`);
                          navigate({ to: "/solicitar-acceso" });
                          return;
                        }
                        setActiveAgent(m.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-popover-foreground hover:bg-accent"
                    >
                      <span className={cn("flex-1", locked && "opacity-60")}>
                        <span className="block font-medium">{m.name}</span>
                        <span className="block text-xs text-muted-foreground">{locked ? "Privada · solicitar acceso" : m.tag}</span>
                      </span>
                      {locked ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        m.id === activeModel.id && <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Adjuntar archivo"
          title={allowAttach ? "Adjuntar PDF, Word, Excel, imagen o texto" : "Abre un chat para adjuntar archivos"}
          disabled={!allowAttach}
          onClick={() => fileRef.current?.click()}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", webSearch && "bg-accent text-primary")}
          aria-label="Búsqueda web"
          title={webSearch ? "Búsqueda web activada" : "Activar búsqueda web"}
          onClick={() => setWebSearch(!webSearch)}
        >
          <Globe className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Hablar con Mimi"
          title="Hablar con Mimi por voz"
          onClick={onVoice}
          disabled={!onVoice}
        >
          <Mic className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        {busy ? (
          <Button size="icon" className="rounded-full" onClick={onStop} aria-label="Detener generación">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="rounded-full"
            onClick={submit}
            disabled={!value.trim() && files.length === 0}
            aria-label="Enviar mensaje"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
