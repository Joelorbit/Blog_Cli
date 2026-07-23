# blog-cli

Publish markdown files as blog posts from your terminal. No server, no database — just markdown, JSON, and git.

**What it does:** You write a `.md` file, run `blog publish`, and it converts to HTML, saves as JSON, commits to git, and pushes to GitHub. Your website fetches the JSON files directly from your repo.

---

## What You Need Before Starting

1. **Node.js 18+** — check with `node -v`. If not installed, download from [nodejs.org](https://nodejs.org)
2. **Git** — check with `git --version`. If not installed, download from [git-scm.com](https://git-scm.com)
3. **A GitHub account** — sign up at [github.com](https://github.com)
4. **An empty GitHub repo** — create one for your blog (e.g. `my-blog`). Don't initialize it with anything.

---

## Step 1: Install blog-cli

```bash
git clone https://github.com/Joelorbit/Blog_Cli.git
cd Blog_Cli
npm install
npm link
```

After `npm link`, the `blog` command is available globally. Verify it works:

```bash
blog --help
```

You should see the help text. If you get "command not found", run `npm link` again from the `Blog_Cli` folder.

---

## Step 2: Initialize Your Blog

Go to the folder where you want your blog to live (your portfolio, your website project, anywhere):

```bash
cd /path/to/your/portfolio
```

Initialize with YOUR GitHub repo URL:

```bash
blog init --repo https://github.com/YOUR-USERNAME/YOUR-BLOG-REPO.git
```

Replace `YOUR-USERNAME/YOUR-BLOG-REPO` with your actual GitHub username and repo name.

This creates:
- `posts/` folder with an empty `index.json`
- `blog.json` with your repo URL
- Configures git remote to point to your repo

If you want to push to a branch other than `main`:

```bash
blog init --repo https://github.com/YOU/YOUR-BLOG.git --branch develop
```

---

## Step 3: Write a Markdown File

Create a markdown file, or a folder with a markdown file + images:

**Single file (text only):**
```bash
echo "# Hello World

This is my first blog post." > ~/Desktop/my-first-post.md
```

**Folder (with images):**
```
my-first-post/
  my-first-post.md      ← your post
  photo.jpg             ← images go here
  diagram.png           ← any images you reference
```

The filename becomes the title:
- `my-first-post.md` → "My First Post"
- `how-to-learn-javascript.md` → "How to Learn Javascript"

Accepted extensions: `.md`, `.markdown`, `.txt`

### Images

Reference images in your markdown with standard syntax:

```markdown
# My Post

Here's a photo:

![Beach photo](./photo.jpg)
```

When you publish:
- If images exist in the same folder → they're copied to `posts/<slug>/` and URLs are rewritten
- If no images → just processes the text, nothing extra created

Supported image formats: PNG, JPG, JPEG, GIF, SVG, WebP, BMP, ICO, AVIF

---

## Step 4: Publish It

```bash
blog publish ~/Desktop/my-first-post.md
```

What happens:
1. Reads your markdown file
2. Converts markdown to HTML (GitHub Flavored Markdown)
3. Creates `posts/my-first-post.json` with title, slug, HTML content, and date
4. Updates `posts/index.json` (the list of all posts)
5. Commits the changes
6. Pushes to your GitHub repo

You should see:
```
Reading file...
Generated title: My First Post
Converted markdown
Created JSON
Committed changes
Pushed to GitHub

Published successfully
```

---

## Step 5: Verify It Worked

Check your posts:

```bash
blog list
```

You should see:
```
1 post:

  2026-07-23  My First Post  [my-first-post]
```

Go to your GitHub repo. You'll see a `posts/` folder with:
- `index.json` — the list of all posts
- `my-first-post.json` — your first post

---

## Step 6: Fetch From Your Website

In your website's JavaScript, fetch the posts from GitHub:

```javascript
// List all posts
const res = await fetch("https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-BLOG-REPO/main/posts/index.json");
const posts = await res.json();

// posts = [{ title: "My First Post", slug: "my-first-post", date: "2026-07-23" }]

// Get one post
const slug = "my-first-post";
const postRes = await fetch(`https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-BLOG-REPO/main/posts/${slug}.json`);
const post = await postRes.json();

// post.title   = "My First Post"
// post.content = "<h1>Hello World</h1>..." (HTML)
// post.date    = "2026-07-23"
```

Replace `YOUR-USERNAME/YOUR-BLOG-REPO` with your actual GitHub username and repo name.

---

## Step 7: Publish More Posts

Write more markdown files and publish them:

```bash
blog publish ~/Documents/second-post.md
blog publish ~/Notes/third-post.md
blog list
```

Each publish:
- Creates a new `<slug>.json` in `posts/`
- Adds it to the front of `index.json` (newest first)
- Commits and pushes

---

## Editing and Deleting Posts

### Edit a post
Change your original markdown file and publish again:

```bash
# Edit the file
nano ~/Desktop/my-first-post.md

# Re-publish — same filename = same slug = post is replaced
blog publish ~/Desktop/my-first-post.md
```

### Delete a post
Remove the JSON file and its entry from the index:

```bash
rm posts/my-post.json
```

Then edit `posts/index.json` and remove the entry for that post. Then commit:

```bash
git add posts/
git commit -m "blog: remove my-post"
git push
```

---

## All Commands

| Command | What it does |
| --- | --- |
| `blog init --repo <url>` | Set up your blog with your GitHub repo |
| `blog init --repo <url> --branch <name>` | Same, but push to a specific branch |
| `blog publish <file.md>` | Convert markdown to HTML, save JSON, commit and push |
| `blog list` | Show all published posts with dates |
| `blog --help` | Show usage info |

---

## Config (blog.json)

Created by `blog init`, lives in your project root:

```json
{
  "postsDir": "posts",
  "remote": "https://github.com/you/your-blog.git",
  "branch": "main"
}
```

- `postsDir` — where to save posts (default: `posts`)
- `remote` — your GitHub repo URL (for push)
- `branch` — branch to push to (default: `main`)

The CLI searches up from your current directory to find this file. You can run `blog publish` from any subfolder.

---

## Post Format

Each post is saved as `posts/<slug>.json`:

```json
{
  "title": "My First Post",
  "slug": "my-first-post",
  "content": "<h1>Hello World</h1>\n<p>This is my first blog post.</p>",
  "date": "2026-07-23"
}
```

The index (`posts/index.json`) holds all posts without content (for cheap listing):

```json
[
  { "title": "My First Post", "slug": "my-first-post", "date": "2026-07-23" },
  { "title": "Second Post", "slug": "second-post", "date": "2026-07-22" }
]
```

---

## Project Structure

```
Blog_Cli/
  cli.js              Entry point — parses args, dispatches commands
  blog.json           Your config (repo URL, branch)
  src/
    init.js           Sets up blog.json, posts/, and git remote
    publish.js        The publish pipeline (7 steps)
    markdown.js       Converts markdown to HTML (uses marked)
    post.js           Builds the post object
    storage.js        Writes JSON files, finds config
    git.js            Commits and pushes using config
    list.js           Lists posts from index
  posts/              Published posts (what your website fetches)
    index.json        List of all posts (newest first)
    <slug>.json       Individual post files
```

---

## How It Works

```
your markdown file
        |
        v
  [blog publish]  ----->  posts/
        |                  index.json     (list of all posts)
        v                  <slug>.json    (one file per post)
   git commit + push
```

Your website fetches posts straight from the `posts/` folder via GitHub raw URL.

---

## Troubleshooting

**"Command not found" after `npm link`**
Run `npm link` again from the `Blog_Cli` folder. If still broken, try `npx blog --help`.

**"No changes to commit"**
You published a file whose output is identical to what's already there. The post is already up to date.

**Push failed**
Post is still saved and committed locally. Push later with `git push origin main` (or whatever branch you configured).

**Wrong repo?**
Edit `blog.json` and change the `remote` field, or re-run:
```bash
blog init --repo https://github.com/YOU/CORRECT-REPO.git
```

---

## License

MIT
