import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_JESSA_VOICE_ID = "yj30vwTGJxSHezdAGsv9"; // Jessa - Easygoing and Effortless

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            text?: string;
            voiceId?: string;
          };

          const text = (body.text ?? "").trim();
          if (!text) {
            return Response.json({ error: "Texto requerido" }, { status: 400 });
          }

          const apiKey =
            process.env["ELEVENLABS_API_KEY"] ||
            "sk_dc0ac66ec75a986259875b9bd217345e3562135cc4b7295d";

          const voiceId =
            body.voiceId ||
            process.env["ELEVENLABS_VOICE_ID"] ||
            DEFAULT_JESSA_VOICE_ID;

          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: "POST",
              headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
              },
              body: JSON.stringify({
                text: text.slice(0, 2000), // Limitar longitud por seguridad
                model_id: "eleven_multilingual_v2", // Multilingüe para pronunciación natural en español
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.8,
                  style: 0.2,
                  use_speaker_boost: true,
                },
              }),
            },
          );

          if (!response.ok) {
            const errText = await response.text();
            let parsedErr: any = null;
            try {
              parsedErr = JSON.parse(errText);
            } catch {
              parsedErr = { message: errText };
            }

            return Response.json(
              {
                error: parsedErr?.detail?.message || "Error al generar voz en ElevenLabs",
                code: parsedErr?.detail?.code || "unknown",
                status: response.status,
                fallback: true,
              },
              { status: response.status },
            );
          }

          const audioBuffer = await response.arrayBuffer();
          return new Response(audioBuffer, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (err: any) {
          return Response.json(
            {
              error: err?.message || "Error inesperado en servicio TTS",
              fallback: true,
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
