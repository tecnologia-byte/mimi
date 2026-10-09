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

/** Búsqueda web gratuita (DuckDuckGo HTML), sesgada a República Dominicana. */
export async function searchWeb(query: string, limit = 6): Promise<WebResult[]> {
  const q = query.slice(0, 200);
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=do-es`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MimiIVAD/1.0)" },
    });
    if (!res.ok) return [];
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
      const sn = b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      out.push({ title: decode(titleHtml), url, snippet: sn?.[1] ? decode(sn[1]) : "" });
      if (out.length >= limit) break;
    }
    return out;
  } catch (e) {
    console.error("Búsqueda web falló:", e);
    return [];
  }
}
