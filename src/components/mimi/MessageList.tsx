import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, FileSpreadsheet, FileText, Loader2, Paperclip, RefreshCw, Star, ThumbsDown, ThumbsUp, Users } from "lucide-react";
import { agentName } from "@/lib/agents";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { exportExcel, exportWord } from "@/lib/office";
import { supabase } from "@/integrations/supabase/client";
import mimiAvatar from "@/assets/mimi-avatar.png.asset.json";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

interface MessageListProps {
  messages: UIMessage[];
  busy: boolean;
  onRegenerate: () => void;
}

export function MessageList({ messages, busy, onRegenerate }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const saveFavorite = async (text: string) => {
    const threadId = window.location.pathname.match(/\/chat\/([\w-]+)/)?.[1] ?? null;
    const { error } = await supabase.from("favorites").insert({ content: text, thread_id: threadId });
    if (error) toast.error("No se pudo guardar en Favoritos");
    else toast.success("Guardado en Favoritos");
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div className="chat-scroll mx-auto w-full max-w-3xl flex-1 space-y-8 overflow-y-auto px-4 py-8">
      {messages.map((message) => {
        const text = messageText(message);
        if (message.role === "user") {
          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                {text.split("\n\n--- Documento:")[0]}
                {message.parts.some((p) => p.type === "file") || text.includes("--- Documento:") ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.parts.map((p, i) =>
                      p.type === "file" ? (
                        <span key={i} className="flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-xs">
                          <Paperclip className="h-3 w-3" /> {p.filename ?? "archivo"}
                        </span>
                      ) : null,
                    )}
                    {[...text.matchAll(/--- Documento: (.+?) ---/g)].map((m, i) => (
                      <span key={`d${i}`} className="flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-xs">
                        <Paperclip className="h-3 w-3" /> {m[1]}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        }
        return (
          <div key={message.id} className="flex gap-3">
            <img
              src={mimiAvatar.url}
              alt="Mimi"
              className="h-9 w-9 shrink-0 rounded-full border border-border object-cover object-top"
            />
            <div className="min-w-0 flex-1">
              {message.parts.map((p, i) => {
                if (p.type !== "tool-consultar_agente") return null;
                const tp = p as { input?: { agente?: string; tarea?: string }; output?: { respuesta?: string }; state?: string };
                const name = agentName(tp.input?.agente ?? "");
                const done = Boolean(tp.output);
                return (
                  <details key={i} open={!done} className="group mb-2 rounded-xl border border-primary/30 bg-accent/40 px-3 py-2 text-xs">
                    <summary className="flex cursor-pointer items-center gap-2 font-medium text-accent-foreground">
                      {done ? (
                        <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                      )}
                      {done
                        ? `${name} respondió · toca para ver qué hizo`
                        : `Ok, déjame comunicarme con ${name}, un momento…`}
                    </summary>
                    <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
                      <p className="font-semibold text-primary">{name}</p>
                      {tp.input?.tarea && (
                        <p className="text-muted-foreground"><b>Tarea que le di:</b> {tp.input.tarea}</p>
                      )}
                      {done && <p className="font-medium text-muted-foreground">Lo que hizo:</p>}
                      {done ? (
                        <div className="text-foreground [&_h1]:mb-1 [&_h1]:text-sm [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1 [&_table]:my-2 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-0.5 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-0.5 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{tp.output?.respuesta ?? ""}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> {name} está trabajando en esto…
                        </p>
                      )}
                    </div>
                  </details>
                );
              })}
              <div className="prose-sm max-w-none text-sm leading-relaxed text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3 [&_table]:my-3 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
              {(() => {
                const sources = message.parts.filter(
                  (p): p is { type: "source-url"; sourceId: string; url: string; title?: string } => p.type === "source-url",
                );
                const seen = new Set<string>();
                const unique = sources.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
                return unique.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {unique.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex max-w-[220px] items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${new URL(s.url).hostname}&sz=32`}
                          alt=""
                          className="h-3.5 w-3.5 shrink-0 rounded-sm"
                          loading="lazy"
                        />
                        <span className="truncate">{s.title || new URL(s.url).hostname}</span>
                      </a>
                    ))}
                  </div>
                ) : null;
              })()}
              {text && (
                <div className="mt-2 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(text)} aria-label="Copiar">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {message.id === lastAssistantId && !busy && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRegenerate} aria-label="Regenerar">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Descargar Word" title="Descargar como Word" onClick={() => void exportWord(text)}>
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Descargar Excel" title="Descargar como Excel" onClick={() => void exportExcel(text)}>
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Útil">
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="No útil">
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Guardar en Favoritos" title="Guardar en Favoritos" onClick={() => void saveFavorite(text)}>
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {busy && (
        <div className="flex gap-3">
          <img
            src={mimiAvatar.url}
            alt="Mimi"
            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover object-top"
          />
          <div className="flex items-center gap-1.5 pt-3">
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
