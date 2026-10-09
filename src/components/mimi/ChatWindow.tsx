import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { PENDING_MESSAGE_KEY, PENDING_VOICE_KEY, takePendingChatDraft, threadsQueryKey } from "@/lib/threads";
import { VoicePanel, type VoiceTurn } from "./VoicePanel";
import { Composer, type ComposerHandle } from "./Composer";
import { MessageList } from "./MessageList";
import { extractOfficeText } from "@/lib/office";
import { getActiveAgent } from "@/lib/agents";

interface ChatWindowProps {
  threadId: string;
  initialMessages: UIMessage[];
}

export function ChatWindow({ threadId, initialMessages }: ChatWindowProps) {
  const composerRef = useRef<ComposerHandle>(null);
  const sentPending = useRef(false);
  const queryClient = useQueryClient();

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
    onFinish: () => {
      // The server may have auto-renamed the chat; refresh the sidebar list.
      queryClient.invalidateQueries({ queryKey: threadsQueryKey });
    },
  });

  const handleSend = useCallback(
    async (text: string, opts: { webSearch: boolean; files: File[] }) => {
      let fullText = text;
      const fileParts: FileUIPart[] = [];
      if (opts.files.length) {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id;
        for (const file of opts.files) {
          // Save a private copy in the user's Documents.
          if (uid) {
            const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
            const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
            if (!error) {
              await supabase.from("documents").insert({
                user_id: uid,
                name: file.name,
                mime_type: file.type || "application/octet-stream",
                size: file.size,
                storage_path: path,
              });
            } else toast.error(`No se pudo guardar ${file.name}`);
          }
          if (file.type === "application/pdf" || file.type.startsWith("image/")) {
            fileParts.push({ type: "file", mediaType: file.type, filename: file.name, url: await toDataURL(file) });
          } else {
            const office = await extractOfficeText(file).catch(() => null);
            const content = (office ?? (await file.text())).slice(0, 60000);
            fullText += `\n\n--- Documento: ${file.name} ---\n${content}`;
          }
        }
      }
      sendMessage({ text: fullText, files: fileParts }, { body: { webSearch: opts.webSearch, agent: getActiveAgent() } });
    },
    [sendMessage],
  );

  // Send the first message after useChat has mounted. Calling handleSend
  // directly avoids losing the timer when React refreshes this component.
  useEffect(() => {
    if (sentPending.current) return;
    const pending = sessionStorage.getItem(PENDING_MESSAGE_KEY);
    if (pending === null) return;

    const draft = takePendingChatDraft();
    const timer = window.setTimeout(() => {
      if (sentPending.current) return;
      sentPending.current = true;
      sessionStorage.removeItem(PENDING_MESSAGE_KEY);
      void handleSend(
        draft?.text ?? pending,
        { webSearch: draft?.webSearch ?? false, files: draft?.files ?? [] },
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [handleSend]);

  const [voiceOpen, setVoiceOpen] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem(PENDING_VOICE_KEY)) {
      sessionStorage.removeItem(PENDING_VOICE_KEY);
      setVoiceOpen(true);
    }
  }, []);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const reply = lastAssistant
    ? {
        id: lastAssistant.id,
        text: lastAssistant.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join(""),
      }
    : null;

  const busy = status === "submitted" || status === "streaming";
  const waiting =
    status === "submitted" || (status === "streaming" && messages[messages.length - 1]?.role === "user");

  useEffect(() => {
    if (!busy) composerRef.current?.focus();
  }, [busy]);

  return (
    <>
      {messages.length === 0 && !busy ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-script text-4xl text-primary">Mimi ✦</p>
          <p className="text-sm text-muted-foreground">
            Hola, soy Mimi. Escríbeme tu pregunta abajo y te ayudo enseguida.
          </p>
        </div>
      ) : (
        <MessageList messages={messages} busy={waiting} onRegenerate={() => regenerate()} />
      )}
      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4">
        {voiceOpen && (
          <VoicePanel
            onUserSpeech={(text) => void handleSend(text, { webSearch: false, files: [] })}
            reply={reply}
            busy={busy}
            onClose={() => setVoiceOpen(false)}
          />
        )}
        <Composer
          onVoice={() => setVoiceOpen(true)}
          ref={composerRef}
          busy={busy}
          onStop={stop}
          onSend={handleSend}
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Mimi puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </>
  );
}

function toDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
