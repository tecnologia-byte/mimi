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
}

export function takePendingChatDraft(): PendingChatDraft | null {
  const draft = pendingChatDraft;
  pendingChatDraft = null;
  return draft;
}
