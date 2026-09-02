import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const hash = createHash("sha1").update(cwd).digest("hex").slice(0, 10);
const safeRoot = path.join(tmpdir(), "tosol-vitest-safe-copy");
const safeCwd = path.join(safeRoot, `${path.basename(cwd).replace(/[^a-zA-Z0-9._-]/g, "_")}-${hash}`);

mkdirSync(safeRoot, { recursive: true });

if (process.platform === "win32") {
  const copy = spawnSync(
    "robocopy",
    [
      cwd,
      safeCwd,
      "/MIR",
      "/XD",
      ".git",
      ".wrangler",
      ".venv",
      "downloads",
      "/NFL",
      "/NDL",
      "/NJH",
      "/NJS",
    ],
    { shell: true, stdio: "inherit" },
  );

  if ((copy.status ?? 16) > 7) {
    process.exit(copy.status ?? 1);
  }
} else {
  const copy = spawnSync("rsync", ["-a", "--delete", "--exclude", ".git", "--exclude", ".wrangler", `${cwd}/`, `${safeCwd}/`], {
    stdio: "inherit",
  });

  if (copy.status !== 0) {
    process.exit(copy.status ?? 1);
  }
}

const result = spawnSync("node", ["node_modules/vitest/vitest.mjs", ...process.argv.slice(2)], {
  cwd: safeCwd,
  env: { ...process.env, INIT_CWD: safeCwd, PWD: safeCwd },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
