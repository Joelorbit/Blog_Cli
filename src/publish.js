import fs from "fs/promises";
import path from "path";
import { convertMarkdown } from "./markdown.js";
import { generatePost } from "./post.js";
import { savePost, getConfig, getPostsDir } from "./storage.js";
import { commitAndPush, getRemoteUrl } from "./git.js";

export async function publish(filePath, cwd) {
  const resolved = path.resolve(filePath);

  // Check file exists
  try {
    await fs.access(resolved);
  } catch {
    console.error(`Error: File not found: ${resolved}`);
    process.exit(1);
  }

  // Check it's a markdown file
  const ext = path.extname(resolved).toLowerCase();
  if (![".md", ".markdown", ".txt"].includes(ext)) {
    console.error("Error: File must be .md, .markdown, or .txt");
    process.exit(1);
  }

  // Find the project root and posts dir
  const { config, projectRoot } = await getConfig(cwd);
  const postsDir = path.resolve(projectRoot, config.postsDir || "posts");

  // Ensure posts dir exists
  await fs.mkdir(postsDir, { recursive: true });

  // Step 1: Read the markdown file
  console.log(`Reading file...`);
  const raw = await fs.readFile(resolved, "utf-8");

  // Step 2: Extract title from filename
  const basename = path.basename(resolved, ext);
  const title = basename
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  console.log(`Generated title: ${title}`);

  // Step 3: Generate slug
  const slug = basename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Step 4: Convert markdown to HTML
  const content = convertMarkdown(raw);
  console.log(`Converted markdown`);

  // Step 5: Generate post object
  const post = generatePost(title, slug, content);

  // Step 6: Save to posts/
  console.log(`Created JSON`);
  await savePost(slug, post, postsDir);

  // Step 7: Commit and push
  const result = await commitAndPush(projectRoot, slug, title, config);

  if (result.error === "no_changes") {
    console.log("No changes to commit.");
  } else {
    console.log("Committed changes");

    if (result.pushed) {
      console.log("Pushed to GitHub");
      console.log(`\nPublished successfully`);
    } else if (result.error) {
      console.error(`Push failed: ${result.error}`);
      console.log("Push manually with: git push origin main");
      console.log("\nSaved locally. Push when ready.");
    }
  }

  return { slug, title, postsDir, projectRoot };
}
