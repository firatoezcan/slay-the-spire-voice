import { copyFile, mkdir, readdir, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { dataDir } from "../apps/companion/src/config";

const root = resolve(import.meta.dir, "..");
const running = Bun.spawnSync(["ps", "-ax", "-o", "command="], {
  stdout: "pipe",
});
if (
  running.stdout
    .toString()
    .split("\n")
    .some((line) =>
      line.includes("SlayTheSpire2.app/Contents/MacOS/Slay the Spire 2"),
    )
)
  throw new Error("Save and quit Slay the Spire 2 before installing the mod.");
const companionBuild = Bun.spawnSync([process.execPath, "run", "build"], {
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
});
if (companionBuild.exitCode !== 0) process.exit(companionBuild.exitCode);
const game =
  process.env.STS2_APP ??
  join(
    homedir(),
    "Library/Application Support/Steam/steamapps/common/Slay the Spire 2/SlayTheSpire2.app",
  );
if (
  !(await Bun.file(
    join(game, "Contents/Resources/data_sts2_macos_arm64/sts2.dll"),
  ).exists())
)
  throw new Error("Slay the Spire 2 ARM64 data was not found. Set STS2_APP.");
const build = Bun.spawnSync(
  [
    "nix",
    "shell",
    "nixpkgs#dotnet-sdk_9",
    "--command",
    "dotnet",
    "build",
    "mod/VoiceDirector/VoiceDirector.csproj",
  ],
  { cwd: root, stdout: "inherit", stderr: "inherit" },
);
if (build.exitCode !== 0) process.exit(build.exitCode);
const destination = join(game, "Contents/MacOS/mods/VoiceDirector");
await mkdir(destination, { recursive: true });
const output = join(root, "mod/VoiceDirector/bin/Debug/net9.0");
async function installFile(source: string, name: string) {
  const staged = join(destination, `${name}.${crypto.randomUUID()}.new`);
  await copyFile(source, staged);
  await rename(staged, join(destination, name));
}
for (const name of await readdir(output))
  if (name.endsWith(".dll") || name === "VoiceDirector.json")
    await installFile(join(output, name), name);
await installFile(
  join(root, "mod/VoiceDirector.Bootstrap/bin/Debug/net9.0/VoiceDirector.dll"),
  "VoiceDirector.dll",
);
await writeFile(
  join(dataDir, "launcher.json"),
  JSON.stringify(
    {
      executable: process.execPath,
      arguments: [join(root, "apps/companion/dist/main.js")],
      workingDirectory: root,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
const codex = Bun.which("codex");
if (!codex)
  throw new Error(
    "Install Codex and sign in before installing Voice Director.",
  );
await writeFile(join(dataDir, "toolchain.json"), JSON.stringify({ codex }), {
  mode: 0o600,
});
console.log(`Installed Voice Director in ${destination}`);
