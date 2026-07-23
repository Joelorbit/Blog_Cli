import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

export async function commitAndPush(cwd, slug, title) {
  execSync("git add posts/", { cwd });

  const msg = `blog: ${title}`;
  try {
    execSync("git commit -m " + JSON.stringify(msg), { cwd, stdio: "pipe" });
  } catch {
    return "nothing";
  }

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
