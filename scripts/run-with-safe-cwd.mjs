import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/run-with-safe-cwd.mjs <command> [...args]");
  process.exit(1);
}

const cwd = process.cwd();
let safeCwd = cwd;
let mappedDrive;

if (process.platform === "win32" && cwd.includes("#")) {
  for (const letter of "ZYXWVUTSRQPONMLKJIHGFED".split("")) {
    if (!existsSync(`${letter}:\\`)) {
      mappedDrive = `${letter}:`;
      break;
    }
  }

  if (!mappedDrive) {
    throw new Error("No free drive letter available for safe cwd mapping.");
  }

  execFileSync("subst", [mappedDrive, cwd], { stdio: "ignore" });
  safeCwd = `${mappedDrive}\\`;
}

function quoteCmd(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

function commandLine(commandName, commandArgs) {
  const localCmd = process.platform === "win32"
    ? path.join(safeCwd, "node_modules", ".bin", `${commandName}.cmd`)
    : path.join(safeCwd, "node_modules", ".bin", commandName);
  const executable = existsSync(localCmd) ? localCmd : commandName;

  return [quoteCmd(executable), ...commandArgs.map(quoteCmd)].join(" ");
}

try {
  const result = process.platform === "win32"
    ? spawnSync(commandLine(command, args), {
      cwd: safeCwd,
      env: { ...process.env, INIT_CWD: safeCwd, PWD: safeCwd },
      shell: true,
      stdio: "inherit",
    })
    : spawnSync(command, args, {
    cwd: safeCwd,
    env: { ...process.env, INIT_CWD: safeCwd, PWD: safeCwd },
    stdio: "inherit",
    });

  process.exitCode = result.status ?? 1;
} finally {
  if (mappedDrive) {
    try {
      execFileSync("subst", [mappedDrive, "/D"], { stdio: "ignore" });
    } catch {
      // The child process may already have released the mapping.
    }
  }
}
