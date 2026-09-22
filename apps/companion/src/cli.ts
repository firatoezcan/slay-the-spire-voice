import { token, port } from "./config";
const base = `http://127.0.0.1:${port}`;
const [operation, input = "{}"] = process.argv.slice(2);
if (operation === "open") {
  const url = `${process.argv[3] ?? base}/#token=${encodeURIComponent(token)}`;
  Bun.spawn([process.platform === "darwin" ? "open" : "xdg-open", url], { stdout: "ignore", stderr: "inherit" });
} else {
  const document = await (await fetch(base + "/openapi/json")).json() as any;
  const operations = Object.entries(document.paths).flatMap(([path, methods]) => Object.entries(methods as object).map(([method, value]) => ({ path, method, ...(value as object) }))) as any[];
  if (!operation || operation === "list") console.log(operations.map(o => `${o.operationId}\t${o.method.toUpperCase()} ${o.path}`).join("\n"));
  else {
    const found = operations.find(o => o.operationId === operation);
    if (!found) throw new Error("Unknown operation. Run `bun run cli list`.");
    const args = JSON.parse(input);
    const path = found.path.replace(/\{([^}]+)\}/g, (_: string, key: string) => encodeURIComponent(args.path?.[key] ?? ""));
    const query = new URLSearchParams(args.query ?? {});
    const response = await fetch(base + path + (query.size ? "?" + query : ""), { method: found.method.toUpperCase(), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: found.requestBody ? JSON.stringify(args.body ?? args) : undefined });
    console.log(await response.text()); if (!response.ok) process.exitCode = 1;
  }
}
