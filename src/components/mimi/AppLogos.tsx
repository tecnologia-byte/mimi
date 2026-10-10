import React from "react";

interface LogoProps {
  className?: string;
}

/** Logo oficial de Gmail (PNG transparente extraído del archivo proporcionado por el usuario) */
export function GmailLogo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <img
      src="/logos/gmail.png"
      alt="Gmail"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

/** Logo oficial de Google Calendar (PNG transparente extraído del archivo proporcionado por el usuario) */
export function GoogleCalendarLogo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <img
      src="/logos/google-calendar.png"
      alt="Google Calendar"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

/** Logo oficial de Google Drive (PNG transparente extraído del archivo proporcionado por el usuario) */
export function GoogleDriveLogo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <img
      src="/logos/google-drive.png"
      alt="Google Drive"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

/** Logo oficial de Google Sheets (PNG transparente recortado y limpiado del archivo del usuario) */
export function GoogleSheetsLogo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <img
      src="/logos/google-sheets.png"
      alt="Google Sheets"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

/** Logo oficial de Google Docs (PNG transparente oficial) */
export function GoogleDocsLogo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <img
      src="/logos/google-docs.png"
      alt="Google Docs"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

/** Logo oficial de Microsoft Outlook (PNG transparente extraído del archivo proporcionado por el usuario) */
export function OutlookLogo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <img
      src="/logos/outlook.png"
      alt="Microsoft Outlook"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

/** Logo oficial de WhatsApp Business */
export function WhatsAppLogo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={`${className} object-contain`}>
      <circle cx="24" cy="24" r="21" fill="#25D366" />
      <path
        fill="#fff"
        d="M34.5 28.5c-.5-.2-2.8-1.4-3.2-1.5-.4-.2-.8-.2-1.1.2s-1.3 1.5-1.5 1.8c-.3.3-.6.3-1.1.1-.5-.2-2.1-.8-4-2.5-1.5-1.3-2.5-2.9-2.8-3.4-.3-.5 0-.8.2-1 .2-.2.5-.6.7-.9.2-.3.3-.5.5-.8.1-.3 0-.6-.1-.9-.1-.2-1.1-2.7-1.5-3.6-.4-.9-.8-.8-1.1-.8h-1c-.3 0-.9.1-1.4.6-.5.5-1.9 1.8-1.9 4.4 0 2.6 1.9 5.1 2.2 5.5.3.4 3.7 5.7 9 7.9 1.3.5 2.2.9 3 .1 1-.2 3.1-1.3 3.5-2.5.4-1.2.4-2.3.3-2.5-.1-.2-.5-.3-1-.5z"
      />
    </svg>
  );
}

/** Logo oficial de Resend */
export function ResendLogo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={`${className} object-contain`}>
      <rect width="44" height="44" x="2" y="2" rx="10" fill="#000" />
      <path
        fill="#fff"
        d="M15 13h10.5c4.5 0 7.5 2.8 7.5 7 0 3.2-1.8 5.5-4.5 6.4L35 35h-5.2L24 27h-4.2V35H15V13zm4.8 9.8h5.5c2.2 0 3.8-1.2 3.8-2.8 0-1.6-1.6-2.8-3.8-2.8h-5.5v5.6z"
      />
    </svg>
  );
}

/** Logo oficial de Slack */
export function SlackLogo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={`${className} object-contain`}>
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
