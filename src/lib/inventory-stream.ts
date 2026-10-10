import { tool } from "ai";
import { z } from "zod";

type ConnectionStatus = 'connected' | 'connecting' | 'offline';

let cachedInventory: any[] = [];

let cachedSystemAlerts: any[] = [];

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

export async function directFetchIfEmpty() {
  if (cachedInventory.length > 0) return;

  try {
    const response = await fetch(eventSourceUrl, {
      headers: { "Accept": "text/event-stream" },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      cachedSystemAlerts = [{ mensaje: `Error HTTP ${response.status}: El endpoint puede estar caído.` }];
      connectionStatus = 'offline';
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const text = await response.clone().text();
      if (text.includes("Cloudflare") || response.status === 502 || response.status === 530) {
        cachedSystemAlerts = [{ mensaje: "Error 530/502: El túnel de Cloudflare expiró o está caído del lado del usuario. Por favor, reinicia el túnel." }];
        connectionStatus = 'offline';
        return;
      }
    }

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const timeout = Date.now() + 5000;
    while (Date.now() < timeout) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      let found = false;
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
              found = true;
            } else if (Array.isArray(payload) && payload.length > 0) {
              cachedInventory = payload;
              found = true;
            }
            if (payload.alertas || payload.alerts) {
              cachedSystemAlerts = payload.alertas || payload.alerts;
              found = true;
            }
          } catch (e) {}
        }
      }
      if (found) {
        connectionStatus = 'connected';
        lastUpdate = new Date().toISOString();
        reader.cancel();
        return;
      }
    }
    reader.cancel();
  } catch (error: any) {
    cachedSystemAlerts = [{ mensaje: `Error de conexión: ${error.message}. ¿Túnel cerrado?` }];
    connectionStatus = 'offline';
  }
}

export async function getInventoryData() {
  await directFetchIfEmpty();
  const alert = cachedSystemAlerts.find(a => a.mensaje && a.mensaje.includes("Error"));
  const offlineMsg = alert ? alert.mensaje : "Datos en caché (estado: offline)";
  return {
    mensaje: connectionStatus === 'connected' ? "Inventario crítico en tiempo real" : offlineMsg,
    estadoConexion: connectionStatus,
    productos: cachedInventory,
    timestamp: lastUpdate
  };
}

export async function getSystemAlertsData() {
  await directFetchIfEmpty();
  return {
    estadoConexion: connectionStatus,
    alertas: cachedSystemAlerts,
    timestamp: lastUpdate
  };
}
