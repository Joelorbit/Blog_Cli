import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { commitAndPush } from "./git.js";

const scriptDir = path.dirname(
  fs.realpathSync(fileURLToPath(import.meta.url))
);

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function title(name) {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripImages(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function publish(inputPath) {
  const filePath = path.resolve(inputPath);
  const ext = path.extname(filePath).toLowerCase();
  if (![".md", ".markdown", ".txt"].includes(ext)) {
    throw new Error("File must be .md, .markdown, or .txt");
  }

  const baseName = path.basename(filePath, ext);
  const raw = await fsp.readFile(filePath, "utf-8");

  const post = {
    title: title(baseName),
    slug: slug(baseName),
    content: stripImages(raw),
    date: new Date().toISOString().split("T")[0],
  };

  const gitRoot = await findGitRoot();
  const postsDir = path.join(gitRoot, "posts");
  await fsp.mkdir(postsDir, { recursive: true });

  await fsp.writeFile(
    path.join(postsDir, `${post.slug}.json`),
    JSON.stringify(post, null, 2)
  );
  console.log(`Saved posts/${post.slug}.json`);

  await updateIndex(postsDir, post);

  const result = await commitAndPush(gitRoot, post.slug, post.title);
  if (result === "pushed") console.log("Pushed to GitHub");
  else if (result === "committed") console.log("Committed (push failed)");
  else console.log("Nothing to commit");
}

async function findGitRoot() {
  let dir = scriptDir;
  while (true) {
    try {
      await fsp.access(path.join(dir, ".git"));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) throw new Error("Not inside a git repo. Run from inside your blog repo.");
      dir = parent;
    }
  }
}

async function updateIndex(postsDir, post) {
  const indexFile = path.join(postsDir, "index.json");
  let posts = [];
  try {
    posts = JSON.parse(await fsp.readFile(indexFile, "utf-8"));
  } catch {}
  posts = posts.filter((p) => p.slug !== post.slug);
  posts.unshift({ title: post.title, slug: post.slug, date: post.date });
  await fsp.writeFile(indexFile, JSON.stringify(posts, null, 2));
}
