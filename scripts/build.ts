import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const dashboard = Bun.spawnSync([process.execPath, "run", "--cwd", "apps/dashboard", "build"], { cwd: root, stdout: "inherit", stderr: "inherit" });
if (dashboard.exitCode !== 0) process.exit(dashboard.exitCode);
const build = await Bun.build({
  entrypoints: ["main", "cli", "mcp", "providers/codex-worker", "providers/speech-worker"].map(name => resolve(root, "apps/companion/src", name + ".ts")),
  root: resolve(root, "apps/companion/src"),
  outdir: resolve(root, "apps/companion/dist"),
  naming: "[dir]/[name].js", target: "bun", packages: "external",
});
if (!build.success) { console.error(build.logs); process.exit(1); }
console.log("Built the dashboard, companion, CLI, MCP server, and generation workers.");
