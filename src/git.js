import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { ROOT } from "./storage.js";

// The one repo everything lives in. Posts are committed into posts/
// and pushed here; your website fetches them from this repo.
const REMOTE_URL = "https://github.com/Joelorbit/Blog_Cli.git";

export async function commitAndPush(slug, title) {
  // All git commands run at the project root
  const cwd = ROOT;

  // Check if git repo exists
  try {
    await fs.access(path.join(cwd, ".git"));
  } catch {
    console.log("Initializing git repository...");
    execSync("git init", { cwd });
    execSync("git config user.email 'blog@local'", { cwd });
    execSync("git config user.name 'blog'", { cwd });
  }

  // Stage only the posts folder — publishing never touches code files
  execSync("git add posts/", { cwd });

  // Commit
  const msg = `blog: ${title}`;
  try {
    execSync(`git commit -m "${msg}"`, { cwd, stdio: "pipe" });
  } catch {
    return { pushed: false, error: "no_changes" };
  }

  // Ensure the remote exists (add it automatically if missing)
  try {
    execSync("git remote get-url origin", { cwd, stdio: "pipe" });
  } catch {
    execSync(`git remote add origin ${REMOTE_URL}`, { cwd });
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
