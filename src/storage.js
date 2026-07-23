import fs from "fs/promises";
import path from "path";

const CONFIG_FILE = "blog.json";

export async function findConfig(startDir) {
  let dir = startDir;

  while (true) {
    const configPath = path.join(dir, CONFIG_FILE);
    try {
      await fs.access(configPath);
      const raw = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(raw);
      return { config, projectRoot: dir };
    } catch {
      // no config here, go up
    }

    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  return null;
}

export async function getConfig(cwd) {
  const found = await findConfig(cwd);
  if (found) return found;

  // No blog.json found — default to CWD with posts/
  return {
    config: { postsDir: "posts" },
    projectRoot: cwd,
  };
}

export async function initProject(projectRoot, remoteUrl) {
  const postsDir = path.join(projectRoot, "posts");
  await fs.mkdir(postsDir, { recursive: true });

  const indexFile = path.join(postsDir, "index.json");
  try {
    await fs.access(indexFile);
  } catch {
    await fs.writeFile(indexFile, "[]");
  }

  const configPath = path.join(projectRoot, CONFIG_FILE);
  try {
    await fs.access(configPath);
  } catch {
    const config = {
      postsDir: "posts",
      remote: remoteUrl || "",
      branch: "main",
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
  }

  return { postsDir, configPath };
}

export async function getPostsDir(cwd) {
  const { config, projectRoot } = await getConfig(cwd);
  return path.resolve(projectRoot, config.postsDir || "posts");
}

export async function savePost(slug, post, postsDir) {
  await fs.mkdir(postsDir, { recursive: true });

  const postFile = path.join(postsDir, `${slug}.json`);
  await fs.writeFile(postFile, JSON.stringify(post, null, 2));

  const indexFile = path.join(postsDir, "index.json");
  await updateIndex(slug, post, indexFile);
}

async function updateIndex(slug, newPost, indexFile) {
  let posts = [];

  try {
    const data = await fs.readFile(indexFile, "utf-8");
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

  await fs.writeFile(indexFile, JSON.stringify(posts, null, 2));
}
