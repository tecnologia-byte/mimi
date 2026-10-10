import React from "react";

interface LogoProps {
  className?: string;
}

/** Logo oficial de Gmail (Google Workspace) */
export function GmailLogo({ className = "h-7 w-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <path
        fill="#4285F4"
        d="M45 16.2l-5 2.75-5 4.75L35 40h7c1.657 0 3-1.343 3-3V16.2z"
        opacity="0"
      />
      {/* Columna izquierda azul */}
      <path
        fill="#4285F4"
        d="M7 38h5V22l-7-5.25V36c0 1.1.9 2 2 2z"
      />
      {/* Columna derecha verde */}
      <path
        fill="#34A853"
        d="M36 38h5c1.1 0 2-.9 2-2V16.75L36 22v16z"
      />
      {/* Pliegue central rojo */}
      <path
        fill="#EA4335"
        d="M36 14.5L24 23.5 12 14.5V10c0-1.6 1.9-2.5 3.1-1.4L24 15l8.9-6.4c1.2-1.1 3.1-.2 3.1 1.4v4.5z"
      />
      {/* Esquina superior izquierda amarilla */}
      <path
        fill="#FBBC04"
        d="M5 16.75L12 22V14.5L6.9 10.7C5.7 9.8 4 10.6 4 12v4c0 .3.1.6.3.8l.7-.05z"
      />
      {/* Esquina superior derecha roja oscura */}
      <path
        fill="#C5221F"
        d="M43 16.75L36 22V14.5l5.1-3.8c1.2-.9 2.9-.1 2.9 1.3v4c0 .3-.1.6-.3.8l-.7-.05z"
      />
    </svg>
  );
}

/** Logo oficial de Google Calendar */
export function GoogleCalendarLogo({ className = "h-7 w-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      {/* Marco de fondo con esquinas de colores Google */}
      <rect width="36" height="36" x="6" y="6" rx="6" fill="#fff" />
      <path fill="#4285F4" d="M12 6h24a6 6 0 0 1 6 6v3H6v-3a6 6 0 0 1 6-6z" />
      <path fill="#EA4335" d="M36 6h6a6 6 0 0 1 6 6v3h-12V6z" />
      <path fill="#FBBC04" d="M6 33h12v9H12a6 6 0 0 1-6-6v-3z" />
      <path fill="#34A853" d="M30 33h12v3a6 6 0 0 1-6 6h-6v-9z" />
      <rect x="10" y="15" width="28" height="18" fill="#fff" />
      {/* Número 31 corporativo en azul Google */}
      <text
        x="24"
        y="30"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="17"
        fontWeight="bold"
        fill="#1A73E8"
        textAnchor="middle"
      >
        31
      </text>
    </svg>
  );
}

/** Logo oficial de Google Drive */
export function GoogleDriveLogo({ className = "h-7 w-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      {/* Franja superior amarilla */}
      <path fill="#FFC107" d="M17 7h14l11 19H28L17 7z" />
      {/* Franja izquierda verde */}
      <path fill="#00AC47" d="M6 26l11-19 11 19-6 10-16-10z" />
      {/* Franja inferior azul */}
      <path fill="#2684FC" d="M17 41h19a6 6 0 0 0 5-3l5-9H28l-11 12z" />
    </svg>
  );
}

/** Logo oficial de Google Sheets */
export function GoogleSheetsLogo({ className = "h-7 w-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      {/* Hoja verde con esquina doblada */}
      <path
        fill="#0F9D58"
        d="M36 42H12a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4h18l10 10v22a4 4 0 0 1-4 4z"
      />
      <path fill="#87CEAB" d="M30 6l10 10H30V6z" opacity="0.6" />
      {/* Cuadrícula de hoja de cálculo en blanco */}
      <rect x="15" y="20" width="18" height="16" rx="1.5" fill="#fff" fillOpacity="0.2" />
      <path
        fill="#fff"
        d="M16 21h16v14H16V21zm2 2v2.5h5V23h-5zm7 0v2.5h5V23h-5zm-7 4.5v2.5h5v-2.5h-5zm7 0v2.5h5v-2.5h-5zm-7 4.5v2.5h5V32h-5zm7 0v2.5h5V32h-5z"
      />
    </svg>
  );
}

/** Logo oficial de Google Docs */
export function GoogleDocsLogo({ className = "h-7 w-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      {/* Hoja azul con esquina doblada */}
      <path
        fill="#4285F4"
        d="M36 42H12a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4h18l10 10v22a4 4 0 0 1-4 4z"
      />
      <path fill="#A1C2FA" d="M30 6l10 10H30V6z" opacity="0.6" />
      {/* Líneas de texto del documento en blanco */}
      <rect x="16" y="21" width="16" height="2.5" rx="1.25" fill="#fff" />
      <rect x="16" y="26.5" width="16" height="2.5" rx="1.25" fill="#fff" />
      <rect x="16" y="32" width="10" height="2.5" rx="1.25" fill="#fff" />
    </svg>
  );
}

/** Logo oficial de Microsoft Outlook */
export function OutlookLogo({ className = "h-7 w-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      {/* Fondo de sobre corporativo azul Microsoft */}
      <path fill="#0078D4" d="M28 8h12a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H28V8z" />
      <path fill="#106EBE" d="M6 14l22-6v32L6 34V14z" />
      <path fill="#005A9E" d="M28 20l16-6v20l-16-6V20z" opacity="0.4" />
      {/* Círculo con la letra O */}
      <circle cx="17" cy="24" r="8" fill="#fff" />
      <circle cx="17" cy="24" r="4.5" fill="#0078D4" />
    </svg>
  );
}

/** Logo oficial de WhatsApp Business */
export function WhatsAppLogo({ className = "h-7 w-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <circle cx="24" cy="24" r="21" fill="#25D366" />
      <path
        fill="#fff"
        d="M34.5 28.5c-.5-.2-2.8-1.4-3.2-1.5-.4-.2-.8-.2-1.1.2s-1.3 1.5-1.5 1.8c-.3.3-.6.3-1.1.1-.5-.2-2.1-.8-4-2.5-1.5-1.3-2.5-2.9-2.8-3.4-.3-.5 0-.8.2-1 .2-.2.5-.6.7-.9.2-.3.3-.5.5-.8.1-.3 0-.6-.1-.9-.1-.2-1.1-2.7-1.5-3.6-.4-.9-.8-.8-1.1-.8h-1c-.3 0-.9.1-1.4.6-.5.5-1.9 1.8-1.9 4.4 0 2.6 1.9 5.1 2.2 5.5.3.4 3.7 5.7 9 7.9 1.3.5 2.2.9 3 .1 1-.2 3.1-1.3 3.5-2.5.4-1.2.4-2.3.3-2.5-.1-.2-.5-.3-1-.5z"
      />
    </svg>
  );
}

/** Logo oficial de Resend */
export function ResendLogo({ className = "h-7 w-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <rect width="44" height="44" x="2" y="2" rx="10" fill="#000" />
      <path
        fill="#fff"
        d="M15 13h10.5c4.5 0 7.5 2.8 7.5 7 0 3.2-1.8 5.5-4.5 6.4L35 35h-5.2L24 27h-4.2V35H15V13zm4.8 9.8h5.5c2.2 0 3.8-1.2 3.8-2.8 0-1.6-1.6-2.8-3.8-2.8h-5.5v5.6z"
      />
    </svg>
  );
}

/** Logo oficial de Slack */
export function SlackLogo({ className = "h-7 w-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <path
        fill="#E01E5A"
        d="M12.5 20.5a3.5 3.5 0 0 1-3.5-3.5V8.5a3.5 3.5 0 0 1 7 0V17a3.5 3.5 0 0 1-3.5 3.5zm-4 3.5a3.5 3.5 0 0 1 3.5-3.5H20a3.5 3.5 0 0 1 0 7H12a3.5 3.5 0 0 1-3.5-3.5z"
      />
      <path
        fill="#36C5F0"
        d="M20.5 35.5a3.5 3.5 0 0 1-3.5 3.5H8.5a3.5 3.5 0 0 1 0-7H17a3.5 3.5 0 0 1 3.5 3.5zm3.5 4a3.5 3.5 0 0 1-3.5-3.5V28a3.5 3.5 0 0 1 7 0v8a3.5 3.5 0 0 1-3.5 3.5z"
      />
      <path
        fill="#2EB67D"
        d="M35.5 27.5a3.5 3.5 0 0 1 3.5 3.5v8.5a3.5 3.5 0 0 1-7 0V31a3.5 3.5 0 0 1 3.5-3.5zm4-3.5a3.5 3.5 0 0 1-3.5 3.5H28a3.5 3.5 0 0 1 0-7h8a3.5 3.5 0 0 1 3.5 3.5z"
      />
      <path
        fill="#ECB22E"
        d="M27.5 12.5a3.5 3.5 0 0 1 3.5-3.5h8.5a3.5 3.5 0 0 1 0 7H31a3.5 3.5 0 0 1-3.5-3.5zm-3.5-4a3.5 3.5 0 0 1 3.5 3.5V20a3.5 3.5 0 0 1-7 0v-8a3.5 3.5 0 0 1 3.5-3.5z"
      />
    </svg>
  );
}
