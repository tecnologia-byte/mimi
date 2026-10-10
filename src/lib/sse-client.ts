let cachedInventory: any[] = [];
let cachedSystemAlerts: any[] = [];
let cachedSystemMetrics: any = {};
let lastUpdate: string = new Date().toISOString();
let isConnecting = false;

export async function startSseClient() {
  if (isConnecting) return;
  isConnecting = true;

  const url = "https://utc-constraint-folders-speech.trycloudflare.com/sse";

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "text/event-stream",
      }
    });

    if (!response.body) {
      isConnecting = false;
      return;
    }

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
              const rawInventory = payload.productos || payload.inventory || payload.lowStock || [];
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
              cachedSystemAlerts = payload.alertas || payload.alerts || [];
            } else if (payload.type === 'alert_update' && payload.data) {
              cachedSystemAlerts = payload.data;
            }
            
            if (payload.metrics || payload.metricas) {
              cachedSystemMetrics = payload.metrics || payload.metricas;
            }

            lastUpdate = new Date().toISOString();
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (error) {
    console.error("Error SSE Client:", error);
  } finally {
    isConnecting = false;
    setTimeout(startSseClient, 5000);
  }
}

if (typeof globalThis !== "undefined" && !(globalThis as any).sseStarted && typeof window === "undefined") {
  (globalThis as any).sseStarted = true;
  startSseClient();
}

export function getInventoryStatus() {
  return {
    mensaje: cachedInventory.length > 0 ? "Inventario crítico consultado con éxito en tiempo real." : "Esperando datos en tiempo real...",
    productos: cachedInventory,
    timestamp: lastUpdate
  };
}

export function getSystemAlerts() {
  return {
    alertas: cachedSystemAlerts,
    metricas: cachedSystemMetrics,
    timestamp: lastUpdate
  };
}
