#!/usr/bin/env node

import { publish } from "./src/publish.js";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
blog - Publish markdown files as blog posts

Usage:
  blog publish <path-to-file.md>

Example:
  blog publish ~/Desktop/my-note.md

What it does:
  1. Reads your markdown file
  2. Uses filename as title
  3. Converts markdown to HTML
  4. Generates JSON
  5. Commits and pushes to GitHub
`);
  process.exit(0);
}

const command = args[0];

if (command === "publish") {
  const filePath = args[1];
  if (!filePath) {
    console.error("Error: Provide a file path");
    console.error("Usage: blog publish ~/Desktop/my-note.md");
    process.exit(1);
  }
  try {
    await publish(filePath);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Run 'blog --help' for usage");
  process.exit(1);
}
