import { tool } from "ai";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

async function gmail(path: string, init?: RequestInit) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const conn = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovable || !conn) throw new Error("Gmail no está conectado");
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": conn, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Gmail [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const hdr = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

/** Herramientas de Gmail (cuenta de Google de IVAD conectada). */
export function createGmailTools() {
  if (!process.env["GOOGLE_MAIL_API_KEY"]) return {};
  return {
    gmail_buscar: tool({
      description: "Busca correos en el Gmail de IVAD (sintaxis de búsqueda de Gmail, ej. 'is:unread', 'from:proveedor'). Devuelve remitente, asunto, fecha y extracto.",
      inputSchema: z.object({ consulta: z.string(), cantidad: z.number().describe("Máximo 10") }),
      execute: async ({ consulta, cantidad }) => {
        const list = await gmail(`/users/me/messages?maxResults=${Math.min(Math.max(cantidad, 1), 10)}&q=${encodeURIComponent(consulta)}`);
        const ids: { id: string }[] = list.messages ?? [];
        const out = [];
        for (const { id } of ids) {
          const m = await gmail(`/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
          const h = (n: string) => m.payload?.headers?.find((x: { name: string }) => x.name === n)?.value ?? "";
          out.push({ id, de: h("From"), asunto: h("Subject"), fecha: h("Date"), extracto: m.snippet });
        }
        return out;
      },
    }),
    gmail_enviar: tool({
      description: "Envía un correo desde el Gmail de IVAD. SOLO úsala después de que el usuario confirme explícitamente el destinatario, asunto y texto.",
      inputSchema: z.object({ para: z.string(), asunto: z.string(), cuerpo: z.string() }),
      execute: async ({ para, asunto, cuerpo }) => {
        const raw = b64([`To: ${para}`, `Subject: ${hdr(asunto)}`, "MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "", cuerpo].join("\r\n"))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        await gmail("/users/me/messages/send", { method: "POST", body: JSON.stringify({ raw }) });
        return { enviado: true, para };
      },
    }),
  };
}
