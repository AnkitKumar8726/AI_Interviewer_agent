import { createFileRoute } from "@tanstack/react-router";
import {
  continueInterview,
  getSession,
  startInterview,
} from "@/lib/interview-engine.server";
import type { CandidateProfile } from "@/lib/interview-types";

type Body = {
  sessionId?: unknown;
  candidate?: unknown;
  message?: unknown;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/api/interview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
        if (!sessionId) return json({ error: "sessionId is required" }, 400);

        try {
          const existing = getSession(sessionId);

          if (!existing) {
            const candidate = body.candidate as CandidateProfile | undefined;
            if (!candidate?.member?.name || !Array.isArray(candidate.missions)) {
              return json(
                { error: "A candidate object is required to start a new interview session" },
                400,
              );
            }
            return json(await startInterview(sessionId, candidate));
          }

          const message = typeof body.message === "string" ? body.message.trim() : "";
          if (!message) return json({ error: "message is required" }, 400);

          return json(await continueInterview(existing, message));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          const status = /rate limit|429/i.test(message)
            ? 429
            : /credit|402/i.test(message)
              ? 402
              : 500;
          console.error("[/api/interview]", message);
          return json({ error: message }, status);
        }
      },
    },
  },
});
