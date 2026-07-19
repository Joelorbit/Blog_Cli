# Blog CLI

Write markdown anywhere on your computer. Publish it to GitHub with one command. Your portfolio reads the posts straight from this repo.

## Requirements

- Node.js 18 or newer
- Git configured with access to this repo

## Setup (one time)

```bash
git clone https://github.com/Joelorbit/Blog_Content.git
cd Blog_Content
npm install
```

## How to publish a post

1. Write a markdown file anywhere, e.g. `~/Desktop/my-first-post.md`
2. Run:

```bash
node cli.js publish ~/Desktop/my-first-post.md
```

You will see:

```
Reading file...
Generated title: My First Post
Converted markdown
Created JSON
Committed changes
Pushed to GitHub

Published successfully
```

Done. The post is live on GitHub.

## Rules to know

- **The filename becomes the title.** `my-first-post.md` → "My First Post"
- **Accepted file types:** `.md`, `.markdown`, `.txt`
- **Publishing the same filename again updates that post** (same slug, new content).
- Get help anytime: `node cli.js --help`

## What ends up in the repo

```
content/
  posts.json           ← index of all posts (title, slug, date) — newest first
  posts/
    my-first-post.json ← one file per post, with the full HTML content
```

## Post JSON format

```json
{
  "title": "My First Post",
  "slug": "my-first-post",
  "content": "<p>HTML content</p>",
  "date": "2026-07-19"
}
```

## Using the posts in your portfolio

```javascript
// Get the list of all posts
const res = await fetch("https://raw.githubusercontent.com/Joelorbit/Blog_Content/main/content/posts.json");
const posts = await res.json();

// Get one full post by slug
const post = await fetch(`https://raw.githubusercontent.com/Joelorbit/Blog_Content/main/content/posts/${slug}.json`);
```

## Project files

| File | What it is |
| --- | --- |
| `cli.js` | Entry point — reads your command and runs it |
| `src/publish.js` | The publish pipeline, step by step |
| `src/markdown.js` | Converts markdown → HTML |
| `src/post.js` | Builds the post object (title, slug, content, date) |
| `src/storage.js` | Writes the JSON files into `content/` |
| `src/git.js` | Commits and pushes to GitHub |
| `content/` | Your published posts (this is what your portfolio fetches) |

Want to understand how every line of code works? Read **[doc.md](doc.md)**.
