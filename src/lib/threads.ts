import { supabase } from "@/integrations/supabase/client";

export type Thread = {
  id: string;
  title: string;
  pinned: boolean;
  updated_at: string;
};

export const threadsQueryKey = ["threads"] as const;

export async function fetchThreads(): Promise<Thread[]> {
  const { data, error } = await supabase
    .from("threads")
    .select("id, title, pinned, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createThread(userId: string): Promise<Thread> {
  const { data, error } = await supabase
    .from("threads")
    .insert({ user_id: userId })
    .select("id, title, pinned, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export const PENDING_MESSAGE_KEY = "mimi-pending-message";

export const PENDING_VOICE_KEY = "mimi-pending-voice";

export type PendingChatDraft = {
  text: string;
  files: File[];
  webSearch: boolean;
};

let pendingChatDraft: PendingChatDraft | null = null;

export function setPendingChatDraft(draft: PendingChatDraft) {
  pendingChatDraft = draft;
  sessionStorage.setItem(PENDING_MESSAGE_KEY, draft.text);
  sessionStorage.setItem("mimi-pending-web-search", draft.webSearch ? "1" : "0");
}

export function takePendingChatDraft(): PendingChatDraft | null {
  const draft = pendingChatDraft;
  pendingChatDraft = null;
  const webSearchStored = sessionStorage.getItem("mimi-pending-web-search") === "1";
  sessionStorage.removeItem("mimi-pending-web-search");
  if (draft) {
    return { ...draft, webSearch: draft.webSearch || webSearchStored };
  }
  const pendingText = sessionStorage.getItem(PENDING_MESSAGE_KEY);
  if (pendingText !== null) {
    return { text: pendingText, files: [], webSearch: webSearchStored };
  }
  return null;
}
