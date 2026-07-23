import fs from "fs/promises";
import path from "path";
import { getPostsDir } from "./storage.js";

export async function list(cwd) {
  const postsDir = await getPostsDir(cwd);
  const indexFile = path.join(postsDir, "index.json");

  let posts = [];
  try {
    const data = await fs.readFile(indexFile, "utf-8");
    posts = JSON.parse(data);
  } catch {
    console.log("No posts found. Run `blog publish <file.md>` to create one.");
    return;
  }

  if (posts.length === 0) {
    console.log("No posts yet. Run `blog publish <file.md>` to create one.");
    return;
  }

  console.log(`\n${posts.length} post${posts.length === 1 ? "" : "s"}:\n`);

  for (const post of posts) {
    console.log(`  ${post.date}  ${post.title}  [${post.slug}]`);
  }

  console.log("");
}
