import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { token, port } from "./config";

const base = `http://127.0.0.1:${port}`;
const document = await (await fetch(base + "/openapi/json")).json() as any;
const operations = Object.entries(document.paths).flatMap(([path, methods]) => Object.entries(methods as object).map(([method, value]) => ({ path, method, ...(value as object) }))) as any[];
const tools = operations.filter(o => !o.path.includes("/console") && !o.path.endsWith("/session") && !o.path.includes("/art/"));
function resolveSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(resolveSchema);
  if (schema.$ref) return resolveSchema(document.components.schemas[schema.$ref.split("/").at(-1)]);
  return Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, resolveSchema(value)]));
}
const server = new Server({ name: "voice-director", version: "0.1.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: tools.map(o => ({ name: o.operationId, description: o.summary ?? `${o.method.toUpperCase()} ${o.path}`, inputSchema: {
  type: "object" as const, properties: { body: resolveSchema(o.requestBody?.content?.["application/json"]?.schema ?? { type: "object" }), path: { type: "object", properties: Object.fromEntries((o.parameters ?? []).filter((p: any) => p.in === "path").map((p: any) => [p.name, p.schema])) }, query: { type: "object", properties: Object.fromEntries((o.parameters ?? []).filter((p: any) => p.in === "query").map((p: any) => [p.name, p.schema])) } }
} })) }));
server.setRequestHandler(CallToolRequestSchema, async request => {
  const operation = tools.find(o => o.operationId === request.params.name);
  if (!operation) throw new Error("Unknown operation.");
  const args = request.params.arguments as { body?: unknown; path?: Record<string, string>; query?: Record<string, string> } ?? {};
  const path = operation.path.replace(/\{([^}]+)\}/g, (_: string, key: string) => encodeURIComponent(args.path?.[key] ?? ""));
  const query = new URLSearchParams(args.query ?? {});
  const response = await fetch(base + path + (query.size ? "?" + query : ""), { method: operation.method.toUpperCase(), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: operation.requestBody ? JSON.stringify(args.body ?? {}) : undefined });
  return { isError: !response.ok, content: [{ type: "text" as const, text: await response.text() }] };
});
await server.connect(new StdioServerTransport());
