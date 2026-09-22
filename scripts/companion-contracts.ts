import openapiTS, { astToString } from "openapi-typescript";
import { app } from "../apps/companion/src/app";
const response = await app.handle(new Request("http://localhost/openapi/json"));
if (!response.ok) throw new Error(`Schema export failed: ${response.status}`);
const schema = await response.json();
await Bun.write("packages/contracts/schema/companion.openapi.json", JSON.stringify(schema, null, 2) + "\n");
await Bun.write("packages/contracts/src/companion.ts", astToString(await openapiTS(schema)));
console.log("Generated companion API schema and TypeScript client types.");
