import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Calculator, FileSearch, Languages, ListChecks, SpellCheck } from "lucide-react";
import { AppShell } from "@/components/mimi/AppShell";
import { useStartChat } from "@/hooks/use-start-chat";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/herramientas")({
  head: () => pageHead("Herramientas", "Herramientas de Mimi: resumir, traducir, analizar datos, calcular y más."),
  component: () => <AppShell>{(userId) => <Tools userId={userId} />}</AppShell>,
});

const TOOLS = [
  { icon: FileSearch, title: "Resumir documento", desc: "Adjunta un archivo y obtén lo clave.", prompt: "Quiero resumir un documento. Te lo adjunto en el siguiente mensaje; dame un resumen con puntos clave y acciones." },
  { icon: Languages, title: "Traductor", desc: "Español ⇄ inglés con tono profesional.", prompt: "Actúa como traductor profesional español-inglés. Pregúntame qué texto quiero traducir y a qué idioma." },
  { icon: BarChart3, title: "Analizar datos", desc: "Sube un Excel y encuentra tendencias.", prompt: "Quiero analizar datos de ventas o inventario. Te adjunto el Excel; muéstrame tendencias, totales y recomendaciones en tablas." },
  { icon: Calculator, title: "Calculadora de precios", desc: "Márgenes, ITBIS y descuentos.", prompt: "Ayúdame a calcular precios: costo, margen deseado, ITBIS 18% y descuentos. Pregúntame los datos y muestra el cálculo en tabla." },
  { icon: SpellCheck, title: "Corregir texto", desc: "Ortografía, estilo y claridad.", prompt: "Corrige la ortografía, gramática y estilo de un texto que te voy a pegar, y explica brevemente los cambios." },
  { icon: ListChecks, title: "Plan de acción", desc: "Convierte una idea en tareas.", prompt: "Convierte una idea o proyecto en un plan de acción con tareas, responsables y fechas. Pregúntame cuál es la idea." },
];

function Tools({ userId }: { userId: string }) {
  const start = useStartChat(userId);
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 py-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Herramientas</h1>
      <p className="mt-1 text-sm text-muted-foreground">Atajos para las tareas más comunes del día a día en IVAD.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
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
