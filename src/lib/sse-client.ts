let cachedInventory: any[] = [];
let cachedSystemAlerts: any[] = [];
let cachedSystemMetrics: any = {};
let cachedCatalog: any[] = [];
let lastUpdate: string = new Date().toISOString();
let isConnecting = false;

export async function startSseClient() {
  if (isConnecting) return;
  isConnecting = true;

  const url = "https://utc-constraint-folders-speech.trycloudflare.com/sse";

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "text/event-stream, application/octet-stream, application/json",
      }
    });

    if (!response.body) {
      isConnecting = false;
      return;
    }

    // Attempt to handle compression if headers indicate it, though fetch usually does this automatically.
    let stream = response.body;
    
    const reader = stream.getReader();
    const textDecoder = new TextDecoder("utf-8");
    let textBuffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      // Heuristic for raw binary (GZIP magic number check: 1f 8b)
      // Note: In modern fetch, gzip is handled natively, but we handle explicit binary payload just in case.
      let chunkStr = "";
      try {
        if (value[0] === 0x1f && value[1] === 0x8b) {
          // It's raw gzip, but we can't easily sync-decompress here without a DecompressionStream pipe
          // If needed, we'd pipe the stream. We'll fallback to textDecoder for now.
          chunkStr = textDecoder.decode(value, { stream: true });
        } else {
          chunkStr = textDecoder.decode(value, { stream: true });
        }
      } catch (e) {
        chunkStr = textDecoder.decode(value, { stream: true });
      }

      textBuffer += chunkStr;
      
      // Try to parse raw JSON objects directly if not SSE
      if (textBuffer.trim().startsWith("{") || textBuffer.trim().startsWith("[")) {
        try {
          // If it's a complete JSON stream
          const parsed = JSON.parse(textBuffer);
          processPayload(parsed);
          textBuffer = ""; // Clear buffer if successful
          continue;
        } catch (e) {
          // Wait for more chunks to complete JSON
        }
      }

      // Handle standard SSE format
      const lines = textBuffer.split(/\r?\n/);
      textBuffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          let dataStr = line.slice(6).trim();
          if (!dataStr) continue;
          
          try {
            // Check if it's base64 encoded binary JSON
            if (!dataStr.startsWith("{") && !dataStr.startsWith("[")) {
              try {
                dataStr = atob(dataStr);
              } catch(e) {}
            }
            
            const payload = JSON.parse(dataStr);
            processPayload(payload);
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }
    }
  } catch (error) {
    console.error("Error SSE/Binary Client:", error);
  } finally {
    isConnecting = false;
    setTimeout(startSseClient, 5000);
  }
}

function processPayload(payload: any) {
  // Store all system data requested by user (catalog, inventory, prices, import codes, metrics)
  if (payload.productos || payload.inventory || payload.lowStock || payload.catalog || payload.catalogo) {
    const rawItems = payload.catalogo || payload.catalog || payload.productos || payload.inventory || payload.lowStock || [];
    const processedItems = rawItems.map((item: any) => ({
      ...item,
      codigoImportacion: item.codigoImportacion ?? item.importCode ?? null,
      codigoArancelario: item.codigoArancelario ?? item.tariffCode ?? null,
      codigoProducto: item.codigoProducto ?? item.sku ?? item.id ?? null,
      sku: item.sku ?? item.codigoProducto ?? item.id ?? null,
      detallesSistema: item.detallesSistema ?? item.systemDetails ?? null,
      precio: item.precio ?? item.price ?? 0,
      stock: item.stock ?? item.quantity ?? 0,
    }));
    
    // Update catalog and inventory
    cachedCatalog = processedItems;
    cachedInventory = processedItems;
  } else if (payload.type === 'inventory_update' && payload.data) {
    const rawInventory = payload.data;
    cachedInventory = rawInventory.map((item: any) => ({
      ...item,
      codigoImportacion: item.codigoImportacion ?? item.importCode ?? null,
      codigoProducto: item.codigoProducto ?? item.sku ?? item.id ?? null,
      precio: item.precio ?? item.price ?? 0,
    }));
  } else if (Array.isArray(payload) && payload.length > 0) {
    cachedCatalog = payload;
    cachedInventory = payload;
  }
  
  if (payload.alertas || payload.alerts) {
    cachedSystemAlerts = payload.alertas || payload.alerts || [];
  } else if (payload.type === 'alert_update' && payload.data) {
    cachedSystemAlerts = payload.data;
  }
  
  if (payload.metrics || payload.metricas || payload.systemMetrics) {
    cachedSystemMetrics = payload.metrics || payload.metricas || payload.systemMetrics;
  }

  lastUpdate = new Date().toISOString();
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

export function getCatalog() {
  return {
    catalogo: cachedCatalog,
    timestamp: lastUpdate
  };
}
