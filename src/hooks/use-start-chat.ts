import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createThread, PENDING_MESSAGE_KEY } from "@/lib/threads";

/** Creates a new chat and sends `prompt` as the first message. */
export function useStartChat(userId: string) {
  const navigate = useNavigate();
  return async (prompt: string) => {
    try {
      const thread = await createThread(userId);
      sessionStorage.setItem(PENDING_MESSAGE_KEY, prompt);
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } catch {
      toast.error("No se pudo crear el chat. Inténtalo de nuevo.");
    }
  };
}
