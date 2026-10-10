import { tool } from "ai";
import { z } from "zod";
import { getInventoryData, getSystemAlertsData } from "./inventory-stream";

export function createExecutiveTools() {
  return {
    get_low_stock_products: tool({
      description: "Consulta los productos próximos a agotarse en tiempo real y el stock crítico. Si los datos incluyen 'código de importación', 'partida arancelaria' o 'SKU', asegúrate de formatearlos y entregarlos explícitamente en tu respuesta.",
      parameters: z.object({}),
      execute: async () => {
        const data = getInventoryData();
        if (!data.productos || data.productos.length === 0 || data.productos.some((p: any) => p.id === 'PROD-001')) {
          return "El sistema en tiempo real no reporta productos críticos en este momento (o el stream está a la espera de nuevos eventos del sistema)";
        }
        return data;
      },
    }),
    consultar_inventario_critico: tool({
      description: "Consulta los productos próximos a agotarse en tiempo real y el stock crítico. Si los datos incluyen 'código de importación', 'partida arancelaria' o 'SKU', asegúrate de formatearlos y entregarlos explícitamente en tu respuesta.",
      parameters: z.object({}),
      execute: async () => {
        const data = getInventoryData();
        if (!data.productos || data.productos.length === 0 || data.productos.some((p: any) => p.id === 'PROD-001')) {
          return "El sistema en tiempo real no reporta productos críticos en este momento (o el stream está a la espera de nuevos eventos del sistema)";
        }
        return data;
      },
    }),
    alertas_sistema: tool({
      description: "Consulta las alertas activas del sistema (retrasos de proveedores, problemas de despacho).",
      parameters: z.object({}),
      execute: async () => {
        const data = getSystemAlertsData();
        if (!data.alertas || data.alertas.length === 0 || data.alertas.some((a: any) => a.mensaje && a.mensaje.includes('servilletas'))) {
          return "El sistema en tiempo real no reporta alertas críticas en este momento (o el stream está a la espera de nuevos eventos del sistema)";
        }
        return data;
      }
    })
  };
}
