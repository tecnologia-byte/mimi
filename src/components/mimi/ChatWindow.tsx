import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PENDING_MESSAGE_KEY } from "@/lib/threads";
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

  const { messages, sendMessage, regenerate, status, stop } = useChat({
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
        <Composer
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
