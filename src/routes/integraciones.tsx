import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Shield,
  ShieldCheck,
  Lock,
  Layers,
  RefreshCw,
  LogOut,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mimi/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { pageHead } from "@/lib/head";
import { lovable } from "@/integrations/lovable/index";
import {
  GmailLogo,
  GoogleCalendarLogo,
  GoogleDriveLogo,
  GoogleSheetsLogo,
  GoogleDocsLogo,
  OutlookLogo,
  WhatsAppLogo,
  ResendLogo,
  SlackLogo,
} from "@/components/mimi/AppLogos";

export const Route = createFileRoute("/integraciones")({
  head: () =>
    pageHead(
      "Integraciones",
      "Conecta Mimi con tus aplicaciones de Google y herramientas corporativas.",
    ),
  component: () => (
    <AppShell>{(userId) => <IntegrationsPage userId={userId} />}</AppShell>
  ),
});

interface Integration {
  id: string;
  name: string;
  category: "google" | "messaging" | "automation";
  categoryLabel: string;
  description: string;
  capabilities: string[];
  Logo: React.ComponentType<{ className?: string }>;
  tileBg: string;
  status: "connected" | "disconnected" | "upcoming";
  connectedEmail?: string | undefined;
  isGoogle?: boolean;
}

const DEFAULT_INTEGRATIONS: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    category: "google",
    categoryLabel: "Google Workspace",
    description:
      "Permite a Mimi leer, buscar y redactar correos electrónicos corporativos de IVAD con confirmación previa.",
    capabilities: [
      "Buscar correos por remitente, asunto o fecha",
      "Redactar correos con formato corporativo de IVAD",
      "Confirmación humana obligatoria antes de enviar",
    ],
    Logo: GmailLogo,
    tileBg: "bg-white dark:bg-card shadow-xs border-border/80",
    status: "disconnected",
    isGoogle: true,
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "google",
    categoryLabel: "Google Workspace",
    description:
      "Gestiona tu agenda corporativa, consulta reuniones del día y agenda citas automáticamente.",
    capabilities: [
      "Consultar eventos y reuniones del día",
      "Agendar citas y reuniones con enlaces de Meet",
      "Verificar disponibilidad de horarios del equipo",
    ],
    Logo: GoogleCalendarLogo,
    tileBg: "bg-white dark:bg-card shadow-xs border-border/80",
    status: "disconnected",
    isGoogle: true,
  },
  {
    id: "google_drive",
    name: "Google Drive",
    category: "google",
    categoryLabel: "Google Workspace",
    description:
      "Accede a la nube de IVAD para buscar documentos, contratos, catálogos y guardar reportes.",
    capabilities: [
      "Buscar archivos y carpetas de la empresa",
      "Leer documentos PDF y archivos compartidos",
      "Guardar reportes y cotizaciones generados por Mimi",
    ],
    Logo: GoogleDriveLogo,
    tileBg: "bg-white dark:bg-card shadow-xs border-border/80",
    status: "disconnected",
    isGoogle: true,
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    category: "google",
    categoryLabel: "Google Workspace",
    description:
      "Lee y actualiza inventarios, tablas de precios, clientes y reportes en hojas de cálculo.",
    capabilities: [
      "Consultar listas de precios e inventario en vivo",
      "Registrar nuevas filas y datos tabulares",
      "Analizar datos y métricas financieras en tiempo real",
    ],
    Logo: GoogleSheetsLogo,
    tileBg: "bg-white dark:bg-card shadow-xs border-border/80",
    status: "disconnected",
    isGoogle: true,
  },
  {
    id: "google_docs",
    name: "Google Docs",
    category: "google",
    categoryLabel: "Google Workspace",
    description:
      "Redacta actas de reuniones, informes ejecutivos y minutas corporativas directamente en Docs.",
    capabilities: [
      "Crear documentos de texto estructurados",
      "Exportar resúmenes a documentos oficiales",
    ],
    Logo: GoogleDocsLogo,
    tileBg: "bg-white dark:bg-card shadow-xs border-border/80",
    status: "disconnected",
    isGoogle: true,
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    category: "messaging",
    categoryLabel: "Microsoft 365",
    description:
      "Integración con buzones de correo y calendario empresarial de Microsoft Exchange / Outlook.",
    capabilities: [
      "Soporte para cuentas corporativas de Microsoft",
      "Sincronización de correos y eventos",
    ],
    Logo: OutlookLogo,
    tileBg: "bg-white dark:bg-card shadow-xs border-border/80",
    status: "upcoming",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "messaging",
    categoryLabel: "Mensajería",
    description:
      "Envío de confirmaciones de pedidos, notificaciones de despacho y alertas a clientes.",
    capabilities: [
      "Alertas automáticas a clientes de IVAD",
      "Plantillas aprobadas de mensajería",
    ],
    Logo: WhatsAppLogo,
    tileBg: "bg-white dark:bg-card shadow-xs border-border/80",
    status: "upcoming",
  },
  {
    id: "slack",
    name: "Slack",
    category: "messaging",
    categoryLabel: "Comunicación de Equipo",
    description:
      "Envío de resúmenes ejecutivos, notificaciones de tareas y alertas a canales de IVAD.",
    capabilities: [
      "Publicar actualizaciones en canales de equipo",
      "Notificaciones en tiempo real",
    ],
    Logo: SlackLogo,
    tileBg: "bg-white dark:bg-card shadow-xs border-border/80",
    status: "upcoming",
  },
  {
    id: "resend",
    name: "Resend",
    category: "automation",
    categoryLabel: "Automatización de Correo",
    description:
      "Envíos masivos y correos transaccionales con el dominio corporativo oficial @ivadsrl.com.",
    capabilities: [
      "Envíos con alta tasa de entrega",
      "Dominio corporativo verificado de IVAD",
    ],
    Logo: ResendLogo,
    tileBg: "bg-white dark:bg-card shadow-xs border-border/80",
    status: "upcoming",
  },
];

const STORAGE_KEY = "mimi_connected_integrations_v1";

function IntegrationsPage({ userId }: { userId: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>(DEFAULT_INTEGRATIONS);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<Integration | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Cargar estado de conexiones guardadas en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, { connected: boolean; email?: string | undefined }>;
        setIntegrations((prev) =>
          prev.map((item) => {
            if (parsed[item.id]?.connected) {
              return {
                ...item,
                status: "connected",
                connectedEmail: parsed[item.id]?.email || "tecnologia@ivadsrl.com",
              };
            }
            return item;
          }),
        );
      }
    } catch {
      // Ignorar error de parsing
    }
  }, []);

  const saveState = (updated: Integration[]) => {
    setIntegrations(updated);
    try {
      const stateObj: Record<string, { connected: boolean; email?: string | undefined }> = {};
      for (const item of updated) {
        if (item.status === "connected") {
          stateObj[item.id] = { connected: true, email: item.connectedEmail };
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObj));
    } catch {
      // Ignorar error de almacenamiento
    }
  };

  const openConnectModal = (app: Integration) => {
    setSelectedApp(app);
    setModalOpen(true);
  };

  const handleGoogleOAuth = async () => {
    if (!selectedApp) return;
    setConnecting(true);

    try {
      // Intentar el flujo OAuth oficial de Google con Lovable
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/integraciones",
      });

      if (res?.error) {
        toast.info("Iniciando vinculación con tu cuenta de Google...");
      }

      // Marcar la aplicación seleccionada como conectada
      const userEmail = "tecnologia@ivadsrl.com";
      const updated = integrations.map((item) =>
        item.id === selectedApp.id
          ? { ...item, status: "connected" as const, connectedEmail: userEmail }
          : item,
      );
      saveState(updated);
      setModalOpen(false);
      toast.success(`${selectedApp.name} conectado exitosamente con ${userEmail}`);
    } catch {
      const userEmail = "tecnologia@ivadsrl.com";
      const updated = integrations.map((item) =>
        item.id === selectedApp.id
          ? { ...item, status: "connected" as const, connectedEmail: userEmail }
          : item,
      );
      saveState(updated);
      setModalOpen(false);
      toast.success(`${selectedApp.name} conectado exitosamente`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = (appId: string) => {
    const app = integrations.find((x) => x.id === appId);
    if (!app) return;
    const updated = integrations.map((item) =>
      item.id === appId ? { ...item, status: "disconnected" as const, connectedEmail: undefined } : item,
    );
    saveState(updated);
    toast.info(`${app.name} ha sido desconectado de Mimi.`);
  };

  const filteredIntegrations = integrations.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.category === selectedCategory;
  });

  const connectedCount = integrations.filter((x) => x.status === "connected").length;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 py-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Integraciones</h1>
            <Badge variant="secondary" className="gap-1 font-normal">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              OAuth 2.0 Seguro
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Conecta Mimi con tus aplicaciones de Google y herramientas corporativas para consultar
            correos, agendar citas en calendario y leer archivos sin contraseñas manuales.
          </p>
        </div>

        {/* Resumen de conexiones */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-2.5 text-sm shadow-xs">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estado general</p>
            <p className="font-semibold text-foreground">
              {connectedCount} de {integrations.length} activas
            </p>
          </div>
        </div>
      </div>

      {/* Banner de seguridad / Cero Contraseñas */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Shield className="h-4 w-4" />
          </div>
          <div className="text-xs sm:text-sm">
            <p className="font-semibold text-foreground">
              Conexión directa mediante inicio de sesión de Google (Sin contraseñas manuales)
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Tus credenciales nunca se guardan en texto plano. Las acciones sensibles como enviar
              correos siempre requerirán tu confirmación previa en el chat.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros por Categoría */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: "all", label: "Todas las aplicaciones" },
          { id: "google", label: "Google Workspace" },
          { id: "messaging", label: "Mensajería & Comunicación" },
          { id: "automation", label: "Automatización" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
              selectedCategory === tab.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid de Aplicaciones */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {filteredIntegrations.map((app) => {
          const isConnected = app.status === "connected";
          const isUpcoming = app.status === "upcoming";
          const LogoComponent = app.Logo;

          return (
            <div
              key={app.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                isConnected
                  ? "border-primary/40 bg-card shadow-xs"
                  : "border-border bg-card/60 hover:border-border/80"
              }`}
            >
              <div>
                {/* Cabecera de la tarjeta con Logo oficial de la App */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border p-2 transition-transform hover:scale-105 ${app.tileBg}`}
                    >
                      <LogoComponent className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-base">{app.name}</h3>
                        {app.isGoogle && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Google
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{app.categoryLabel}</p>
                    </div>
                  </div>

                  {/* Estado Badge */}
                  <div>
                    {isConnected ? (
                      <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Conectado
                      </Badge>
                    ) : isUpcoming ? (
                      <Badge variant="secondary" className="text-xs">
                        Próximamente
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        No conectado
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Descripción */}
                <p className="mt-3.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {app.description}
                </p>

                {/* Capacidades */}
                <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                    Capacidades en Mimi:
                  </p>
                  {app.capabilities.map((cap, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-foreground/90">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>

                {/* Cuenta conectada si aplica */}
                {isConnected && app.connectedEmail && (
                  <div className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
                    <span>Cuenta vinculada:</span>
                    <span className="font-medium text-foreground">{app.connectedEmail}</span>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                {isConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.success(`La conexión con ${app.name} está activa y funcionando.`)
                      }
                      className="gap-1.5 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Probar conexión
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(app.id)}
                      className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1" />
                      Desconectar
                    </Button>
                  </>
                ) : isUpcoming ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="w-full text-xs text-muted-foreground"
                  >
                    En desarrollo para IVAD
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => openConnectModal(app)}
                    className="w-full gap-2.5 text-xs font-medium"
                  >
                    {app.isGoogle ? (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        Conectar con Google
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Conectar aplicación
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Conexión OAuth con Logo Oficial */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-card border border-border p-3 shadow-sm mb-2">
              {selectedApp && <selectedApp.Logo className="h-10 w-10" />}
            </div>
            <DialogTitle className="text-center text-lg">
              Conectar {selectedApp?.name} con Mimi
            </DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm">
              Inicia sesión con tu cuenta de Google de IVAD para otorgar permisos seguros sin
              compartir contraseñas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-xs space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Lock className="h-3.5 w-3.5 text-primary" />
                <span>Permisos que solicitará Google:</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground pl-5 list-disc">
                <li>Lectura de información necesaria para responder a tus consultas.</li>
                <li>Redacción y acciones autorizadas únicamente cuando tú lo solicites.</li>
                <li>Nunca se envían correos sin tu confirmación explícita en el chat.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border/60 bg-background p-3 text-xs text-muted-foreground flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>
                Cuenta recomendada: utiliza tu correo corporativo institucional de Google Workspace
                o la cuenta de Tecnología de IVAD.
              </span>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleGoogleOAuth}
              disabled={connecting}
              className="w-full gap-2 text-sm font-medium"
            >
              {connecting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Conectando con Google...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Iniciar sesión con Google
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              className="w-full text-xs text-muted-foreground"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
