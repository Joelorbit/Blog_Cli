# blog-cli

Publish markdown files as blog posts from your terminal. No server, no database — just markdown, JSON, and git.

## Prerequisites

- **Node.js 18+** — check with `node -v`
- **Git** — check with `git --version`
- **A GitHub repo** — create an empty one for your blog (e.g. `your-blog`)

## Install

```bash
git clone https://github.com/Joelorbit/Blog_Cli.git
cd Blog_Cli
npm install
npm link
```

`npm link` makes the `blog` command available globally on your machine.

## Quick start

```bash
# 1. Go to your portfolio/blog project folder
cd /path/to/your/portfolio

# 2. Initialize — creates posts/, blog.json, configures your repo
blog init --repo https://github.com/you/your-blog.git

# 3. Write a markdown file (or use an existing one)
echo "# Hello World\n\nMy first post!" > ~/my-first-post.md

# 4. Publish it — converts to HTML, saves JSON, commits, pushes
blog publish ~/my-first-post.md

# 5. See your posts
blog list
```

Each user runs `blog init` with **their own** repo URL. The CLI writes a local `blog.json` with that URL — your posts never touch anyone else's repo.

## How it works

```
your markdown file
        |
        v
  [blog publish]  ----->  posts/
        |                  index.json     (list of all posts)
        v                  <slug>.json    (one file per post)
   git commit + push
```

Your website fetches posts straight from the `posts/` folder — either locally or from GitHub via raw URL.

## Commands

| Command | What it does |
| --- | --- |
| `blog init --repo <url>` | Creates `posts/`, `blog.json`, and configures git remote |
| `blog init --repo <url> --branch <name>` | Same, but pushes to a specific branch (default: `main`) |
| `blog publish <file.md>` | Converts markdown to HTML, saves JSON, commits and pushes |
| `blog list` | Shows all published posts with dates |
| `blog --help` | Shows usage info |

## Config

`blog.json` lives in **your** project root (not shared with other users):

```json
{
  "postsDir": "posts",
  "remote": "https://github.com/you/your-blog.git",
  "branch": "main"
}
```

- `postsDir` — where to save posts (default: `posts`)
- `remote` — your GitHub repo URL (optional, for push)
- `branch` — branch to push to (default: `main`)

The CLI searches up from your current directory to find this file. If none exists, it falls back to a `posts/` folder in the current directory.

## Open source workflow

1. Someone clones this repo
2. They run `blog init --repo https://github.com/THEM/THEIR-BLOG.git`
3. A local `blog.json` is created with **their** repo URL
4. `blog publish note.md` saves to their `posts/` and pushes to **their** repo
5. Their website fetches from `posts/` via GitHub raw URL

Each user has their own config. Nothing is hardcoded to one person's repo.

## Post format

Each post is saved as `posts/<slug>.json`:

```json
{
  "title": "My First Post",
  "slug": "my-first-post",
  "content": "<p>HTML content here</p>",
  "date": "2026-07-19"
}
```

The index (`posts/index.json`) holds all posts without content for cheap listing:

```json
[
  { "title": "My First Post", "slug": "my-first-post", "date": "2026-07-19" }
]
```

## Fetching from your website

Replace `YOU/REPO` with your GitHub username and repo name:

```javascript
// List all posts
const res = await fetch("https://raw.githubusercontent.com/YOU/REPO/main/posts/index.json");
const posts = await res.json();

// Get one post by slug
const slug = "my-first-post";
const post = await fetch(`https://raw.githubusercontent.com/YOU/REPO/main/posts/${slug}.json`);
const data = await post.json();
// data.title, data.content (HTML), data.date
```

The `posts/` folder in your repo is the only thing your website needs. No server, no database — just raw JSON files on GitHub.

## Rules

- Filename becomes the title: `my-post.md` becomes "My Post"
- Accepted extensions: `.md`, `.markdown`, `.txt`
- Re-publishing same filename updates the post (same slug, new content)
- Only `posts/` is committed — your code files are never touched

## Edit or delete a post

**Edit:** change your original markdown file and run `blog publish` on it again. Same filename = same slug = post is replaced.

**Delete:** remove the JSON file and its entry from the index, then commit:

```bash
rm posts/my-post.json
# remove the entry for "my-post" from posts/index.json
git add posts/ && git commit -m "blog: remove my-post" && git push
```

## Project structure

```
cli.js              Entry point
src/
  init.js           Sets up blog.json, posts/, and git remote
  publish.js        The publish pipeline
  markdown.js       Converts markdown to HTML (uses marked)
  post.js           Builds the post object
  storage.js        Writes JSON files, manages config
  git.js            Commits and pushes using config
  list.js           Lists posts from index
posts/              Published posts (what your website fetches)
```

## License

MIT
