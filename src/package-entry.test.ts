import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

test("package entry loads from node_modules without type stripping", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "realtime-avatar-tap-consumer-"));
  try {
    const packageDir = path.join(dir, "node_modules", "realtime-avatar-tap");
    await mkdir(path.dirname(packageDir), { recursive: true });
    await symlink(repoRoot, packageDir);
    const consumerPath = path.join(dir, "consumer.mjs");
    await writeFile(
      consumerPath,
      `import { emitAvatarBlock, openSession } from "realtime-avatar-tap";
const session = openSession({ audioIn: "mic", videoOut: "avatar" });
const block = emitAvatarBlock(session);
if (block.t0Ms !== 0 || block.durationMs !== 40 || block.lip !== "closed" || block.pose !== "rest") {
  throw new Error("unexpected block");
}
`,
    );
    await execFileAsync(process.execPath, [consumerPath], { cwd: dir });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
