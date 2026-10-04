import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, FileSignature, Mail, Megaphone, Receipt, Users } from "lucide-react";
import { AppShell } from "@/components/mimi/AppShell";
import { useStartChat } from "@/hooks/use-start-chat";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/plantillas")({
  head: () => pageHead("Plantillas", "Plantillas con el formato de IVAD: correos, cotizaciones, informes y actas."),
  component: () => <AppShell>{(userId) => <Templates userId={userId} />}</AppShell>,
});

const TEMPLATES = [
  { icon: Mail, title: "Correo profesional", desc: "Correo formal a cliente o proveedor.", prompt: "Redacta un correo profesional con el formato de IVAD Home & Goods. Pregúntame primero el destinatario, el motivo y los puntos clave." },
  { icon: Receipt, title: "Cotización", desc: "Cotización de desechables o decoración.", prompt: "Prepara una cotización con el formato de IVAD Home & Goods como tabla (producto, cantidad, precio unitario, total, ITBIS 18%). Pregúntame cliente y productos." },
  { icon: ClipboardList, title: "Informe", desc: "Informe ejecutivo estructurado.", prompt: "Crea un informe ejecutivo con el formato de IVAD: resumen, contexto, hallazgos, recomendaciones y próximos pasos. Pregúntame el tema y los datos." },
  { icon: FileSignature, title: "Acta de reunión", desc: "Asistentes, acuerdos y responsables.", prompt: "Redacta un acta de reunión con el formato de IVAD: fecha, asistentes, temas tratados, acuerdos, responsables y fechas límite. Pregúntame los detalles." },
  { icon: Megaphone, title: "Publicación para redes", desc: "Promoción de productos IVAD.", prompt: "Escribe 3 opciones de publicación para redes sociales promocionando productos de IVAD Home & Goods. Pregúntame el producto y la ocasión." },
  { icon: Users, title: "Comunicado interno", desc: "Aviso para el equipo.", prompt: "Redacta un comunicado interno para el personal de IVAD Home & Goods. Pregúntame el tema y el tono." },
];

function Templates({ userId }: { userId: string }) {
  const start = useStartChat(userId);
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 py-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Plantillas</h1>
      <p className="mt-1 text-sm text-muted-foreground">Elige una plantilla y Mimi la prepara contigo con el formato de IVAD.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <button key={t.title} onClick={() => void start(t.prompt)} className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60">
            <t.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">{t.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
