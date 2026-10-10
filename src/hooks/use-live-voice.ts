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
  const shouldContinue = useRef<boolean>(false);

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

  const start = useCallback(() => {
    shouldContinue.current = true;

    // Desbloquear audio en el navegador (requiere gesto del usuario)
    if (audioRef.current) {
      audioRef.current.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU5LjI3LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIAD+//7+////+/////v///////8AAAAATGF2YzU5LjM3AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//OUAAAAAAAAAAAAAAAAAAAAAAAWAAAAAA";
      audioRef.current.play().catch(() => {});
    }
    if ('speechSynthesis' in window) {
      const unlock = new SpeechSynthesisUtterance("");
      unlock.volume = 0;
      window.speechSynthesis.speak(unlock);
    }

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
    recognition.lang = 'es-ES'; // Usar un locale más universal
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
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
         setState(s => ({ ...s, status: "idle", error: "Error de conexión de voz. Intenta de nuevo." }));
         shouldContinue.current = false;
      } else {
         // Silencio, reiniciar inmediatamente si debe continuar
         if (shouldContinue.current && state.status !== 'processing' && state.status !== 'speaking') {
           try { recognitionRef.current?.start(); } catch(e) {}
         } else {
           setState(s => ({ ...s, status: "idle" }));
         }
      }
    };

    recognition.onend = () => {
      if (shouldContinue.current) {
        setState(s => {
          if (s.status === "listening") {
            // Restart listening if we were listening and it ended
            setTimeout(() => {
              if (shouldContinue.current && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch(e) {}
              }
            }, 100);
            return s; // Keep listening state
          }
          return s;
        });
      } else {
        setState(s => s.status === "listening" ? { ...s, status: "idle" } : s);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Speech recognition start error", e);
    }
  }, [onUserSpeech, stopAudio, state.status]);

  const handleSpeakEnd = useCallback(() => {
    setState(s => {
      if (s.status === "speaking") {
        if (shouldContinue.current) {
          // Si la llamada sigue activa, reanudar escucha
          setTimeout(() => {
            if (shouldContinue.current) {
              start();
            }
          }, 100);
          return { ...s, status: "listening" };
        }
        return { ...s, status: "idle" };
      }
      return s;
    });
  }, [start]);

  useEffect(() => {
    if (busy) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
      }
      setState(s => ({ ...s, status: "processing" }));
    } else {
      // Cuando busy termina, verificamos si hay una nueva respuesta
      if (reply && reply.id !== lastReplyId.current) {
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
              audioRef.current.onended = handleSpeakEnd;
              audioRef.current.play().catch(e => {
                console.error("Audio play blocked", e);
                handleSpeakEnd();
              });
            }
          })
          .catch((e) => {
            console.warn("Fallback to window.speechSynthesis", e);
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(textToSpeak);
              utterance.lang = "es-ES";
              
              const voices = window.speechSynthesis.getVoices();
              const esVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Natural'))) 
                           || voices.find(v => v.lang.startsWith('es'));
              if (esVoice) {
                utterance.voice = esVoice;
              }

              utterance.onend = handleSpeakEnd;
              utterance.onerror = (err) => {
                console.error("SpeechSynthesis error:", err);
                handleSpeakEnd();
              };
              window.speechSynthesis.speak(utterance);
            } else {
              handleSpeakEnd();
            }
          });
        }
      } else {
        // No está busy y no hay respuesta nueva.
        // Si estábamos "processing", significa que no hubo respuesta (ej: error o el usuario interrumpió).
        // Transicionamos directamente a listening si shouldContinue, o idle.
        setState(s => {
          if (s.status === "processing") {
            if (shouldContinue.current) {
              setTimeout(() => {
                if (shouldContinue.current) start();
              }, 100);
              return { ...s, status: "listening" };
            }
            return { ...s, status: "idle" };
          }
          return s;
        });
      }
    }
  }, [busy, reply, stopAudio, handleSpeakEnd, start]);

  const stop = useCallback(() => {
    shouldContinue.current = false;
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

