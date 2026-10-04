import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isToday, isYesterday, subDays, isAfter } from "date-fns";
import {
  BookOpen,
  FileText,
  LayoutTemplate,
  LogOut,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchThreads, threadsQueryKey, type Thread } from "@/lib/threads";

const sections = [
  { title: "Conocimientos", icon: BookOpen },
  { title: "Documentos", icon: FileText },
  { title: "Plantillas", icon: LayoutTemplate },
  { title: "Favoritos", icon: Star },
  { title: "Herramientas", icon: Wrench },
];

function groupThreads(threads: Thread[]) {
  const pinned = threads.filter((t) => t.pinned);
  const rest = threads.filter((t) => !t.pinned);
  const weekAgo = subDays(new Date(), 7);
  const groups: { label: string; items: Thread[] }[] = [
    { label: "Fijados", items: pinned },
    { label: "Hoy", items: rest.filter((t) => isToday(new Date(t.updated_at))) },
    { label: "Ayer", items: rest.filter((t) => isYesterday(new Date(t.updated_at))) },
    {
      label: "Últimos 7 días",
      items: rest.filter((t) => {
        const d = new Date(t.updated_at);
        return !isToday(d) && !isYesterday(d) && isAfter(d, weekAgo);
      }),
    },
    { label: "Anteriores", items: rest.filter((t) => !isAfter(new Date(t.updated_at), weekAgo)) },
  ];
  return groups.filter((g) => g.items.length > 0);
}

export function MimiSidebar({ user }: { user: User }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const accountName =
    (typeof user.user_metadata["full_name"] === "string" && user.user_metadata["full_name"]) ||
    (typeof user.user_metadata["name"] === "string" && user.user_metadata["name"]) ||
    "Usuario IVAD";
  const accountAvatar =
    (typeof user.user_metadata["avatar_url"] === "string" && user.user_metadata["avatar_url"]) ||
    (typeof user.user_metadata["picture"] === "string" && user.user_metadata["picture"]) ||
    null;
  const accountInitial = accountName.trim().charAt(0).toUpperCase() || "U";

  const { data: threads = [] } = useQuery({ queryKey: threadsQueryKey, queryFn: fetchThreads });

  const refresh = () => queryClient.invalidateQueries({ queryKey: threadsQueryKey });

  const rename = async (thread: Thread) => {
    const title = window.prompt("Nuevo nombre del chat", thread.title)?.trim();
    if (!title) return;
    const { error } = await supabase.from("threads").update({ title }).eq("id", thread.id);
    if (error) {
      toast.error("No se pudo renombrar");
      return;
    }
    refresh();
  };

  const togglePin = async (thread: Thread) => {
    const { error } = await supabase.from("threads").update({ pinned: !thread.pinned }).eq("id", thread.id);
    if (error) {
      toast.error("No se pudo actualizar");
      return;
    }
    refresh();
  };

  const remove = async (thread: Thread) => {
    if (!window.confirm(`¿Eliminar "${thread.title}"?`)) return;
    const { error } = await supabase.from("threads").delete().eq("id", thread.id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    refresh();
    if (pathname === `/chat/${thread.id}`) navigate({ to: "/" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/60 bg-sidebar-accent text-[10px] font-bold tracking-wider text-primary">
            IVAD
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">IVAD</p>
              <p className="truncate text-xs text-muted-foreground">Home & Goods</p>
            </div>
          )}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Nuevo chat" className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground">
              <Link to="/" className="justify-between">
                <span>Nuevo chat</span>
                <Plus className="ml-auto h-4 w-4" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="chat-scroll">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((s) => (
                <SidebarMenuItem key={s.title}>
                  <SidebarMenuButton tooltip={s.title} onClick={() => toast(`${s.title} estará disponible pronto`)}>
                    <s.icon className="h-4 w-4" />
                    <span>{s.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && threads.length > 0 && (
          <p className="px-4 pt-2 text-xs font-medium text-muted-foreground">Chats recientes</p>
        )}
        {!collapsed &&
          groupThreads(threads).map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((thread) => (
                    <SidebarMenuItem key={thread.id}>
                      <SidebarMenuButton asChild isActive={pathname === `/chat/${thread.id}`}>
                        <Link to="/chat/$threadId" params={{ threadId: thread.id }}>
                          <span className="truncate">{thread.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction showOnHover aria-label="Opciones del chat">
                            <MoreHorizontal className="h-4 w-4" />
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem onClick={() => rename(thread)}>
                            <Pencil className="mr-2 h-4 w-4" /> Renombrar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePin(thread)}>
                            <Pin className="mr-2 h-4 w-4" /> {thread.pinned ? "Desfijar" : "Fijar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => remove(thread)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}

        {!collapsed && (
          <div className="mx-2 mt-2 rounded-2xl border border-primary/30 bg-sidebar-accent p-4">
            <p className="text-sm font-semibold text-primary">Mimi Ejecutiva ✦</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Acceso a análisis avanzado y herramientas de nivel corporativo.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => toast.success("Solicitud enviada. Un administrador la revisará.")}
            >
              Solicitar acceso
            </Button>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="relative shrink-0">
            {accountAvatar ? (
              <img
                src={accountAvatar}
                alt={accountName}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/50 bg-primary/15 text-sm font-semibold text-primary">
                {accountInitial}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-online" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium">{accountName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email ?? "Cuenta de Google"}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-online">● En línea</p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Cerrar sesión"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
