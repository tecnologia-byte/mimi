import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calculator, Truck, Users } from "lucide-react";
import { AppShell } from "@/components/mimi/AppShell";
import { Button } from "@/components/ui/button";
import { useStartChat } from "@/hooks/use-start-chat";
import { setActiveAgent } from "@/lib/agents";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/milt")({
  head: () => pageHead("Milt — Agentes de Mimi", "Asigna tareas a Milt: Mimi, Mimi Contadora y Mimi Logística trabajan juntas para darte la solución."),
  component: () => <AppShell>{(userId) => <Milt userId={userId} />}</AppShell>,
});

const EXAMPLES = [
  "Analiza si nos conviene importar 20,000 vasos desechables este mes: costos, ITBIS, tiempos de llegada y espacio en almacén.",
  "Prepara un plan para la temporada navideña: inventario de decoraciones, presupuesto y flujo de caja.",
  "Reduce los costos de entrega en Santo Domingo sin afectar el margen.",
];

function Milt({ userId }: { userId: string }) {
  const start = useStartChat(userId);
  const [task, setTask] = useState("");
  const run = (t: string) => {
    if (!t.trim()) return;
    setActiveAgent("milt");
    void start(t.trim());
  };
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold sm:text-3xl">Milt</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Asigna una tarea y las Mimi se comunican entre sí como agentes hasta encontrar la solución.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <Calculator className="h-5 w-5 text-primary" />
          <p className="mt-2 font-medium">Mimi Contadora</p>
          <p className="text-sm text-muted-foreground">Finanzas, impuestos DGII, costos y análisis.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <Truck className="h-5 w-5 text-primary" />
          <p className="mt-2 font-medium">Mimi Logística</p>
          <p className="text-sm text-muted-foreground">Inventario, envíos, proveedores e importaciones.</p>
        </div>
      </div>
      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        rows={4}
        placeholder="Describe la tarea para Milt..."
        className="mt-6 w-full resize-none rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:border-primary/50"
      />
      <Button className="mt-3 rounded-full" onClick={() => run(task)} disabled={!task.trim()}>
        Asignar tarea a Milt
      </Button>
      <p className="mb-2 mt-8 text-sm font-medium">Ejemplos</p>
      <div className="space-y-2">
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => run(e)} className="w-full rounded-xl border border-border bg-card p-3 text-left text-sm hover:border-primary/60">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
