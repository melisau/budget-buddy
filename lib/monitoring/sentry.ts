/**
 * Minimal, dependency-free Sentry reporter for server code.
 *
 * Sends events to Sentry's envelope endpoint using the DSN in `SENTRY_DSN`.
 * When the variable is missing, every call is a no-op, so local development
 * and preview builds work without a Sentry project.
 *
 * Privacy: only the internal app user UUID is attached (never email or name),
 * and messages/stacks are truncated.
 */

type Dsn = { publicKey: string; envelopeUrl: string; raw: string };

export type CaptureContext = {
  source?: "client" | "boundary" | "server";
  path?: string | null;
  userId?: string | null;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: "fatal" | "error" | "warning" | "info";
};

let parsedDsn: Dsn | null | undefined;

function getDsn(): Dsn | null {
  if (parsedDsn !== undefined) return parsedDsn;
  const raw = process.env.SENTRY_DSN?.trim();
  if (!raw) return (parsedDsn = null);
  try {
    const url = new URL(raw);
    const projectId = url.pathname.replace(/^\/+|\/+$/g, "").split("/").pop();
    if (!url.username || !projectId) throw new Error("Incomplete DSN");
    parsedDsn = {
      publicKey: url.username,
      envelopeUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      raw,
    };
  } catch {
    console.error("[sentry] SENTRY_DSN is not a valid DSN; error forwarding is disabled.");
    parsedDsn = null;
  }
  return parsedDsn;
}

export function isSentryConfigured(): boolean {
  return getDsn() !== null;
}

const truncate = (value: string | null | undefined, limit: number) => (value ? value.slice(0, limit) : undefined);

function eventId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/** Reports an error or message. Never throws; resolves once sent or timed out. */
export async function captureException(error: unknown, context: CaptureContext = {}): Promise<void> {
  const dsn = getDsn();
  if (!dsn) return;

  const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
  const id = eventId();
  const event = {
    event_id: id,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: context.level ?? "error",
    logger: "budget-buddy",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    server_name: "budget-buddy",
    transaction: truncate(context.path, 200),
    user: context.userId ? { id: context.userId } : undefined,
    tags: { source: context.source ?? "server", ...context.tags },
    exception: {
      values: [{ type: truncate(err.name, 100) ?? "Error", value: truncate(err.message, 1_000) ?? "" }],
    },
    extra: { stack: truncate(err.stack, 6_000), ...context.extra },
  };

  const envelope = [
    JSON.stringify({ event_id: id, sent_at: new Date().toISOString(), dsn: dsn.raw }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  try {
    const response = await fetch(dsn.envelopeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=budget-buddy/1.0, sentry_key=${dsn.publicKey}`,
      },
      body: envelope,
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok && response.status !== 429) {
      console.error(`[sentry] event rejected with HTTP ${response.status}`);
    }
  } catch (sendError) {
    console.error("[sentry] event could not be sent", sendError instanceof Error ? sendError.message : sendError);
  }
}
