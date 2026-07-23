import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

export async function commitAndPush(projectRoot, slug, title, config) {
  const cwd = projectRoot;
  const remote = config.remote || "origin";
  const branch = config.branch || "main";

  // Check if git repo exists
  try {
    await fs.access(path.join(cwd, ".git"));
  } catch {
    console.log("Initializing git repository...");
    execSync("git init", { cwd });
    execSync("git config user.email 'blog@local'", { cwd });
    execSync("git config user.name 'blog'", { cwd });
  }

  // Ensure the configured remote exists
  if (config.remote) {
    let hasRemote = false;
    try {
      execSync("git remote get-url origin", { cwd, stdio: "pipe" });
      hasRemote = true;
    } catch {
      // no remote yet
    }

    if (!hasRemote) {
      execSync(`git remote add origin ${config.remote}`, { cwd });
      console.log(`Added remote: ${config.remote}`);
    }
  }

  // Stage only the posts folder
  execSync("git add posts/", { cwd });

  // Commit
  const msg = `blog: ${title}`;
  try {
    execSync(`git commit -m "${msg}"`, { cwd, stdio: "pipe" });
  } catch {
    return { pushed: false, error: "no_changes" };
  }

  // Push
  try {
    execSync(`git push -u origin ${branch}`, { cwd, stdio: "pipe" });
    return { pushed: true };
  } catch (e) {
    return { pushed: false, error: e.message };
  }
}

export async function getRemoteUrl(projectRoot) {
  try {
    const url = execSync("git remote get-url origin", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    return url;
  } catch {
    return null;
  }
}

export async function setupRemote(projectRoot, remoteUrl) {
  let existing = null;
  try {
    existing = execSync("git remote get-url origin", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
  } catch {
    // no remote
  }

  if (existing) {
    if (existing === remoteUrl) {
      return "already_set";
    }
    // Replace existing remote
    execSync(`git remote set-url origin ${remoteUrl}`, { cwd: projectRoot });
    return "updated";
  }

  execSync(`git remote add origin ${remoteUrl}`, { cwd: projectRoot });
  return "added";
}
