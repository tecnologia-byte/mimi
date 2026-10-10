import { useCallback, useEffect, useRef, useState } from "react";

export type LiveState = {
  status: "idle" | "listening" | "processing" | "speaking" | "closed";
  error: string | null;
  muted: boolean;
};

export function useLiveVoice({
  onUserSpeech,
  reply,
  busy
}: {
  onUserSpeech?: (text: string) => void;
  reply?: { id: string; text: string } | null;
  busy?: boolean;
  onEvent?: (event: any) => void;
}) {
  const [state, setState] = useState<LiveState>({ status: "idle", error: null, muted: false });
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastReplyId = useRef<string | null>(null);

  // Helper para detener cualquier TTS actual
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    // Si hay una nueva respuesta y no estamos procesando
    if (reply && reply.id !== lastReplyId.current && !busy) {
      lastReplyId.current = reply.id;
      
      stopAudio();
      setState(s => ({ ...s, status: "speaking" }));

      // Intentar reproducir usando el endpoint TTS robusto de ElevenLabs
      if (audioRef.current) {
        const textToSpeak = reply.text;
        
        fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textToSpeak })
        })
        .then(async (response) => {
          if (!response.ok) throw new Error("TTS API Error");
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.onended = () => {
              setState(s => s.status === "speaking" ? { ...s, status: "idle" } : s);
            };
            audioRef.current.play().catch(e => {
              console.error("Audio play blocked", e);
              setState(s => s.status === "speaking" ? { ...s, status: "idle" } : s);
            });
          }
        })
        .catch((e) => {
          console.warn("Fallback to window.speechSynthesis", e);
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = "es-DO";
            utterance.onend = () => {
              setState(s => s.status === "speaking" ? { ...s, status: "idle" } : s);
            };
            window.speechSynthesis.speak(utterance);
          } else {
            setState(s => s.status === "speaking" ? { ...s, status: "idle" } : s);
          }
        });
      }
    }
  }, [reply, busy, stopAudio]);

  useEffect(() => {
    if (busy) {
      setState(s => ({ ...s, status: "processing" }));
    } else if (state.status === "processing") {
      setState(s => ({ ...s, status: "idle" }));
    }
  }, [busy, state.status]);

  const start = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState(s => ({ ...s, status: "idle", error: "Reconocimiento de voz no soportado en tu navegador." }));
      return;
    }
    
    stopAudio();

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch(e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-DO';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState(s => ({ ...s, status: "listening", error: null }));
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (text.trim() && onUserSpeech) {
        onUserSpeech(text);
        setState(s => ({ ...s, status: "processing", error: null }));
      } else {
        setState(s => ({ ...s, status: "idle" }));
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
         setState(s => ({ ...s, status: "idle", error: "Error de conexión de voz. Intenta de nuevo." }));
      } else {
         setState(s => ({ ...s, status: "idle" }));
      }
    };

    recognition.onend = () => {
      setState(s => s.status === "listening" ? { ...s, status: "idle" } : s);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Speech recognition start error", e);
    }
  }, [onUserSpeech, stopAudio]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    stopAudio();
    setState(s => ({ ...s, status: "closed", error: null }));
  }, [stopAudio]);

  const setMuted = useCallback((muted: boolean) => {
    setState(s => ({ ...s, muted }));
    if (muted) stopAudio();
  }, [stopAudio]);

  return { ...state, audioRef, start, stop, setMuted };
}
