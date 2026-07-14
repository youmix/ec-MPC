/**
 * Cloudflare Workers entry — Amazon Slot Image MCP for ChatGPT.
 * Hosts Streamable HTTP MCP at /mcp.
 *
 * MCP は Slot 固定ルールを返すのみ。画像生成APIは呼ばない。
 * ChatGPT Web が添付画像 + 商品情報 + ルールで画像を生成する。
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer, listToolNames } from "./create-server.js";
import { buildSlotsFromRuleMap } from "./slot-factory.js";
import slot1Rules from "../rules/slot1.md";

// 将来: import slot2Rules from "../rules/slot2.md"; などを追加

const slots = buildSlotsFromRuleMap({
  1: slot1Rules,
  // 2: slot2Rules,
});

const toolNames = listToolNames(slots);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(data: unknown, status = 200): Response {
  return withCors(
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    }),
  );
}

async function handleMcp(request: Request): Promise<Response> {
  const accept = request.headers.get("accept")?.toLowerCase() ?? "";
  const acceptsEventStream = accept.includes("text/event-stream");

  if (request.method === "GET" && !acceptsEventStream) {
    return json({
      status: "ok",
      service: "amazon-slot-image",
      transport: "streamable-http",
      endpoint: "/mcp",
      runtime: "cloudflare-workers",
      slots: slots.map((s) => ({ id: s.id, tool: s.toolName, role: s.roleName })),
      tools: toolNames,
    });
  }

  if (
    request.method !== "POST" &&
    request.method !== "GET" &&
    request.method !== "DELETE"
  ) {
    return json({ error: "Method not allowed" }, 405);
  }

  const server = createMcpServer({ slots });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request);
  void transport.close();
  void server.close();
  return withCors(response);
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method === "OPTIONS") {
        return withCors(new Response(null, { status: 204 }));
      }

      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return json({ status: "ok" });
      }

      if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
        return await handleMcp(request);
      }

      if (url.pathname === "/" || url.pathname === "") {
        return json({
          service: "amazon-slot-image",
          endpoints: { health: "/health", mcp: "/mcp" },
          slots: slots.map((s) => ({ id: s.id, tool: s.toolName, role: s.roleName })),
          tools: toolNames,
        });
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      console.error(error);
      return json({ error: "Internal server error" }, 500);
    }
  },
};
