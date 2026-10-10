import { useEffect, useState } from "react";
import { Mic, PhoneOff, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import mimiAvatar from "@/assets/mimi-avatar.png.asset.json";
import { useLiveVoice } from "@/hooks/use-live-voice";

export interface VoiceTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface VoicePanelProps {
  /** Callback opcional para notificar al padre sobre el estado de la llamada. */
  onCallStateChange?: (active: boolean) => void;
  onClose: () => void;
  // Props heredadas (ya no se usan internamente, se mantienen por compatibilidad de firma)
  onUserSpeech?: (text: string) => void;
  reply?: { id: string; text: string } | null;
  busy?: boolean;
}

export function VoicePanel({ onCallStateChange, onClose }: VoicePanelProps) {
  const { status, error, audioRef, start, stop, setMuted, muted } = useLiveVoice({
    onEvent: (e) => {
      // Aquí se podrían manejar eventos de la conexión WebRTC si se necesita
    }
  });

  const active = status !== "idle" && status !== "closed";

  useEffect(() => {
    if (onCallStateChange) {
      onCallStateChange(active);
    }
  }, [active, onCallStateChange]);

  const handleStart = () => {
    start();
  };

  const handleHangUp = () => {
    stop();
  };

  const displayStatus = error
    ? error
    : status === "idle" || status === "closed"
      ? "Toca “Hablar” para empezar"
      : status === "connecting"
        ? "Conectando llamada..."
        : status === "connected"
          ? "Llamada de voz en curso..."
          : "En llamada con Mimi";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-card/80 px-3 py-2.5 sm:px-4">
      <audio ref={audioRef} hidden autoPlay />
      <div className="relative shrink-0">
        <img src={mimiAvatar.url} alt="Mimi" className="h-10 w-10 rounded-full object-cover" />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
            status === "connected" ? "animate-pulse bg-online" : "bg-muted-foreground",
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Voz con Mimi</p>
        <p className="truncate text-xs text-muted-foreground" role="status">
          {displayStatus}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {!active ? (
          <>
            <Button size="sm" className="rounded-full" onClick={handleStart}>
              <Mic className="h-4 w-4" /> Hablar
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={onClose}>
              Cerrar
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setMuted(!muted)}>
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} {muted ? "Silenciado" : "Silenciar"}
            </Button>
            <Button size="sm" variant="destructive" className="rounded-full" onClick={handleHangUp}>
              <PhoneOff className="h-4 w-4" /> Colgar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
