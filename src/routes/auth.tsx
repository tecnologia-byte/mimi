import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import mimiAvatar from "@/assets/mimi-avatar.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Mimi, IA de IVAD" },
      { name: "description", content: "Accede con tu correo corporativo a Mimi, la asistente inteligente de IVAD Home & Goods." },
      { property: "og:title", content: "Iniciar sesión — Mimi, IA de IVAD" },
      { property: "og:description", content: "Accede con tu correo corporativo a Mimi, la asistente inteligente de IVAD Home & Goods." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo para confirmar tu cuenta.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="watermark-ivad" aria-hidden>
        IVAD
      </div>
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card/80 p-6 sm:p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={mimiAvatar.url}
            alt="Mimi, asistente de IVAD"
            className="h-24 w-24 rounded-full border border-border object-cover object-top"
          />
          <h1 className="mt-4 text-4xl text-foreground">
            <span className="font-script">Mimi</span> <span className="text-primary">✦</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu asistente inteligente de IVAD Home & Goods</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Correo corporativo</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ivad.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" />
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.6 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.7 12 2.7 6.87 2.7 2.7 6.87 2.7 12s4.17 9.3 9.3 9.3c5.37 0 8.93-3.77 8.93-9.09 0-.61-.07-1.08-.16-1.55z" />
          </svg>
          Continuar con Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-medium text-primary hover:underline"
          >
            {mode === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}
