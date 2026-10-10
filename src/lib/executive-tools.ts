import { tool } from "ai";
import { z } from "zod";
import { getInventoryData, getSystemAlertsData } from "./inventory-stream";

export function createExecutiveTools() {
  return {
    get_low_stock_products: tool({
      description: "Consulta los productos próximos a agotarse en tiempo real y el stock crítico. Si los datos incluyen 'código de importación', 'partida arancelaria' o 'SKU', asegúrate de formatearlos y entregarlos explícitamente en tu respuesta.",
      parameters: z.object({}),
      execute: async () => {
        return getInventoryData();
      },
    }),
    consultar_inventario_critico: tool({
      description: "Consulta los productos próximos a agotarse en tiempo real y el stock crítico. Si los datos incluyen 'código de importación', 'partida arancelaria' o 'SKU', asegúrate de formatearlos y entregarlos explícitamente en tu respuesta.",
      parameters: z.object({}),
      execute: async () => {
        return getInventoryData();
      },
    }),
    alertas_sistema: tool({
      description: "Consulta las alertas activas del sistema (retrasos de proveedores, problemas de despacho).",
      parameters: z.object({}),
      execute: async () => {
        return getSystemAlertsData();
      }
    })
  };
}
