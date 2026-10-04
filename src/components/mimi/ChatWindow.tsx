import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PENDING_MESSAGE_KEY, PENDING_VOICE_KEY } from "@/lib/threads";
import { VoicePanel, type VoiceTurn } from "./VoicePanel";
import { Composer, type ComposerHandle } from "./Composer";
import { MessageList } from "./MessageList";

interface ChatWindowProps {
  threadId: string;
  initialMessages: UIMessage[];
}

export function ChatWindow({ threadId, initialMessages }: ChatWindowProps) {
  const composerRef = useRef<ComposerHandle>(null);
  const sentPending = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
        body: { threadId },
      }),
    [threadId],
  );

  const { messages, sendMessage, regenerate, status, stop, setMessages } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (error) => {
      toast.error(error.message || "Mimi no pudo responder. Inténtalo de nuevo.");
    },
  });

  // Send the first message that created this thread (from the welcome screen).
  // Deferred past mount: sending synchronously during the first commit races
  // with useChat's internal initialization and the request never fires.
  useEffect(() => {
    if (sentPending.current) return;
    const pending = sessionStorage.getItem(PENDING_MESSAGE_KEY);
    if (!pending) return;
    sentPending.current = true;
    const timer = setTimeout(() => {
      sessionStorage.removeItem(PENDING_MESSAGE_KEY);
      // Route through the composer's real send button; calling sendMessage
      // directly from this effect never fires the request.
      composerRef.current?.fillAndSubmit(pending);
    }, 2500);
    return () => clearTimeout(timer);
  }, [sendMessage]);

  const [voiceOpen, setVoiceOpen] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem(PENDING_VOICE_KEY)) {
      sessionStorage.removeItem(PENDING_VOICE_KEY);
      setVoiceOpen(true);
    }
  }, []);

  // Show spoken captions live in the transcript.
  const onTurnUpdate = useCallback(
    (turn: VoiceTurn) => {
      setMessages((prev) => {
        const msg: UIMessage = { id: turn.id, role: turn.role, parts: [{ type: "text", text: turn.text }] };
        const i = prev.findIndex((m) => m.id === turn.id);
        if (i === -1) return [...prev, msg];
        const next = prev.slice();
        next[i] = msg;
        return next;
      });
    },
    [setMessages],
  );

  // Save each finished spoken turn to this chat's history.
  const onTurnComplete = useCallback(
    async (turn: VoiceTurn) => {
      onTurnUpdate(turn);
      const { error } = await supabase.from("messages").insert({
        thread_id: threadId,
        role: turn.role,
        content: turn.text,
        parts: [{ type: "text", text: turn.text }],
        sdk_id: turn.id,
      });
      if (error) toast.error("No se pudo guardar parte de la conversación de voz.");
      if (turn.role === "user") {
        await supabase
          .from("threads")
          .update({ title: turn.text.slice(0, 60), updated_at: new Date().toISOString() })
          .eq("id", threadId)
          .eq("title", "Nuevo chat");
      }
    },
    [onTurnUpdate, threadId],
  );

  const busy = status === "submitted" || status === "streaming";
  const waiting =
    status === "submitted" || (status === "streaming" && messages[messages.length - 1]?.role === "user");

  useEffect(() => {
    if (!busy) composerRef.current?.focus();
  }, [busy]);

  return (
    <>
      <MessageList messages={messages} busy={waiting} onRegenerate={() => regenerate()} />
      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4">
        {voiceOpen && (
          <VoicePanel
            onTurnUpdate={onTurnUpdate}
            onTurnComplete={onTurnComplete}
            onClose={() => setVoiceOpen(false)}
          />
        )}
        <Composer
          onVoice={() => setVoiceOpen(true)}
          ref={composerRef}
          busy={busy}
          onStop={stop}
          onSend={(text) => sendMessage({ text })}
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Mimi puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </>
  );
}
