import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Absolute path to the project root (the folder containing cli.js),
// so publishing works no matter which directory you run the command from.
export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const POSTS_DIR = path.join(ROOT, "posts");
const INDEX_FILE = path.join(POSTS_DIR, "index.json");

export async function savePost(slug, post) {
  // Ensure the posts/ folder exists
  await fs.mkdir(POSTS_DIR, { recursive: true });

  // Save individual post: posts/<slug>.json
  const postFile = path.join(POSTS_DIR, `${slug}.json`);
  await fs.writeFile(postFile, JSON.stringify(post, null, 2));

  // Update the index: posts/index.json
  await updateIndex(slug, post);
}

async function updateIndex(slug, newPost) {
  let posts = [];

  // Read existing index if it exists
  try {
    const data = await fs.readFile(INDEX_FILE, "utf-8");
    posts = JSON.parse(data);
  } catch {
    // No index yet, start empty
  }

  // Remove old version of this post if it exists
  posts = posts.filter((p) => p.slug !== slug);

  // Add new post (without full content for index)
  posts.unshift({
    title: newPost.title,
    slug: newPost.slug,
    date: newPost.date,
  });

  // Write index
  await fs.writeFile(INDEX_FILE, JSON.stringify(posts, null, 2));
}
