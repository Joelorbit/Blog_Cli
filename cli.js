#!/usr/bin/env node

import { publish } from "./src/publish.js";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`
blog-cli — publish posts to github

Usage:
  blog publish <file.md>

Example:
  blog publish my-post.md
`);
  process.exit(0);
}

if (args[0] === "publish") {
  const target = args[1];
  if (!target) {
    console.error("Usage: blog publish my-post.md");
    process.exit(1);
  }
  try {
    await publish(target);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
} else {
  console.error(`Unknown: ${args[0]}`);
  process.exit(1);
}
