import { useCallback, useEffect, useRef, useState } from "react";

export type LiveState = {
  status: "idle" | "listening" | "processing" | "speaking" | "closed";
  error: string | null;
  muted: boolean;
};

/** Tiempo de silencio que marca el fin de tu turno (como una llamada real). */
const END_OF_TURN_MS = 900;

/**
 * Llamada de voz continua tipo ChatGPT/Gemini:
 * - El micrófono queda abierto toda la llamada (no hay que tocar nada entre turnos).
 * - Si hablas mientras Mimi habla o piensa, se calla al instante y te escucha.
 * - Tu turno termina cuando haces una pausa natural.
 */
export function useLiveVoice({
  onUserSpeech,
  reply,
  busy,
  onSpeakStart,
}: {
  onSpeakStart?: (() => void) | undefined;
  onUserSpeech?: ((text: string) => void) | undefined;
  reply?: { id: string; text: string } | null | undefined;
  busy?: boolean | undefined;
  onEvent?: ((event: any) => void) | undefined;
}) {
  const [state, setState] = useState<LiveState>({ status: "idle", error: null, muted: false });
  const audioRef = useRef<HTMLAudioElement>(null);

  const recognitionRef = useRef<any>(null);
  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const statusRef = useRef<LiveState["status"]>("idle");
  const finalText = useRef("");
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReplyId = useRef<string | null>(null);
  const ignoreNextReply = useRef(false);
  const ttsAbort = useRef<AbortController | null>(null);
  const speakingText = useRef("");

  const cb = useRef({ onUserSpeech, onSpeakStart });
  cb.current = { onUserSpeech, onSpeakStart };

  const setStatus = useCallback((status: LiveState["status"], error: string | null = null) => {
    statusRef.current = status;
    setState((s) => ({ ...s, status, error }));
  }, []);

  const stopAudio = useCallback(() => {
    ttsAbort.current?.abort();
    ttsAbort.current = null;
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onplaying = null;
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  /** El usuario habló encima de Mimi: callarse y escuchar. */
  const bargeIn = useCallback(() => {
    const st = statusRef.current;
    if (st === "speaking") {
      stopAudio();
      cb.current.onSpeakStart?.(); // muestra el texto en el chat
      setStatus("listening");
    } else if (st === "processing") {
      ignoreNextReply.current = true; // no leer la respuesta vieja
      setStatus("listening");
    }
  }, [setStatus, stopAudio]);

  const flushTurn = useCallback(() => {
    turnTimer.current = null;
    const text = finalText.current.trim();
    finalText.current = "";
    if (!text || !activeRef.current) return;
    ignoreNextReply.current = false;
    setStatus("processing");
    cb.current.onUserSpeech?.(text);
  }, [setStatus]);

  const isEcho = (heard: string) => {
    // Evita que la propia voz de Mimi (por el altavoz) la interrumpa.
    const h = heard.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").trim();
    if (h.length < 4) return true;
    return speakingText.current.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").includes(h);
  };

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setStatus("idle", "Tu navegador no permite llamadas de voz. Usa Chrome.");
      activeRef.current = false;
      return;
    }
    const rec = new SR();
    rec.lang = "es-DO";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      if (mutedRef.current) return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r[0].transcript as string;
        if (r.isFinal) {
          if (statusRef.current === "speaking" && isEcho(t)) continue;
          finalText.current += " " + t;
        } else interim += t;
      }
      const heard = (interim || finalText.current).trim();
      if (!heard) return;
      if (statusRef.current === "speaking" && isEcho(heard)) return;

      bargeIn();
      if (statusRef.current !== "processing") setStatus("listening");
      if (turnTimer.current) clearTimeout(turnTimer.current);
      turnTimer.current = setTimeout(flushTurn, END_OF_TURN_MS);
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        activeRef.current = false;
        setStatus("idle", "Permite el micrófono para hablar con Mimi.");
      }
    };

    // El navegador corta el reconocimiento cada cierto tiempo: lo reabrimos.
    rec.onend = () => {
      if (activeRef.current && recognitionRef.current === rec) {
        try { rec.start(); } catch { setTimeout(() => activeRef.current && startRecognition(), 300); }
      }
    };

    recognitionRef.current = rec;
    try { rec.start(); } catch { /* ya iniciado */ }
  }, [bargeIn, flushTurn, setStatus]);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    // Desbloquear audio con el gesto del usuario
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    lastReplyId.current = reply?.id ?? null; // no leer respuestas anteriores a la llamada
    setStatus("listening");
    startRecognition();
  }, [reply?.id, setStatus, startRecognition]);

  const finishSpeaking = useCallback(() => {
    speakingText.current = "";
    if (statusRef.current === "speaking") setStatus(activeRef.current ? "listening" : "idle");
  }, [setStatus]);

  const speak = useCallback((text: string) => {
    stopAudio();
    speakingText.current = text;
    setStatus("speaking");
    const ctrl = new AbortController();
    ttsAbort.current = ctrl;

    const fallback = () => {
      if (ctrl.signal.aborted || !("speechSynthesis" in window)) return finishSpeaking();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-ES";
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x) => x.lang.startsWith("es") && /Google|Natural|Premium/.test(x.name)) ?? voices.find((x) => x.lang.startsWith("es"));
      if (v) u.voice = v;
      u.onstart = () => cb.current.onSpeakStart?.();
      u.onend = finishSpeaking;
      u.onerror = finishSpeaking;
      window.speechSynthesis.speak(u);
    };

    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("tts");
        const url = URL.createObjectURL(await res.blob());
        const a = audioRef.current;
        if (!a || ctrl.signal.aborted) return;
        a.src = url;
        a.onplaying = () => cb.current.onSpeakStart?.();
        a.onended = () => { URL.revokeObjectURL(url); finishSpeaking(); };
        await a.play();
      })
      .catch((e) => {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        fallback();
      });
  }, [finishSpeaking, setStatus, stopAudio]);

  // Cuando llega la respuesta de Mimi, hablarla (salvo que la hayas interrumpido).
  useEffect(() => {
    if (!activeRef.current || busy || !reply || reply.id === lastReplyId.current) return;
    lastReplyId.current = reply.id;
    if (ignoreNextReply.current) {
      ignoreNextReply.current = false;
      cb.current.onSpeakStart?.();
      return;
    }
    if (state.muted) {
      cb.current.onSpeakStart?.();
      setStatus("listening");
      return;
    }
    speak(reply.text);
  }, [busy, reply, speak, setStatus, state.muted]);

  // Si terminó de pensar sin respuesta (error), volver a escuchar.
  useEffect(() => {
    if (!busy && activeRef.current && statusRef.current === "processing") {
      const t = setTimeout(() => {
        if (statusRef.current === "processing") setStatus("listening");
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [busy, setStatus]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (turnTimer.current) clearTimeout(turnTimer.current);
    finalText.current = "";
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try { rec?.abort(); } catch { /* noop */ }
    stopAudio();
    cb.current.onSpeakStart?.();
    setStatus("closed");
  }, [setStatus, stopAudio]);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    if (muted) finalText.current = "";
    setState((s) => ({ ...s, muted }));
  }, []);

  useEffect(() => () => {
    activeRef.current = false;
    try { recognitionRef.current?.abort(); } catch { /* noop */ }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return { ...state, audioRef, start, stop, setMuted };
}
