import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, Mail, BarChart3, Languages, Lightbulb, LayoutTemplate } from "lucide-react";

const capabilities = [
  { icon: FileText, title: "Resumir documentos", text: "Sube PDF, DOCX o XLSX y obtén un resumen claro." },
  { icon: BarChart3, title: "Analizar datos", text: "Sube un Excel o CSV y recibe un informe con conclusiones." },
  { icon: Mail, title: "Redactar correos", text: "Correos profesionales con el tono y formato de IVAD." },
  { icon: Languages, title: "Traducir", text: "Traducciones rápidas entre español e inglés." },
  { icon: Lightbulb, title: "Ideas de mejora", text: "Propuestas para optimizar procesos de tu área." },
  { icon: LayoutTemplate, title: "Plantillas IVAD", text: "Cotizaciones, informes y actas con el formato de la empresa." },
];

export function AboutMimiModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            <span className="font-script text-3xl">Mimi</span> <span className="text-primary">✦</span>
          </DialogTitle>
          <DialogDescription>
            Soy la asistente inteligente de IVAD Home & Goods. Estoy aquí para ayudarte a trabajar más rápido y mejor.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {capabilities.map((cap) => (
            <div key={cap.title} className="rounded-xl border border-border bg-secondary/50 p-3">
              <cap.icon className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">{cap.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{cap.text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Mimi puede cometer errores. Verifica la información importante antes de usarla.
        </p>
      </DialogContent>
    </Dialog>
  );
}
