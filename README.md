# Blog CLI + Content

One repo for everything: the CLI code lives here, and every post you publish lands in the **`posts/`** folder. Your website fetches posts straight from this repo — no server, no database.

## Requirements

- Node.js 18 or newer
- Git configured with access to this repo

## Setup (one time)

```bash
git clone https://github.com/Joelorbit/Blog_Cli.git
cd Blog_Cli
npm install
npm link     # makes the `publish` command work from ANY folder
```

## How to publish a post

1. Write a markdown file anywhere, e.g. `~/Desktop/my-first-post.md`
2. From **any** folder, run:

```bash
publish ~/Desktop/my-first-post.md
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

Done. The post is live in this repo under `posts/`.

## Rules to know

- **The filename becomes the title.** `my-first-post.md` → "My First Post"
- **Accepted file types:** `.md`, `.markdown`, `.txt`
- **Publishing the same filename again updates that post** (same slug, new content).
- Publishing only ever commits the `posts/` folder — it never touches your code.
- All of these do the same thing: `publish note.md`, `blog note.md`, `blog publish note.md`, `node cli.js publish note.md`
- Get help anytime: `publish --help`

## Repo structure

```
cli.js               ← the command you run
src/                 ← the code (see doc.md for a full walkthrough)
posts/               ← ★ your published posts — your website fetches THIS
  index.json         ← list of all posts (title, slug, date) — newest first
  my-first-post.json ← one file per post, full HTML content
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

## Fetching posts from your website

```javascript
// Get the list of all posts
const res = await fetch("https://raw.githubusercontent.com/Joelorbit/Blog_Cli/main/posts/index.json");
const posts = await res.json();

// Get one full post by slug
const post = await fetch(`https://raw.githubusercontent.com/Joelorbit/Blog_Cli/main/posts/${slug}.json`);
```

## Project files

| File | What it is |
| --- | --- |
| `cli.js` | Entry point — reads your command and runs it |
| `src/publish.js` | The publish pipeline, step by step |
| `src/markdown.js` | Converts markdown → HTML |
| `src/post.js` | Builds the post object (title, slug, content, date) |
| `src/storage.js` | Writes the JSON files into `posts/` |
| `src/git.js` | Commits `posts/` and pushes to GitHub |
| `posts/` | Your published posts (what your website fetches) |

Want to understand how every line of code works? Read **[doc.md](doc.md)**.
