import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { UIMessage } from "ai";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/mimi/AppShell";
import { ChatWindow } from "@/components/mimi/ChatWindow";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat — Mimi, IA de IVAD" },
      { name: "description", content: "Conversación con Mimi, la asistente inteligente de IVAD Home & Goods." },
      { property: "og:title", content: "Chat — Mimi, IA de IVAD" },
      { property: "og:description", content: "Conversación con Mimi, la asistente inteligente de IVAD Home & Goods." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

type MessageRow = {
  id: string;
  role: string;
  content: string;
  parts: unknown;
  sdk_id: string | null;
};

function toUIMessage(row: MessageRow): UIMessage {
  const parts = Array.isArray(row.parts) && row.parts.length > 0 ? row.parts : [{ type: "text", text: row.content }];
  return { id: row.sdk_id ?? row.id, role: row.role as UIMessage["role"], parts } as UIMessage;
}

function ChatPage() {
  const { threadId } = useParams({ from: "/chat/$threadId" });

  return (
    <AppShell>
      {() => (
        <ThreadLoader threadId={threadId} />
      )}
    </AppShell>
  );
}

function ThreadLoader({ threadId }: { threadId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content, parts, sdk_id")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as MessageRow[]).map(toUIMessage);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">No se pudo cargar este chat.</p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return <ChatWindow key={threadId} threadId={threadId} initialMessages={data ?? []} />;
}
