import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  if (req.method !== "GET") {
    res.writeHead(405, {
      allow: "GET",
      "content-type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  res.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify({ status: "ok" }));
}
