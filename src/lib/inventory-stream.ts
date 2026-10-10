import { tool } from "ai";
import { z } from "zod";

type ConnectionStatus = 'connected' | 'connecting' | 'offline';

let cachedInventory: any[] = [
  { id: "PROD-001", sku: "PROD-001", codigoProducto: "PROD-001", codigoImportacion: null, codigoArancelario: null, detallesSistema: null, nombre: "Vasos plásticos 7oz", stock: 120, limite: 500, prioridad: "Alta" },
  { id: "PROD-002", sku: "PROD-002", codigoProducto: "PROD-002", codigoImportacion: null, codigoArancelario: null, detallesSistema: null, nombre: "Platos desechables nº 9", stock: 50, limite: 300, prioridad: "Crítica" },
  { id: "PROD-003", sku: "PROD-003", codigoProducto: "PROD-003", codigoImportacion: null, codigoArancelario: null, detallesSistema: null, nombre: "Cubiertos plásticos premium", stock: 85, limite: 200, prioridad: "Media" },
];

let cachedSystemAlerts: any[] = [
  { tipo: "Proveedor", mensaje: "Retraso de 2 días en entrega de servilletas.", severidad: "Media" },
  { tipo: "Despacho", mensaje: "Camión de ruta zona norte en mantenimiento.", severidad: "Alta" }
];

let connectionStatus: ConnectionStatus = 'offline';
let lastUpdate: string = new Date().toISOString();
let isConnecting = false;
let eventSourceUrl = "https://utc-constraint-folders-speech.trycloudflare.com/sse";
const fallbackUrl = "https://tycloudflare.com/sse";

export async function startInventoryStream() {
  if (isConnecting || connectionStatus === 'connected') return;
  isConnecting = true;
  connectionStatus = 'connecting';

  const connect = async (url: string, isFallback: boolean = false) => {
    try {
      const response = await fetch(url, {
        headers: {
          "Accept": "text/event-stream",
        },
        signal: AbortSignal.timeout(5000), // Timeout for connection
      });

      if (!response.body || !response.ok) {
        throw new Error("Failed to connect");
      }

      connectionStatus = 'connected';
      isConnecting = false;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            
            try {
              const payload = JSON.parse(dataStr);
              
              if (payload.productos || payload.inventory || payload.lowStock) {
                const rawInventory = payload.productos || payload.inventory || payload.lowStock;
                cachedInventory = rawInventory.map((item: any) => ({
                  ...item,
                  codigoImportacion: item.codigoImportacion ?? item.importCode ?? null,
                  codigoArancelario: item.codigoArancelario ?? item.tariffCode ?? null,
                  codigoProducto: item.codigoProducto ?? item.sku ?? item.id ?? null,
                  sku: item.sku ?? item.codigoProducto ?? item.id ?? null,
                  detallesSistema: item.detallesSistema ?? item.systemDetails ?? null
                }));
              } else if (payload.type === 'inventory_update' && payload.data) {
                const rawInventory = payload.data;
                cachedInventory = rawInventory.map((item: any) => ({
                  ...item,
                  codigoImportacion: item.codigoImportacion ?? item.importCode ?? null,
                  codigoArancelario: item.codigoArancelario ?? item.tariffCode ?? null,
                  codigoProducto: item.codigoProducto ?? item.sku ?? item.id ?? null,
                  sku: item.sku ?? item.codigoProducto ?? item.id ?? null,
                  detallesSistema: item.detallesSistema ?? item.systemDetails ?? null
                }));
              } else if (Array.isArray(payload) && payload.length > 0 && payload[0].stock !== undefined) {
                const rawInventory = payload;
                cachedInventory = rawInventory.map((item: any) => ({
                  ...item,
                  codigoImportacion: item.codigoImportacion ?? item.importCode ?? null,
                  codigoArancelario: item.codigoArancelario ?? item.tariffCode ?? null,
                  codigoProducto: item.codigoProducto ?? item.sku ?? item.id ?? null,
                  sku: item.sku ?? item.codigoProducto ?? item.id ?? null,
                  detallesSistema: item.detallesSistema ?? item.systemDetails ?? null
                }));
              }
              
              if (payload.alertas || payload.alerts) {
                cachedSystemAlerts = payload.alertas || payload.alerts;
              } else if (payload.type === 'alert_update' && payload.data) {
                cachedSystemAlerts = payload.data;
              }

              lastUpdate = new Date().toISOString();
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      if (!isFallback) {
        // Try fallback
        await connect(fallbackUrl, true);
      } else {
        throw error;
      }
    }
  };

  try {
    await connect(eventSourceUrl);
  } catch (error) {
    console.error("Error in inventory stream:", error);
    connectionStatus = 'offline';
    isConnecting = false;
  } finally {
    if (connectionStatus !== 'connected') {
      setTimeout(startInventoryStream, 10000); // Retry after 10s
    } else {
      connectionStatus = 'offline'; 
      setTimeout(startInventoryStream, 2000);
    }
  }
}

if (typeof globalThis !== "undefined" && !(globalThis as any).inventoryStreamStarted && typeof window === "undefined") {
  (globalThis as any).inventoryStreamStarted = true;
  startInventoryStream();
}

export function getInventoryData() {
  return {
    mensaje: connectionStatus === 'connected' ? "Inventario crítico en tiempo real" : "Datos en caché (estado: offline)",
    estadoConexion: connectionStatus,
    productos: cachedInventory,
    timestamp: lastUpdate
  };
}

export function getSystemAlertsData() {
  return {
    estadoConexion: connectionStatus,
    alertas: cachedSystemAlerts,
    timestamp: lastUpdate
  };
}
