import { copyFile, mkdir, mkdtemp, readdir, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dir, "..");
const build = Bun.spawnSync([process.execPath, "run", "mod:build"], { cwd: root, stdout: "inherit", stderr: "inherit" });
if (build.exitCode !== 0) process.exit(build.exitCode);
const manifest = await Bun.file(join(root, "mod/VoiceDirector/VoiceDirector.json")).json();
const staging = await mkdtemp(join(tmpdir(), "voice-director-package-"));
const folder = join(staging, "VoiceDirector");
await mkdir(folder);
const output = join(root, "mod/VoiceDirector/bin/Debug/net9.0");
for (const name of await readdir(output))
  if (name.endsWith(".dll") || name === "VoiceDirector.json")
    await copyFile(join(output, name), join(folder, name));
await copyFile(join(root, "mod/VoiceDirector.Bootstrap/bin/Debug/net9.0/VoiceDirector.dll"), join(folder, "VoiceDirector.dll"));
await copyFile(join(root, "docs/player-install.md"), join(folder, "INSTALL.md"));
const archive = join(staging, `VoiceDirector-${manifest.version}.zip`);
const packed = Bun.spawnSync(["zip", "-qr", archive, "VoiceDirector"], { cwd: staging, stdout: "inherit", stderr: "inherit" });
if (packed.exitCode !== 0) process.exit(packed.exitCode);
const releases = join(root, "dist");
await mkdir(releases, { recursive: true });
const destination = join(releases, `VoiceDirector-${manifest.version}.zip`);
await rename(archive, destination);
console.log(`Player download: ${destination}`);
