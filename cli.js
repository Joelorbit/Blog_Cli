#!/usr/bin/env node

import { publish } from "./src/publish.js";
import { init } from "./src/init.js";
import { list } from "./src/list.js";

const args = process.argv.slice(2);
const cwd = process.cwd();

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--repo" && args[i + 1]) {
      flags.repo = args[i + 1];
      i++;
    } else if (args[i] === "--branch" && args[i + 1]) {
      flags.branch = args[i + 1];
      i++;
    } else {
      positional.push(args[i]);
    }
  }
  return { flags, positional };
}

const HELP = `
blog-cli — publish markdown posts from your terminal

Usage:
  blog init [options]              Set up posts/ and blog.json in your project
  blog publish <file.md>           Publish a markdown file as a blog post
  blog list                        List all published posts
  blog --help                      Show this help

Init options:
  --repo <url>     Set your GitHub repo URL (e.g. https://github.com/you/blog)
  --branch <name>  Set the branch to push to (default: main)

Examples:
  blog init --repo https://github.com/you/your-blog.git
  blog publish ~/notes/my-post.md
  blog list

What happens when you publish:
  1. Reads your markdown file
  2. Filename becomes the title
  3. Converts markdown to HTML
  4. Saves JSON to posts/
  5. Commits and pushes to your git repo

Config:
  blog.json in your project root controls where posts go.
  Run "blog init" to create it.
`;

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(HELP);
  process.exit(0);
}

const { flags, positional } = parseFlags(args);
const command = positional[0];

if (command === "init") {
  try {
    await init(cwd, flags.repo);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
} else if (command === "publish") {
  const filePath = positional[1];
  if (!filePath) {
    console.error("Error: Provide a file path");
    console.error("Usage: blog publish ~/Desktop/my-note.md");
    process.exit(1);
  }
  try {
    await publish(filePath, cwd);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
} else if (command === "list") {
  try {
    await list(cwd);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
} else if (command && !command.startsWith("-")) {
  // Backwards compat: `blog ~/note.md` treats first arg as file
  try {
    await publish(command, cwd);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
} else {
  console.error(`Unknown option: ${command || args[0]}`);
  console.error("Run 'blog --help' for usage");
  process.exit(1);
}
