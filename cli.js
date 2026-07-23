#!/usr/bin/env node

import { publish } from "./src/publish.js";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`
publish — publish markdown posts to your GitHub blog

Usage:
  publish <file.md>

Example:
  publish my-post.md
  publish ~/Desktop/draft.md
`);
  process.exit(0);
}

const target = args[0];
try {
  await publish(target);
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
