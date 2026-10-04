import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { cn } from "@/lib/utils";
import mimiAvatar from "@/assets/mimi-avatar.png.asset.json";

export interface VoiceTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface VoicePanelProps {
  /** Live caption updates for the turn currently being spoken. */
  onTurnUpdate: (turn: VoiceTurn) => void;
  /** A turn is complete (speaker changed or call ended) — persist it. */
  onTurnComplete: (turn: VoiceTurn) => void;
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "Toca “Hablar” para empezar",
  connecting: "Conectando…",
  connected: "En llamada con Mimi",
  stopping: "Terminando…",
  closed: "Llamada terminada",
};

export function VoicePanel({ onTurnUpdate, onTurnComplete, onClose }: VoicePanelProps) {
  const [token, setToken] = useState<string | null>(null);
  const current = useRef<VoiceTurn | null>(null);
  const cbs = useRef({ onTurnUpdate, onTurnComplete });
  cbs.current = { onTurnUpdate, onTurnComplete };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setToken(session?.access_token ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const flush = () => {
    const turn = current.current;
    current.current = null;
    if (turn && turn.text.trim()) cbs.current.onTurnComplete({ ...turn, text: turn.text.trim() });
  };

  const handleEvent = (event: LiveEvent) => {
    if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
      const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
      const delta = typeof event["delta"] === "string" ? (event["delta"] as string) : "";
      if (!delta) return;
      if (current.current && current.current.role !== role) flush();
      if (!current.current) current.current = { id: `voice_${crypto.randomUUID()}`, role, text: "" };
      current.current.text += delta;
      cbs.current.onTurnUpdate({ ...current.current });
    } else if (event.type === "app.closed" || event.type === "app.stopping") {
      flush();
    }
  };

  const voice = useLiveVoice({
    url: token ? `/api/live?token=${encodeURIComponent(token)}` : "/api/live",
    onEvent: handleEvent,
  });

  const canStart = voice.status === "idle" || voice.status === "closed";
  const live = voice.status === "connected";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-card/80 px-3 py-2.5 sm:px-4">
      <audio ref={voice.audioRef} className="hidden" />
      <div className="relative shrink-0">
        <img src={mimiAvatar.url} alt="Mimi" className="h-10 w-10 rounded-full object-cover" />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
            live ? "animate-pulse bg-online" : "bg-muted-foreground",
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Voz en vivo</p>
        <p className="truncate text-xs text-muted-foreground" role="status">
          {voice.error ?? STATUS_LABEL[voice.status]}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {voice.playbackBlocked && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={voice.resumePlayback}>
            <Volume2 className="h-4 w-4" /> Escuchar
          </Button>
        )}
        {canStart ? (
          <>
            <Button size="sm" className="rounded-full" onClick={voice.start} disabled={!token}>
              <Mic className="h-4 w-4" /> Hablar
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={onClose}>
              Cerrar
            </Button>
          </>
        ) : (
          <>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full"
              disabled={!live}
              onClick={() => voice.setMuted(!voice.muted)}
              aria-label={voice.muted ? "Activar micrófono" : "Silenciar micrófono"}
            >
              {voice.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full"
              onClick={voice.stop}
              disabled={voice.status === "stopping"}
            >
              <PhoneOff className="h-4 w-4" /> Colgar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
