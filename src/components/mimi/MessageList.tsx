import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, ExternalLink, FileSpreadsheet, FileText, Globe, Loader2, Paperclip, RefreshCw, Star, ThumbsDown, ThumbsUp, Users } from "lucide-react";
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

interface SourceItem {
  url: string;
  title: string;
  hostname: string;
}

function safeGetHostname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "enlace";
  }
}

function SourceFavicon({ hostname }: { hostname: string }) {
  const [error, setError] = useState(false);

  if (error || !hostname || hostname === "enlace") {
    return <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
      alt=""
      className="h-3.5 w-3.5 shrink-0 rounded-xs object-contain"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

function cleanMarkdownText(raw: string): string {
  let cleaned = raw.replace(/<!--sources:[\s\S]*?-->/g, "");
  // Remueve bloques de "Fuentes consultadas" o "Referencias" escritas directamente en el texto
  cleaned = cleaned.replace(
    /(?:^|\n+)(?:[#*_\s]*)(?:Fuentes(?: consultadas)?|Referencias|Enlaces consultados)(?:[#*_\s:]*)\n+(?:(?:\s*[-*•]|\s*\d+\.)\s*(?:\[[^\]]+\]\([^)]+\)|https?:\/\/\S+|[^\n]+)\n*)+/gi,
    "\n\n"
  );
  return cleaned.trim();
}

function extractSources(message: UIMessage): SourceItem[] {
  const sources: SourceItem[] = [];
  const seen = new Set<string>();

  // 1. Extraer fuentes del token de búsqueda web si está presente en el texto
  const text = messageText(message);
  const tokenMatch = text.match(/<!--sources:([\s\S]*?)-->/);
  if (tokenMatch?.[1]) {
    try {
      const parsed = JSON.parse(tokenMatch[1]) as Array<{ title?: string; url?: string }>;
      for (const item of parsed) {
        if (item.url && !seen.has(item.url)) {
          seen.add(item.url);
          const host = safeGetHostname(item.url);
          sources.push({
            url: item.url,
            title: item.title?.trim() || host,
            hostname: host,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Partes estructuradas de fuente provenientes del backend
  for (const part of message.parts ?? []) {
    if (
      part.type === "source-url" ||
      part.type === "source" ||
      ("url" in part && typeof (part as { url?: unknown }).url === "string")
    ) {
      const p = part as { url?: string; title?: string };
      if (p.url && !seen.has(p.url)) {
        seen.add(p.url);
        const host = safeGetHostname(p.url);
        sources.push({
          url: p.url,
          title: p.title?.trim() || host,
          hostname: host,
        });
      }
    }
  }

  // 3. Extracción de respaldo desde el texto markdown (ej. [Fuente](https://...))
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdLinkRegex.exec(text)) !== null) {
    const rawTitle = match[1].trim();
    const rawUrl = match[2].trim();
    if (rawUrl.startsWith("http") && !seen.has(rawUrl)) {
      seen.add(rawUrl);
      const host = safeGetHostname(rawUrl);
      sources.push({
        url: rawUrl,
        title: rawTitle && !/^\d+$/.test(rawTitle) ? rawTitle : host,
        hostname: host,
      });
    }
  }

  return sources;
}

function MessageSources({ sources }: { sources: SourceItem[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border/50 pt-3">
      <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-foreground/85">
        <Globe className="h-3.5 w-3.5 text-primary" />
        <span>Fuentes consultadas</span>
        <span className="text-[11px] font-normal text-muted-foreground">({sources.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Abrir fuente: ${source.title}\n${source.url}`}
            className="group flex max-w-[280px] items-center gap-2.5 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs text-foreground shadow-xs transition-all hover:border-primary/60 hover:bg-accent/80 hover:shadow-sm"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted/80 p-1 group-hover:bg-background transition-colors">
              <SourceFavicon hostname={source.hostname} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-semibold leading-tight text-foreground group-hover:text-primary">
                {source.title}
              </span>
              <span className="truncate text-[11px] text-muted-foreground leading-tight">
                {source.hostname}
              </span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100 group-hover:text-primary" />
          </a>
        ))}
      </div>
    </div>
  );
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
              <div className="prose-sm max-w-none text-[15px] leading-relaxed text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mt-5 [&_h1]:mb-3 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:mb-2.5 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mt-3.5 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_li]:my-1.5 [&_li]:leading-relaxed [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p]:mb-3.5 [&_p]:leading-relaxed [&_pre]:my-3.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_table]:my-3.5 [&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2.5 [&_th]:py-1.5 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 font-medium text-primary underline underline-offset-2 hover:opacity-80"
                        {...props}
                      >
                        {children}
                        <ExternalLink className="inline h-3 w-3 ml-0.5 opacity-60" />
                      </a>
                    ),
                  }}
                >
                  {cleanMarkdownText(text)}
                </ReactMarkdown>
              </div>
              <MessageSources sources={extractSources(message)} />
              {text && (
                <div className="mt-2 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(cleanMarkdownText(text))} aria-label="Copiar">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {message.id === lastAssistantId && !busy && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRegenerate} aria-label="Regenerar">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Descargar Word" title="Descargar como Word" onClick={() => void exportWord(cleanMarkdownText(text))}>
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Descargar Excel" title="Descargar como Excel" onClick={() => void exportExcel(cleanMarkdownText(text))}>
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Útil">
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="No útil">
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Guardar en Favoritos" title="Guardar en Favoritos" onClick={() => void saveFavorite(cleanMarkdownText(text))}>
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
