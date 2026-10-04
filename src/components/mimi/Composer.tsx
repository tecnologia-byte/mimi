import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Globe, Mic, Plus, SendHorizontal, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ComposerHandle {
  focus: () => void;
  submitText: (text: string) => void;
}

interface ComposerProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy?: boolean;
  large?: boolean;
  placeholder?: string;
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { onSend, onStop, busy, large, placeholder = "Escribe tu mensaje a Mimi..." },
  ref,
) {
  const [value, setValue] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    submitText: (text: string) => {
      const trimmed = text.trim();
      if (trimmed) onSend(trimmed);
    },
  }));

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
  };

  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card shadow-lg transition-colors focus-within:border-primary/50",
        large ? "p-4" : "p-3",
      )}
    >
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
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Adjuntar archivo" title="Adjuntar archivo (próximamente)">
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", webSearch && "bg-accent text-primary")}
          aria-label="Búsqueda web"
          title="Búsqueda web"
          onClick={() => setWebSearch(!webSearch)}
        >
          <Globe className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Dictado por voz" title="Dictado por voz (próximamente)">
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
            disabled={!value.trim()}
            aria-label="Enviar mensaje"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
