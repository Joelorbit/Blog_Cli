import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

export async function commitAndPush(slug, title) {
  const cwd = process.cwd();

  // Check if git repo exists
  try {
    await fs.access(path.join(cwd, ".git"));
  } catch {
    console.log("Initializing git repository...");
    execSync("git init", { cwd });
    execSync("git config user.email 'blog@local'", { cwd });
    execSync("git config user.name 'blog'", { cwd });
  }

  // Stage content
  execSync("git add content/", { cwd });

  // Commit
  const msg = `blog: ${title}`;
  try {
    execSync(`git commit -m "${msg}"`, { cwd });
  } catch {
    return { pushed: false, error: "no_changes" };
  }

  // Check if remote exists
  let hasRemote = false;
  try {
    const remote = execSync("git remote get-url origin", { cwd, stdio: "pipe" }).toString().trim();
    hasRemote = !!remote;
  } catch {
    hasRemote = false;
  }

  if (!hasRemote) {
    return { pushed: false, error: "no_remote" };
  }

  // Push
  try {
    execSync("git push origin main", { cwd, stdio: "pipe" });
    return { pushed: true };
  } catch {
    try {
      execSync("git push -u origin main", { cwd, stdio: "pipe" });
      return { pushed: true };
    } catch (e) {
      return { pushed: false, error: e.message };
    }
  }
}
