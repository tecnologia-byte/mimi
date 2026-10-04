/** Versiones de Mimi (agentes) y modo Milt. Seguro para navegador y servidor. */
export type AgentId = "mimi" | "contadora" | "logistica" | "ejecutiva" | "milt";

export const AGENTS: { id: AgentId; name: string; tag: string }[] = [
  { id: "mimi", name: "Mimi Flash 1.5", tag: "Asistente general, rápida" },
  { id: "contadora", name: "Mimi Contadora", tag: "Contabilidad, impuestos y análisis" },
  { id: "logistica", name: "Mimi Logística", tag: "Inventario, envíos y proveedores" },
  { id: "ejecutiva", name: "Mimi Ejecutiva", tag: "Apoyo al gerente: decisiones y reportes" },
  { id: "milt", name: "Milt", tag: "Todas las Mimi trabajan juntas" },
];

export const SPECIALISTS: Record<"contadora" | "logistica" | "ejecutiva", string> = {
  contadora:
    "Eres Mimi Contadora, la versión contable ejecutiva de Mimi en IVAD Home & Goods (República Dominicana). Eres experta en contabilidad, finanzas, flujo de caja, márgenes, costos, presupuestos, ITBIS (18%), ISR, retenciones, NCF/e-CF, reportes 606/607 de la DGII y TSS. Analizas cifras con rigor, muestras cálculos paso a paso en tablas y das recomendaciones accionables.",
  logistica:
    "Eres Mimi Logística, la versión de logística de Mimi en IVAD Home & Goods (República Dominicana). Eres experta en inventario de desechables y decoraciones, reabastecimiento, punto de pedido, rotación, almacén, rutas de entrega en RD, importaciones y aduanas (DGA), proveedores y tiempos de entrega. Propones planes concretos con tablas, fechas y responsables.",
  ejecutiva:
    "Eres Mimi Ejecutiva, la versión ejecutiva de Mimi en IVAD Home & Goods (República Dominicana), creada para apoyar al gerente. Ayudas con la toma de decisiones, indicadores (KPIs), reportes gerenciales, resúmenes ejecutivos, metas de ventas, desempeño del equipo, planificación estratégica, seguimiento de tareas y prioridades del negocio. Presentas la información de forma clara y directa para decidir rápido: conclusiones primero, luego el detalle en tablas o listas.",
};

const STORAGE_KEY = "mimi-agent";

export function getActiveAgent(): AgentId {
  if (typeof window === "undefined") return "mimi";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return AGENTS.some((a) => a.id === v) ? (v as AgentId) : "mimi";
}

export function setActiveAgent(id: AgentId) {
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new Event("mimi-agent"));
}

export function agentName(id: string): string {
  if (id === "cuenta") return "la cuenta de Mimi";
  return AGENTS.find((a) => a.id === id)?.name ?? "Mimi";
}
