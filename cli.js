#!/usr/bin/env node

import { publish } from "./src/publish.js";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`
publish - Publish a markdown file as a blog post

Usage:
  publish <path-to-file.md>

Example:
  publish ~/Desktop/my-note.md

Also works:
  blog publish ~/Desktop/my-note.md

What it does:
  1. Reads your markdown file
  2. Uses filename as title
  3. Converts markdown to HTML
  4. Generates JSON in posts/
  5. Commits and pushes to GitHub
`);
  process.exit(0);
}

// Accept both styles:
//   publish my-note.md          (short — the file is the first argument)
//   blog publish my-note.md     (long — "publish" word, then the file)
let filePath;
if (args[0] === "publish") {
  filePath = args[1];
  if (!filePath) {
    console.error("Error: Provide a file path");
    console.error("Usage: publish ~/Desktop/my-note.md");
    process.exit(1);
  }
} else if (!args[0].startsWith("-")) {
  filePath = args[0];
} else {
  console.error(`Unknown option: ${args[0]}`);
  console.error("Run 'publish --help' for usage");
  process.exit(1);
}

try {
  await publish(filePath);
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
