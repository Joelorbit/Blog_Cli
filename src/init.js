import fs from "fs/promises";
import path from "path";
import { initProject, getConfig } from "./storage.js";
import { getRemoteUrl, setupRemote } from "./git.js";

export async function init(cwd, remoteUrl) {
  // Check if already initialized
  const existing = await getConfig(cwd);
  if (existing.config && existing.projectRoot !== cwd) {
    console.log(`Already initialized at: ${existing.projectRoot}`);
    console.log(`Posts dir: ${existing.config.postsDir || "posts"}`);
    if (existing.config.remote) {
      console.log(`Remote: ${existing.config.remote}`);
    }
    return;
  }

  console.log("Setting up blog project...\n");

  // Create posts/ and blog.json
  const { postsDir, configPath } = await initProject(cwd, remoteUrl);

  console.log(`Created: posts/`);
  console.log(`Created: blog.json`);

  // Ensure git repo exists
  try {
    await fs.access(path.join(cwd, ".git"));
  } catch {
    console.log("\nInitializing git repository...");
    const { execSync } = await import("child_process");
    execSync("git init", { cwd });
    execSync("git config user.email 'blog@local'", { cwd });
    execSync("git config user.name 'blog'", { cwd });
    console.log("Git repo initialized.");
  }

  // Configure remote if provided
  if (remoteUrl) {
    const result = await setupRemote(cwd, remoteUrl);
    if (result === "added") {
      console.log(`\nRemote configured: ${remoteUrl}`);
    } else if (result === "updated") {
      console.log(`\nRemote updated: ${remoteUrl}`);
    } else {
      console.log(`\nRemote already set: ${remoteUrl}`);
    }
  } else {
    // Try to detect existing remote
    const existing = await getRemoteUrl(cwd);
    if (existing) {
      console.log(`\nDetected existing remote: ${existing}`);
      console.log("To change it, edit blog.json or re-run:");
      console.log(`  blog init --repo https://github.com/USER/REPO.git`);
    } else {
      console.log("\nNo remote configured.");
      console.log("Set one by editing blog.json or re-run:");
      console.log(`  blog init --repo https://github.com/USER/REPO.git`);
    }
  }

  console.log("\nDone. Now publish with:");
  console.log("  blog publish ~/path/to/your-post.md");
}
