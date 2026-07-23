import fs from "fs/promises";
import path from "path";
import { convertMarkdown } from "./markdown.js";
import { generatePost } from "./post.js";
import { savePost, getConfig } from "./storage.js";
import { commitAndPush } from "./git.js";
import { findImages, copyImages, rewriteImageUrls } from "./media.js";

const MD_EXTS = new Set([".md", ".markdown", ".txt"]);

// ── Resolve input ──────────────────────────────────────────────

async function resolveInput(inputPath) {
  const resolved = path.resolve(inputPath);
  const stat = await fs.stat(resolved);

  if (stat.isDirectory()) {
    return resolveFolder(resolved);
  }

  return resolveFile(resolved);
}

async function resolveFolder(dir) {
  const entries = await fs.readdir(dir);
  const mdFile = entries.find((e) => MD_EXTS.has(path.extname(e).toLowerCase()));

  if (!mdFile) {
    console.error(`Error: No markdown file found in ${dir}`);
    process.exit(1);
  }

  return {
    markdownPath: path.join(dir, mdFile),
    sourceDir: dir,
  };
}

async function resolveFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!MD_EXTS.has(ext)) {
    console.error("Error: File must be .md, .markdown, or .txt");
    process.exit(1);
  }

  return {
    markdownPath: filePath,
    sourceDir: path.dirname(filePath),
  };
}

// ── Generate slug and title from filename ──────────────────────

function slugFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Main publish pipeline ─────────────────────────────────────

export async function publish(inputPath, cwd) {
  // Validate input exists
  const resolved = path.resolve(inputPath);
  try {
    await fs.access(resolved);
  } catch {
    console.error(`Error: Not found: ${resolved}`);
    process.exit(1);
  }

  // Resolve markdown file and source directory
  const { markdownPath, sourceDir } = await resolveInput(resolved);

  // Find project config
  const { config, projectRoot } = await getConfig(cwd);
  const postsDir = path.resolve(projectRoot, config.postsDir || "posts");
  await fs.mkdir(postsDir, { recursive: true });

  // Generate title and slug
  const title = titleFromFilename(markdownPath);
  const slug = slugFromFilename(markdownPath);
  console.log(`Title: ${title}`);

  // Read and convert markdown
  const raw = await fs.readFile(markdownPath, "utf-8");
  let html = convertMarkdown(raw);
  console.log(`Converted markdown`);

  // Find and copy images if any exist
  const images = await findImages(sourceDir);
  if (images.length > 0) {
    const copied = await copyImages(images, slug, postsDir);
    html = rewriteImageUrls(html, slug, images.map((i) => i.name));
    console.log(`Copied ${copied} image${copied > 1 ? "s" : ""}`);
  }

  // Save post JSON
  const post = generatePost(title, slug, html);
  await savePost(slug, post, postsDir);
  console.log(`Saved posts/${slug}.json`);

  // Commit and push
  const result = await commitAndPush(projectRoot, slug, title, config);

  if (result.error === "no_changes") {
    console.log("No changes to commit.");
  } else {
    console.log("Committed");
    if (result.pushed) {
      console.log("Pushed to GitHub");
    } else if (result.error) {
      console.error(`Push failed: ${result.error}`);
      console.log("Run manually: git push origin " + (config.branch || "main"));
    }
  }

  return { slug, title, postsDir, projectRoot };
}
