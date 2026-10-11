import { useCallback, useEffect, useRef, useState } from "react";

export type LiveState = {
  status: "idle" | "listening" | "processing" | "speaking" | "closed";
  error: string | null;
  muted: boolean;
};

export function useLiveVoice({
  onUserSpeech,
  reply,
  busy,
  onSpeakStart
}: {
  onSpeakStart?: (() => void) | undefined;
  onUserSpeech?: ((text: string) => void) | undefined;
  reply?: { id: string; text: string } | null | undefined;
  busy?: boolean | undefined;
  onEvent?: ((event: any) => void) | undefined;
}) {
  const [state, setState] = useState<LiveState>({ status: "idle", error: null, muted: false });
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastReplyId = useRef<string | null>(null);
  const shouldContinue = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const mutedRef = useRef<boolean>(false);
  const speakCooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper para detener cualquier TTS actual
  const stopAudio = useCallback(() => {
    if (speakCooldownTimer.current) {
      clearTimeout(speakCooldownTimer.current);
      speakCooldownTimer.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const startListening = useCallback(() => {
    if (!shouldContinue.current || isSpeakingRef.current || mutedRef.current) {
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState(s => ({ ...s, status: "idle", error: "Reconocimiento de voz no soportado en tu navegador." }));
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES'; // Locale universal
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (isSpeakingRef.current || mutedRef.current) {
        try { recognition.abort(); } catch (e) {}
        return;
      }
      setState(s => ({ ...s, status: "listening", error: null }));
    };

    recognition.onresult = (event: any) => {
      // Si Mimi está hablando o en margen de cooldown, ignorar absolutamente cualquier sonido del altavoz
      if (isSpeakingRef.current || mutedRef.current) {
        return;
      }
      const text = event.results?.[0]?.[0]?.transcript;
      if (text && text.trim() && onUserSpeech) {
        // Pausar reconocimiento antes de enviar para evitar dobles disparos
        try { recognition.abort(); } catch (e) {}
        setState(s => ({ ...s, status: "processing", error: null }));
        onUserSpeech(text.trim());
      }
    };

    recognition.onerror = (event: any) => {
      if (isSpeakingRef.current || mutedRef.current) return;
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setState(s => ({ ...s, status: "idle", error: "Error de conexión de voz. Intenta de nuevo." }));
        shouldContinue.current = false;
      } else {
        // Silencio o cancelación limpia, reiniciar si la llamada sigue activa y libre de voz
        if (shouldContinue.current && !isSpeakingRef.current && !mutedRef.current) {
          setTimeout(() => {
            if (shouldContinue.current && !isSpeakingRef.current && !mutedRef.current) {
              try { recognitionRef.current?.start(); } catch (e) {}
            }
          }, 100);
        }
      }
    };

    recognition.onend = () => {
      if (isSpeakingRef.current || mutedRef.current) return;
      if (shouldContinue.current) {
        setTimeout(() => {
          if (shouldContinue.current && !isSpeakingRef.current && !mutedRef.current) {
            try { recognitionRef.current?.start(); } catch (e) {}
          }
        }, 100);
      } else {
        setState(s => (s.status === "listening" ? { ...s, status: "idle" } : s));
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Speech recognition start error", e);
    }
  }, [onUserSpeech]);

  const handleSpeakEnd = useCallback(() => {
    if (speakCooldownTimer.current) {
      clearTimeout(speakCooldownTimer.current);
    }

    // Margen de seguridad de ~350ms tras terminar el audio para que el eco residual
    // en la habitación o altavoz no reactive el reconocimiento anticipadamente.
    speakCooldownTimer.current = setTimeout(() => {
      isSpeakingRef.current = false;
      setState(s => {
        if (s.status === "speaking") {
          if (shouldContinue.current && !mutedRef.current) {
            setTimeout(() => {
              if (shouldContinue.current && !isSpeakingRef.current && !mutedRef.current) {
                startListening();
              }
            }, 50);
            return { ...s, status: "listening" };
          }
          return { ...s, status: "idle" };
        }
        return s;
      });
    }, 350);
  }, [startListening]);

  const start = useCallback(() => {
    shouldContinue.current = true;
    mutedRef.current = false;
    isSpeakingRef.current = false;
    if (speakCooldownTimer.current) {
      clearTimeout(speakCooldownTimer.current);
      speakCooldownTimer.current = null;
    }

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

    stopAudio();
    startListening();
  }, [stopAudio, startListening]);

  useEffect(() => {
    if (busy) {
      // Abortar escucha mientras el backend procesa la respuesta
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      setState(s => ({ ...s, status: "processing" }));
    } else {
      // Cuando busy termina, verificamos si hay una nueva respuesta para hablar
      if (reply && reply.id !== lastReplyId.current) {
        lastReplyId.current = reply.id;

        // Pausar y desactivar micrófono antes de emitir audio
        isSpeakingRef.current = true;
        if (speakCooldownTimer.current) {
          clearTimeout(speakCooldownTimer.current);
          speakCooldownTimer.current = null;
        }
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (e) {}
        }
        stopAudio();
        setState(s => ({ ...s, status: "speaking" }));

        // Reproducir usando el endpoint TTS de ElevenLabs
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
              audioRef.current.onplaying = () => {
                isSpeakingRef.current = true;
                onSpeakStart?.();
              };
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

              utterance.onstart = () => {
                isSpeakingRef.current = true;
                onSpeakStart?.();
              };
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
        // No está busy y no hay respuesta nueva. Si estábamos en processing, volvemos a listening.
        setState(s => {
          if (s.status === "processing") {
            if (shouldContinue.current && !mutedRef.current) {
              setTimeout(() => {
                if (shouldContinue.current && !isSpeakingRef.current && !mutedRef.current) {
                  startListening();
                }
              }, 100);
              return { ...s, status: "listening" };
            }
            return { ...s, status: "idle" };
          }
          return s;
        });
      }
    }
  }, [busy, reply, stopAudio, handleSpeakEnd, startListening, onSpeakStart]);

  const stop = useCallback(() => {
    shouldContinue.current = false;
    isSpeakingRef.current = false;
    if (speakCooldownTimer.current) {
      clearTimeout(speakCooldownTimer.current);
      speakCooldownTimer.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }
    stopAudio();
    setState(s => ({ ...s, status: "closed", error: null }));
  }, [stopAudio]);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    setState(s => ({ ...s, muted }));
    if (muted) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      stopAudio();
    } else {
      if (shouldContinue.current && !isSpeakingRef.current) {
        startListening();
      }
    }
  }, [stopAudio, startListening]);

  return { ...state, audioRef, start, stop, setMuted };
}

