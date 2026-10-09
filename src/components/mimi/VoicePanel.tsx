import { useEffect, useRef, useState } from "react";
import { Mic, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import mimiAvatar from "@/assets/mimi-avatar.png.asset.json";

export interface VoiceTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface VoicePanelProps {
  /** El usuario terminó de hablar: enviar como mensaje al chat. */
  onUserSpeech: (text: string) => void;
  /** Última respuesta terminada de Mimi para leerla en voz alta. */
  reply: { id: string; text: string } | null;
  busy: boolean;
  onClose: () => void;
}

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function clean(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[(\d+)\]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#>`|~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function VoicePanel({ onUserSpeech, reply, busy, onClose }: VoicePanelProps) {
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const spokenId = useRef<string | null>(reply?.id ?? null);
  const activeRef = useRef(false);
  activeRef.current = active;

  const listen = () => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
    if (!Ctor) {
      setError("Tu navegador no permite dictado por voz. Usa Chrome.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "es-DO";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setCaption(finalText + interim);
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") setError("No pude usar el micrófono.");
    };
    rec.onend = () => {
      setListening(false);
      const text = finalText.trim();
      setCaption("");
      if (text) onUserSpeech(text);
      else if (activeRef.current) setTimeout(() => activeRef.current && listen(), 300);
    };
    recRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  };

  // Leer la respuesta de Mimi y volver a escuchar.
  useEffect(() => {
    if (!active || busy || !reply || reply.id === spokenId.current) return;
    spokenId.current = reply.id;
    const text = clean(reply.text);
    if (!text) return listen();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES";
    const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("es"));
    const fem = voices.find((v) => /female|mujer|paulina|monica|helena|sabina|google español/i.test(v.name));
    if (fem ?? voices[0]) u.voice = (fem ?? voices[0])!;
    u.onend = () => {
      setSpeaking(false);
      if (activeRef.current) listen();
    };
    setSpeaking(true);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reply, busy, active]);

  useEffect(() => () => {
    recRef.current?.stop();
    speechSynthesis.cancel();
  }, []);

  const start = () => {
    spokenId.current = reply?.id ?? null;
    setActive(true);
    listen();
  };
  const hangUp = () => {
    setActive(false);
    recRef.current?.stop();
    speechSynthesis.cancel();
    setSpeaking(false);
    setListening(false);
  };

  const status = error
    ? error
    : !active
      ? "Toca “Hablar” para empezar"
      : listening
        ? caption || "Te escucho…"
        : busy
          ? "Mimi está pensando…"
          : speaking
            ? "Mimi está hablando…"
            : "En llamada con Mimi";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-card/80 px-3 py-2.5 sm:px-4">
      <div className="relative shrink-0">
        <img src={mimiAvatar.url} alt="Mimi" className="h-10 w-10 rounded-full object-cover" />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
            active ? "animate-pulse bg-online" : "bg-muted-foreground",
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Voz con Mimi</p>
        <p className="truncate text-xs text-muted-foreground" role="status">
          {status}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {!active ? (
          <>
            <Button size="sm" className="rounded-full" onClick={start}>
              <Mic className="h-4 w-4" /> Hablar
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={onClose}>
              Cerrar
            </Button>
          </>
        ) : (
          <Button size="sm" variant="destructive" className="rounded-full" onClick={hangUp}>
            <PhoneOff className="h-4 w-4" /> Colgar
          </Button>
        )}
      </div>
    </div>
  );
}
