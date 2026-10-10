export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

/** Búsqueda web gratuita (DuckDuckGo HTML y Lite), sesgada a República Dominicana. */
export async function searchWeb(query: string, limit = 5): Promise<WebResult[]> {
  const q = query.replace(/--- Documento:[\s\S]*$/, "").trim().slice(0, 180);
  if (!q) return [];

  // 1. Intento principal con DuckDuckGo HTML (máximo 3s para respuesta rápida)
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=do-es`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const html = await res.text();
      const out: WebResult[] = [];
      const blocks = html.split("result__body").slice(1);
      for (const b of blocks) {
        const a = b.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<a[^>]*href="([^"]+)"[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/);
        if (!a) continue;
        const href = a[1] ?? a[3] ?? "";
        const titleHtml = a[2] ?? a[4] ?? "";
        let url = href.replace(/&amp;/g, "&");
        const u = url.match(/uddg=([^&]+)/);
        if (u?.[1]) url = decodeURIComponent(u[1]);
        if (url.startsWith("//")) url = "https:" + url;
        if (!url.startsWith("http") || url.includes("duckduckgo.com/y.js")) continue;

        let cleanTitle = decode(titleHtml);
        if (!cleanTitle || cleanTitle.toLowerCase() === "duckduckgo") {
          try {
            cleanTitle = new URL(url).hostname.replace(/^www\./, "");
          } catch {
            cleanTitle = "Fuente web";
          }
        }

        const sn = b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        out.push({ title: cleanTitle, url, snippet: sn?.[1] ? decode(sn[1]) : "" });
        if (out.length >= limit) break;
      }
      if (out.length > 0) return out;
    }
  } catch (e) {
    console.error("Búsqueda web HTML falló, intentando alternativa:", e);
  }

  // 2. Fallback con DuckDuckGo Lite si el endpoint HTML devuelve vacío o falla
  try {
    const resLite = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}&kl=do-es`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(2500),
    });
    if (resLite.ok) {
      const html = await resLite.text();
      const out: WebResult[] = [];
      const links = [...html.matchAll(/<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
      for (const m of links) {
        let url = m[1].replace(/&amp;/g, "&");
        const u = url.match(/uddg=([^&]+)/);
        if (u?.[1]) url = decodeURIComponent(u[1]);
        if (url.startsWith("//")) url = "https:" + url;
        if (!url.startsWith("http") || url.includes("duckduckgo.com/y.js")) continue;

        let cleanTitle = decode(m[2]);
        if (!cleanTitle || cleanTitle.toLowerCase() === "duckduckgo") {
          try {
            cleanTitle = new URL(url).hostname.replace(/^www\./, "");
          } catch {
            cleanTitle = "Fuente web";
          }
        }
        out.push({ title: cleanTitle, url, snippet: "" });
        if (out.length >= limit) break;
      }
      if (out.length > 0) return out;
    }
  } catch (e) {
    console.error("Búsqueda web Lite falló:", e);
  }

  return [];
}
