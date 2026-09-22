import { mkdir } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

const exported = Bun.spawnSync(["nix", "shell", "nixpkgs#dotnet-sdk_9", "--command", "dotnet", "run", "--project", "mod/ContractExport", "--", "packages/contracts/schema"], { stdout: "inherit", stderr: "inherit" });
if (exported.exitCode !== 0) process.exit(exported.exitCode);
await mkdir("packages/contracts/src", { recursive: true });
await Bun.write("packages/contracts/src/game.ts", astToString(await openapiTS(new URL("../packages/contracts/schema/game.openapi.json", import.meta.url))));
console.log("Generated TypeScript from the game API.");
