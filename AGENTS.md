<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep first-message upload objects in the client-side pending chat draft until the new chat mounts, because browser File objects cannot be serialized into session storage.
- Keep mobile installation manifest-only unless offline support is explicitly requested, so previews cannot be trapped by stale service-worker caches.
- Push notifications use standard Web Push (VAPID) with a messaging-only worker at public/push-sw.js and a per-minute cron hitting /api/public/hooks/reminders; no Firebase, so no third-party account is needed.
- Mimi DEBE poder consultar y responder sobre CUALQUIER dato del sistema que el usuario pida (catálogo de productos, existencias totales, códigos de importación, almacenes, alertas y consultas generales del sistema), utilizando las herramientas que consumen los datos decodificados que provee el cliente binario en tiempo real.
