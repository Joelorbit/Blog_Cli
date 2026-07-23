# blog-cli

Publish markdown posts to GitHub from your terminal. No server. No database. No dashboard.

```bash
blog publish my-post.md
```

That's the whole tool.

---

## How it works

1. Write a `.md` or `.txt` file
2. Run `blog publish` — strips images, saves as JSON
3. Commits and pushes to GitHub
4. Your website fetches the JSON from GitHub raw URLs

---

## Prerequisites

- **Node.js 18+** — `node -v` to check
- **Git** — `git --version` to check
- **A GitHub account** and a repo to push posts to

---

## Install

```bash
git clone https://github.com/Joelorbit/Blog_Cli.git
cd Blog_Cli
npm link
```

`npm link` makes the `blog` command available globally. Verify:

```bash
blog --help
```

---

## Make it yours

1. Change `"author"` in `package.json` to your name
2. Create a new repo on GitHub (e.g. `my-blog`)
3. Point the remote to your repo:
   ```bash
   git remote set-url origin https://github.com/YOUR-USER/my-blog.git
   ```

---

## Use

Write a markdown file anywhere, then publish:

```bash
blog publish ~/my-post.md
```

The tool:
- Strips images, keeps only text
- Saves JSON to `posts/<slug>.json`
- Updates `posts/index.json` (newest first)
- Commits and pushes to GitHub

---

## Fetch on your website

```js
// List all posts
const posts = await fetch("https://raw.githubusercontent.com/YOUR-USER/my-blog/main/posts/index.json").then(r => r.json());

// Get one post
const post = await fetch("https://raw.githubusercontent.com/YOUR-USER/my-blog/main/posts/hello.json").then(r => r.json());
```

Replace `YOUR-USER/my-blog` with your GitHub username and repo name.

---

## Requirements

- **Node.js 18+**
- **Git**
- **A GitHub repo** to push posts to

---

MIT