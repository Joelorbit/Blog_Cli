import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

function checkGitConfig(cwd) {
  try {
    execSync("git config user.name", { cwd, stdio: "pipe" });
  } catch {
    throw new Error("Git user.name not set. Run: git config --global user.name 'Your Name'");
  }
  try {
    execSync("git config user.email", { cwd, stdio: "pipe" });
  } catch {
    throw new Error("Git user.email not set. Run: git config --global user.email 'you@example.com'");
  }
}

export async function commitAndPush(cwd, slug, title) {
  checkGitConfig(cwd);
  execSync("git add posts/", { cwd });

  try {
    const branch = execSync("git branch --show-current", {
      cwd,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    execSync(`git push -u origin ${branch}`, { cwd, stdio: "pipe" });
    return "pushed";
  } catch {
    return "committed";
  }
}
