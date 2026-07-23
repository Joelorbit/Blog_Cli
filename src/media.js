import fs from "fs/promises";
import path from "path";

const IMAGE_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp", ".ico", ".avif",
]);

export function isImageFile(filePath) {
  return IMAGE_EXTS.has(path.extname(filePath).toLowerCase());
}

export function isLocalPath(src) {
  if (!src) return false;
  if (src.startsWith("http://") || src.startsWith("https://")) return false;
  if (src.startsWith("data:")) return false;
  if (src.startsWith("#")) return false;
  return true;
}

/**
 * Scan a folder for image files.
 * Returns array of { name, path } for each image found.
 */
export async function findImages(dir) {
  const images = [];
  try {
    const entries = await fs.readdir(dir);
    for (const name of entries) {
      const full = path.join(dir, name);
      const stat = await fs.stat(full);
      if (stat.isFile() && isImageFile(name)) {
        images.push({ name, path: full });
      }
    }
  } catch {
    // dir doesn't exist or can't be read
  }
  return images;
}

/**
 * Copy images into posts/<slug>/ and rewrite <img> URLs in HTML.
 * Only copies files that actually exist.
 */
export async function copyImages(images, slug, postsDir) {
  if (images.length === 0) return 0;

  const destDir = path.join(postsDir, slug);
  await fs.mkdir(destDir, { recursive: true });

  let copied = 0;
  for (const img of images) {
    try {
      await fs.access(img.path);
      await fs.copyFile(img.path, path.join(destDir, img.name));
      copied++;
    } catch {
      console.warn(`Warning: could not copy ${img.path}`);
    }
  }
  return copied;
}

/**
 * Rewrite <img src="..."> URLs in HTML to point to posts/<slug>/folder.
 * Only rewrites local paths pointing to files that were copied.
 */
export function rewriteImageUrls(html, slug, imageNames) {
  if (imageNames.length === 0) return html;

  return html.replace(/<img\b([^>]*?)src="([^"]+)"/gi, (match, before, src) => {
    if (!isLocalPath(src)) return match;

    const fileName = path.basename(src);
    if (!imageNames.includes(fileName)) return match;

    return `<img${before}src="./${slug}/${fileName}"`;
  });
}
