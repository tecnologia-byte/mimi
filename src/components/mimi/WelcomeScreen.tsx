import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createThread, threadsQueryKey, PENDING_MESSAGE_KEY } from "@/lib/threads";
import { MIMI_SUGGESTIONS } from "@/lib/mimi";
import { Composer } from "./Composer";
import { AboutMimiModal } from "./AboutMimiModal";
import { Button } from "@/components/ui/button";
import mimiHero from "@/assets/mimi-hero.png.asset.json";

export function WelcomeScreen({ userId }: { userId: string }) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const startChat = async (text: string) => {
    if (creating) return;
    setCreating(true);
    try {
      const thread = await createThread(userId);
      sessionStorage.setItem(PENDING_MESSAGE_KEY, text);
      queryClient.invalidateQueries({ queryKey: threadsQueryKey });
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } catch {
      toast.error("No se pudo crear el chat. Inténtalo de nuevo.");
      setCreating(false);
    }
  };

  return (
    <div className="chat-scroll relative flex-1 overflow-y-auto">
      <div className="watermark-ivad" aria-hidden>
        IVAD
      </div>

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center px-4 py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <h1 className="text-5xl sm:text-6xl">
              Hola, soy <span className="font-script text-primary">Mimi</span>{" "}
              <span className="text-primary">✦</span>
            </h1>
            <p className="mt-3 text-xl font-medium text-foreground">Tu asistente inteligente de IVAD</p>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Te ayudo a resumir documentos, analizar datos, redactar correos profesionales y mucho más, con el
              conocimiento de IVAD Home & Goods.
            </p>
            <Button variant="outline" className="mt-4 rounded-full" onClick={() => setAboutOpen(true)}>
              Conocer más sobre mí
            </Button>

            <div className="mt-6">
              <Composer large busy={creating} onSend={startChat} />
              <p className="mt-2 text-xs text-muted-foreground">
                Mimi puede cometer errores. Verifica la información importante.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {MIMI_SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  onClick={() => startChat(s.prompt)}
                  className="rounded-2xl border border-border bg-card p-4 text-left text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-accent"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          <img
            src={mimiHero.url}
            alt="Mimi, asistente de IVAD Home & Goods"
            className="hidden w-72 rounded-3xl border border-border object-cover shadow-2xl lg:block xl:w-80"
          />
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Mimi IA de IVAD Home & Goods. Todos los derechos reservados.
        </p>
      </div>

      <AboutMimiModal open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
