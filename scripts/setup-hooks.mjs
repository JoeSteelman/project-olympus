import { chmodSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

if (!existsSync(path.resolve(".git"))) {
  process.exit(0);
}

for (const hookName of ["pre-commit", "pre-push"]) {
  const hookPath = path.resolve(".githooks", hookName);
  if (existsSync(hookPath)) {
    chmodSync(hookPath, 0o755);
  }
}

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    stdio: "ignore"
  });
} catch {
  // Skip hook installation if git is unavailable.
}
