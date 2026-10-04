import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BarChart3, BookOpen, Lightbulb, PenLine, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AboutMimiModal } from "./AboutMimiModal";
import { Composer } from "./Composer";
import { createThread, PENDING_MESSAGE_KEY } from "@/lib/threads";
import { MIMI_SUGGESTIONS } from "@/lib/mimi";
import mimiHero from "@/assets/mimi-hero-cutout.png";

const suggestionIcons = [BookOpen, Lightbulb, BarChart3, PenLine];

export function WelcomeScreen({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const startChat = async (text: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const thread = await createThread(userId);
      sessionStorage.setItem(PENDING_MESSAGE_KEY, text);
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } catch {
      setBusy(false);
      toast.error("No se pudo crear el chat. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-y-auto">
      {/* Watermark */}
      <span
        aria-hidden
        className="watermark-ivad pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      >
        IVAD
      </span>

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-3 px-4 py-5 sm:gap-4 sm:py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Hola, soy <span className="font-script text-4xl text-primary sm:text-6xl lg:text-7xl">Mimi</span>{" "}
          <span className="text-primary">✦</span>
        </h1>
        <p className="text-base font-medium text-foreground sm:text-lg lg:text-xl">Tu asistente inteligente de IVAD</p>
        <p className="max-w-xl border-l-2 border-primary pl-3 text-sm text-muted-foreground sm:pl-4 sm:text-base">
          Estoy aquí para ayudarte con información, respuestas, redacción, análisis y mucho más.
          ¿En qué puedo asistirte hoy?
        </p>

        <div>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            Conocer más sobre mí
          </button>
        </div>

        <div className="mt-2 flex min-w-0 flex-col">
          <div className="relative z-10 flex justify-end pr-3 sm:pr-6">
            <img
              src={mimiHero}
              alt="Mimi, asistente de IVAD"
              className="pointer-events-none -mb-1 block h-40 w-auto select-none sm:-mb-1.5 sm:h-52 lg:-mb-2 lg:h-60"
            />
          </div>
          <div className="relative">
            <Composer onSend={startChat} busy={busy} large />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Mimi puede cometer errores. Verifica la información importante.
        </p>

        <div>
          <p className="mb-2 text-sm font-semibold">Sugerencias para ti</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            {MIMI_SUGGESTIONS.map((s, i) => {
              const Icon = suggestionIcons[i % suggestionIcons.length] ?? BookOpen;
              return (
                <button
                  key={s.title}
                  type="button"
                  disabled={busy}
                  onClick={() => startChat(s.prompt)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-50 sm:gap-2.5 sm:p-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-foreground" />
                  <span className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="relative pb-4 text-center text-xs text-muted-foreground">
        Mimi IA de IVAD Home & Goods. Todos los derechos reservados.
      </footer>

      <AboutMimiModal open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
