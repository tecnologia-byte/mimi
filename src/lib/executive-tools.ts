import { tool } from "ai";
import { z } from "zod";
import { getInventoryData, getSystemAlertsData } from "./inventory-stream";

export function createExecutiveTools() {
  return {
    consultar_datos_sistema: tool({
      description: "Consulta y responde sobre CUALQUIER dato del sistema en tiempo real. Esto incluye el catálogo completo de productos, existencias totales, códigos de importación, almacenes, alertas, inventario crítico y consultas generales del sistema consumiendo los datos decodificados del cliente binario.",
      parameters: z.object({
        query: z.string().describe("La consulta específica sobre el sistema o inventario, por ejemplo 'catálogo de productos', 'existencias totales', 'códigos de importación', 'alertas', etc.")
      }),
      execute: async () => {
        const inventory = await getInventoryData();
        const alerts = await getSystemAlertsData();
        return {
          inventario: inventory,
          alertas: alerts,
          estado_sistema: "En línea, procesando stream binario en tiempo real"
        };
      },
    }),
    get_low_stock_products: tool({
      description: "Consulta los productos próximos a agotarse en tiempo real y el stock crítico. Si los datos incluyen 'código de importación', 'partida arancelaria' o 'SKU', asegúrate de formatearlos y entregarlos explícitamente en tu respuesta.",
      parameters: z.object({}),
      execute: async () => {
        const data = await getInventoryData();
        if (data.estadoConexion === 'offline' && (!data.productos || data.productos.length === 0)) {
          return `No se pudo conectar al sistema en tiempo real. Estado: ${data.estadoConexion}. Mensaje: ${data.mensaje}`;
        }
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
        const data = await getInventoryData();
        if (data.estadoConexion === 'offline' && (!data.productos || data.productos.length === 0)) {
          return `No se pudo conectar al sistema en tiempo real. Estado: ${data.estadoConexion}. Mensaje: ${data.mensaje}`;
        }
        if (!data.productos || data.productos.length === 0 || data.productos.some((p: any) => p.id === 'PROD-001')) {
          return "El sistema en tiempo real no reporta productos críticos en este momento (o el stream está a la espera de nuevos eventos del sistema)";
        }
        return data;
      },
    }),
    alertas_sistema: tool({
      description: "Consulta las alertas activas del sistema (retrasos de proveedores, problemas de despacho, etc.) consumiendo el stream en tiempo real.",
      parameters: z.object({}),
      execute: async () => {
        const data = await getSystemAlertsData();
        if (!data.alertas || data.alertas.length === 0 || data.alertas.some((a: any) => a.mensaje && a.mensaje.includes('servilletas'))) {
          return "El sistema en tiempo real no reporta alertas críticas en este momento (o el stream está a la espera de nuevos eventos del sistema)";
        }
        return data;
      }
    })
  };
}
