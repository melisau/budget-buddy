import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

test("captureException sends a Sentry envelope without personal data", async () => {
  const received: { url?: string; auth?: string; body: string } = { body: "" };
  const server = createServer((request, response) => {
    received.url = request.url;
    received.auth = String(request.headers["x-sentry-auth"]);
    request.on("data", (chunk) => { received.body += chunk; });
    request.on("end", () => { response.writeHead(200); response.end("{}"); });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  process.env.SENTRY_DSN = `http://publickey123@127.0.0.1:${port}/4242`;

  try {
    const { captureException, isSentryConfigured } = await import("../lib/monitoring/sentry.ts");
    assert.equal(isSentryConfigured(), true);
    await captureException(new TypeError("boom"), { source: "client", path: "/dashboard", userId: "app-user-uuid" });

    assert.equal(received.url, "/api/4242/envelope/");
    assert.match(received.auth ?? "", /sentry_key=publickey123/);
    const [header, item, event] = received.body.split("\n").map((line) => JSON.parse(line));
    assert.equal(header.event_id, event.event_id);
    assert.equal(item.type, "event");
    assert.equal(event.exception.values[0].type, "TypeError");
    assert.equal(event.exception.values[0].value, "boom");
    assert.deepEqual(event.user, { id: "app-user-uuid" });
    assert.equal(event.tags.source, "client");
  } finally {
    server.close();
    delete process.env.SENTRY_DSN;
  }
});
