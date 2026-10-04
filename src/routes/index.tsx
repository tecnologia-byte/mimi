import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/mimi/AppShell";
import { WelcomeScreen } from "@/components/mimi/WelcomeScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mimi — Asistente IA de IVAD Home & Goods" },
      {
        name: "description",
        content:
          "Mimi es la asistente inteligente de IVAD Home & Goods: resume documentos, analiza datos, redacta correos y responde con el conocimiento de la empresa.",
      },
      { property: "og:title", content: "Mimi — Asistente IA de IVAD Home & Goods" },
      {
        property: "og:description",
        content: "Tu asistente inteligente de IVAD: documentos, datos, correos y procesos, en un solo chat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <AppShell>{(userId) => <WelcomeScreen userId={userId} />}</AppShell>;
}
