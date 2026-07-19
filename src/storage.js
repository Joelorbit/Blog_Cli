import fs from "fs/promises";
import path from "path";

const CONTENT_DIR = "content";
const POSTS_DIR = path.join(CONTENT_DIR, "posts");
const INDEX_FILE = path.join(CONTENT_DIR, "posts.json");

export async function savePost(slug, post) {
  // Ensure directories exist
  await fs.mkdir(POSTS_DIR, { recursive: true });

  // Save individual post
  const postFile = path.join(POSTS_DIR, `${slug}.json`);
  await fs.writeFile(postFile, JSON.stringify(post, null, 2));

  // Update index
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
