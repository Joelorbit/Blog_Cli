# doc.md — How every piece of the Blog CLI works

This document explains the whole codebase, file by file, so you can understand and change anything yourself. Read it top to bottom once — the files are ordered the same way a publish actually flows.

---

## The big picture

Everything lives in **one repo**: the CLI code, and (after you run `blog init`) the published posts in `posts/`. When you run `node cli.js publish my-note.md`, this happens:

```
cli.js  →  src/publish.js  →  src/markdown.js  (markdown → HTML)
                           →  src/post.js      (build the post object)
                           →  src/storage.js   (write JSON into posts/)
                           →  src/git.js       (commit posts/ + push)
```

One entry point, one pipeline, four small helpers. Each file does exactly one job.

---

## 1. `package.json` — the project's ID card

```json
{
  "name": "blog-cli",
  "type": "module",
  "bin": { "blog": "./cli.js" },
  "dependencies": { "marked": "^15.0.0" }
}
```

- `"type": "module"` — lets us use modern `import`/`export` syntax instead of the older `require()`.
- `"bin"` — this is what makes the **global command** work. After you run `npm link` once, `blog` becomes a real command you can type from ANY folder — no `cd`, no `node cli.js`.
- `"dependencies"` — the only outside library is **marked**, a popular markdown-to-HTML converter. Everything else is plain Node.js.

---

## 2. `cli.js` — the front door

This is the file Node runs first. Its only job: figure out what you asked for and hand off the work.

### Parsing arguments

```js
const args = process.argv.slice(2);
```
- `process.argv` is the full command line as an array. For `blog publish note.md` it is `["node", "/path/to/cli.js", "publish", "note.md"]`.
- `.slice(2)` throws away the first two entries (the node binary and the script path), leaving just what *you* typed: `["publish", "note.md"]`.

### The help text

```js
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(HELP);
  process.exit(0);
}
```
- No arguments, or `--help`? Print the help text and stop. `process.exit(0)` means "quit successfully" (exit code 0 = success in the terminal world).

### Parsing flags and positional args

```js
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
```
- Walks through args one by one. If it sees `--repo` or `--branch`, it grabs the next argument as the value and skips it (`i++`). Everything else goes into `positional`.
- Example: `blog init --repo URL --branch dev` → `flags = { repo: "URL", branch: "dev" }`, `positional = ["init"]`.

### Dispatching commands

```js
const { flags, positional } = parseFlags(args);
const command = positional[0];

if (command === "init") {
  await init(cwd, flags.repo);
} else if (command === "publish") {
  const filePath = positional[1];
  await publish(filePath, cwd);
} else if (command === "list") {
  await list(cwd);
}
```
- `command` is the first positional arg (`init`, `publish`, or `list`).
- For `init`: passes `flags.repo` (the `--repo` value) to the init function.
- For `publish`: the file path is the second positional arg.
- For `list`: just needs the current working directory.
- Unknown commands hit the `else` block and print an error.

---

## 3. `src/publish.js` — the pipeline (the heart of the tool)

This runs the seven steps in order. Walkthrough:

### Guard 1: does the file exist?

```js
const resolved = path.resolve(filePath);
try {
  await fs.access(resolved);
} catch {
  console.error(`Error: File not found: ${resolved}`);
  process.exit(1);
}
```
- `path.resolve` turns a relative path like `../note.md` into a full absolute path.
- `fs.access` throws if the file doesn't exist — we catch that and fail with a clear message *before* doing any work.

### Guard 2: is it a markdown file?

```js
const ext = path.extname(resolved).toLowerCase();
if (![".md", ".markdown", ".txt"].includes(ext)) { ...error... }
```
- `path.extname` grabs the extension (`.md`). Lowercased so `.MD` also works. Anything that isn't markdown-ish is rejected.

### Step 1: read the file

```js
const raw = await fs.readFile(resolved, "utf-8");
```
- Reads the whole file into a string. `"utf-8"` tells Node "give me text, not raw bytes".

### Step 2: filename → title

```js
const basename = path.basename(resolved, ext);   // "my-first-post"
const title = basename
  .replace(/[-_]/g, " ")                          // "my first post"
  .replace(/\b\w/g, (c) => c.toUpperCase());      // "My First Post"
```
- `path.basename(path, ext)` gives the filename without folder or extension.
- First regex: every `-` or `_` becomes a space (`/g` = replace *all* of them, not just the first).
- Second regex: `\b\w` means "a letter at the start of a word" — each one is uppercased. That's how `my-first-post` becomes `My First Post`.

### Step 3: title → slug

```js
const slug = basename
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")   // anything not a letter/number → "-"
  .replace(/^-|-$/g, "");        // trim "-" from start/end
```
- A **slug** is the URL-safe ID of the post — it becomes the JSON filename (`my-first-post.json`) and what your website uses to fetch it.
- `[^a-z0-9]+` means "one or more characters that are NOT a-z or 0-9" — spaces, dots, emoji, whatever — all collapse into a single dash.

### Steps 4–7: delegate to the helpers

```js
const content = convertMarkdown(raw);            // markdown.js
const post = generatePost(title, slug, content); // post.js
await savePost(slug, post);                      // storage.js
const result = await commitAndPush(slug, title); // git.js
```

### Handling the git result

```js
if (result.error === "no_changes") {
  console.log("No changes to commit.");
} else if (result.pushed) {
  console.log("Pushed to GitHub");
} else if (result.error) {
  // push failed (e.g. no internet) — post is still saved locally
}
```
- `git.js` never throws; it returns a result object describing what happened. This block turns that into friendly messages. Key idea: **even if the push fails, your post is already saved and committed locally** — you can push later with `git push origin main`.

---

## 4. `src/markdown.js` — markdown → HTML (smallest file)

```js
import { marked } from "marked";

export function convertMarkdown(raw) {
  marked.setOptions({
    breaks: true,   // a single newline becomes a <br> (like typing in a chat)
    gfm: true,      // GitHub Flavored Markdown: tables, ~~strikethrough~~, task lists
  });
  return marked.parse(raw);
}
```
- All the hard parsing is done by the `marked` library. We just configure it and call `parse`.
- Example: `# Hello\n\nSome **bold** text` → `<h1>Hello</h1>\n<p>Some <strong>bold</strong> text</p>`.

---

## 5. `src/post.js` — the shape of a post

```js
export function generatePost(title, slug, content) {
  const now = new Date();
  const date = now.toISOString().split("T")[0];

  return { title, slug, content, date };
}
```
- `toISOString()` gives `"2026-07-19T08:30:00.000Z"`; `.split("T")[0]` keeps just the date part: `"2026-07-19"`.
- Returns a plain object — this is the **exact shape** of every post JSON file. Want an extra field (say, `tags`)? This is the file to change (plus `storage.js` if you want it in the index too).

---

## 6. `src/storage.js` — writing the JSON files and finding config

This file does two jobs: **finds where your blog lives** (by looking for `blog.json`) and **writes the post files**.

### Finding the config: `findConfig(startDir)`

```js
export async function findConfig(startDir) {
  let dir = startDir;
  while (true) {
    const configPath = path.join(dir, CONFIG_FILE);
    try {
      await fs.access(configPath);
      const raw = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(raw);
      return { config, projectRoot: dir };
    } catch {
      // no config here, go up
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}
```
- Starts at your current directory and walks **up** looking for `blog.json`.
- Returns the config object and the directory where it was found (`projectRoot`).
- If it reaches the filesystem root without finding one, returns `null`.

### `getConfig(cwd)` — wraps findConfig with defaults

```js
export async function getConfig(cwd) {
  const found = await findConfig(cwd);
  if (found) return found;
  return {
    config: { postsDir: "posts" },
    projectRoot: cwd,
  };
}
```
- If no `blog.json` found, falls back to using the current directory with `postsDir: "posts"`.
- This is why `blog publish` works even without running `init` first — it just puts posts in `./posts/`.

### `initProject(projectRoot, remoteUrl)` — creates files for a new blog

```js
export async function initProject(projectRoot, remoteUrl) {
  const postsDir = path.join(projectRoot, "posts");
  await fs.mkdir(postsDir, { recursive: true });

  const indexFile = path.join(postsDir, "index.json");
  try {
    await fs.access(indexFile);
  } catch {
    await fs.writeFile(indexFile, "[]");
  }

  const configPath = path.join(projectRoot, CONFIG_FILE);
  try {
    await fs.access(configPath);
  } catch {
    const config = {
      postsDir: "posts",
      remote: remoteUrl || "",
      branch: "main",
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
  }
  return { postsDir, configPath };
}
```
- Creates `posts/` if it doesn't exist.
- Creates `index.json` inside it (empty array `[]`) if it doesn't exist.
- Creates `blog.json` with the user's repo URL, but **only if one doesn't already exist** (won't overwrite).

### `savePost(slug, post, postsDir)` — writes the JSON files

```js
export async function savePost(slug, post, postsDir) {
  await fs.mkdir(postsDir, { recursive: true });

  const postFile = path.join(postsDir, `${slug}.json`);
  await fs.writeFile(postFile, JSON.stringify(post, null, 2));

  const indexFile = path.join(postsDir, "index.json");
  await updateIndex(slug, post, indexFile);
}
```
- Takes `postsDir` as a parameter (not a module constant) — this is how it works with any config.
- Writes the full post to `posts/<slug>.json`. `JSON.stringify(obj, null, 2)` = pretty-print with 2-space indentation so it's readable on GitHub.
- Then calls `updateIndex` to keep the index in sync.

### `updateIndex(slug, newPost, indexFile)` — keeping `posts/index.json` correct

```js
try {
  posts = JSON.parse(await fs.readFile(INDEX_FILE, "utf-8"));
} catch {
  // No index yet, start empty
}
```
- Load the existing list; if the file doesn't exist yet (first post ever), start with `[]`.

```js
posts = posts.filter((p) => p.slug !== slug);
```
- **This is why re-publishing updates instead of duplicates**: any old entry with the same slug is removed first.

```js
posts.unshift({ title: newPost.title, slug: newPost.slug, date: newPost.date });
```
- `unshift` adds to the *front* of the array → newest post first.
- Notice: **no `content` field**. The index stays small so your website can fetch the whole list cheaply; full HTML lives only in the per-post file.

---

## 7. `src/git.js` — commit and push

This file talks to git by running real git commands with `execSync` (run a shell command and wait for it). All commands run at the project root.

### The main function: `commitAndPush(projectRoot, slug, title, config)`

```js
const remote = config.remote || "origin";
const branch = config.branch || "main";
```
- Reads remote URL and branch from `blog.json` config. Falls back to `"origin"` and `"main"` if not set.

### Safety net: is this even a git repo?

```js
try {
  await fs.access(path.join(cwd, ".git"));
} catch {
  execSync("git init", { cwd });
  execSync("git config user.email 'blog@local'", { cwd });
  execSync("git config user.name 'blog'", { cwd });
}
```
- If there's no `.git` folder, create the repo and set a commit identity so commits don't fail on a fresh machine.

### Ensure the configured remote exists

```js
if (config.remote) {
  let hasRemote = false;
  try {
    execSync("git remote get-url origin", { cwd, stdio: "pipe" });
    hasRemote = true;
  } catch {
    // no remote yet
  }
  if (!hasRemote) {
    execSync(`git remote add origin ${config.remote}`, { cwd });
  }
}
```
- Only adds the remote if the user configured one in `blog.json`. If `config.remote` is empty, it skips this — assumes you already have an `origin` set up.

### Stage and commit

```js
execSync("git add posts/", { cwd });
try {
  execSync(`git commit -m "blog: ${title}"`, { cwd, stdio: "pipe" });
} catch {
  return { pushed: false, error: "no_changes" };
}
```
- **Only `posts/` is staged** — publishing never accidentally commits code changes you're working on.
- `git commit` fails when there is nothing to commit — we use that: catching the failure is how we detect "you published the exact same file twice".
- Commit messages always look like `blog: My First Post`, so blog commits are easy to spot in history.

### Push

```js
try {
  execSync(`git push -u origin ${branch}`, { cwd, stdio: "pipe" });
  return { pushed: true };
} catch (e) {
  return { pushed: false, error: e.message };
}
```
- Uses `-u` to link the local branch with the remote branch. If it fails (no internet, no permission), reports the error — the commit is still safe locally.
- Uses the `branch` from config, so it works with non-default branch names.

### Helper: `setupRemote(projectRoot, remoteUrl)` — used by init.js

```js
export async function setupRemote(projectRoot, remoteUrl) {
  let existing = null;
  try {
    existing = execSync("git remote get-url origin", { ... }).trim();
  } catch {
    // no remote
  }

  if (existing) {
    if (existing === remoteUrl) return "already_set";
    execSync(`git remote set-url origin ${remoteUrl}`, { cwd: projectRoot });
    return "updated";
  }

  execSync(`git remote add origin ${remoteUrl}`, { cwd: projectRoot });
  return "added";
}
```
- Returns a string describing what happened: `"added"`, `"updated"`, or `"already_set"`.
- Called by `init.js` when the user runs `blog init --repo <url>`.

### Helper: `getRemoteUrl(projectRoot)` — reads the current remote

```js
export async function getRemoteUrl(projectRoot) {
  try {
    const url = execSync("git remote get-url origin", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    return url;
  } catch {
    return null;
  }
}
```
- Returns the current `origin` URL, or `null` if no remote is configured.
- Used by `init.js` to detect existing remotes.

---

## 8. `src/init.js` — setting up a new blog project

This runs when you type `blog init --repo <url>`. It does three things: creates files, sets up git, configures the remote.

### Check if already initialized

```js
const existing = await getConfig(cwd);
if (existing.config && existing.projectRoot !== cwd) {
  console.log(`Already initialized at: ${existing.projectRoot}`);
  return;
}
```
- Calls `getConfig()` from storage.js (which walks up directories looking for `blog.json`).
- If a `blog.json` already exists **above** the current directory, it tells you and stops — no double-init.

### Create the files

```js
const { postsDir, configPath } = await initProject(cwd, remoteUrl);
```
- This calls `initProject()` in storage.js, which:
  1. Creates `posts/` folder (with `index.json` inside if it doesn't exist)
  2. Creates `blog.json` with your repo URL, branch, and postsDir

### Set up git

```js
try {
  await fs.access(path.join(cwd, ".git"));
} catch {
  execSync("git init", { cwd });
  execSync("git config user.email 'blog@local'", { cwd });
  execSync("git config user.name 'blog'", { cwd });
}
```
- If there's no `.git` folder, initialize a fresh repo and set a dummy commit identity (so commits don't fail on a fresh machine).

### Configure the remote

```js
if (remoteUrl) {
  const result = await setupRemote(cwd, remoteUrl);
}
```
- Calls `setupRemote()` from git.js, which either adds a new `origin` remote or updates the existing one.
- If no `--repo` flag was given, it checks for an existing remote and tells you what it found.

---

## 9. `src/list.js` — showing published posts

Simple file. Reads `posts/index.json` and prints it.

```js
export async function list(cwd) {
  const postsDir = await getPostsDir(cwd);
  const indexFile = path.join(postsDir, "index.json");

  let posts = [];
  try {
    const data = await fs.readFile(indexFile, "utf-8");
    posts = JSON.parse(data);
  } catch {
    console.log("No posts found.");
    return;
  }
```
- `getPostsDir()` (from storage.js) finds where `posts/` lives by looking for `blog.json`.
- If `index.json` doesn't exist yet (no posts published), it catches the error and prints a friendly message.

```js
  for (const post of posts) {
    console.log(`  ${post.date}  ${post.title}  [${post.slug}]`);
  }
```
- Loops through the index and prints each post with its date, title, and slug.
- The index is ordered newest-first (because `storage.js` uses `unshift`), so the latest post appears at the top.

---

## 10. `blog.json` — your config file

This is the per-user config. Created by `blog init`, lives in your project root.

```json
{
  "postsDir": "posts",
  "remote": "https://github.com/you/your-blog.git",
  "branch": "main"
}
```

- **`postsDir`** — where to save posts. Default is `"posts"`. You can change this if you want posts somewhere else.
- **`remote`** — your GitHub repo URL. Used by git.js to add/update the `origin` remote. If empty, git.js falls back to whatever `origin` is already set to.
- **`branch`** — which branch to push to. Default is `"main"`.

### How config is found

`storage.js` has a `findConfig()` function that walks **up** from your current directory looking for `blog.json`:

```
/home/you/my-blog/posts/drafts/   ← you are here
/home/you/my-blog/                ← checks here → finds blog.json ✓
```

This means you can run `blog publish` from any subfolder and it still works — it finds the config above you.

If no `blog.json` is found anywhere, it falls back to using the current directory with `postsDir: "posts"`.

---

## 11. `posts/` — the output (what your website fetches)

```
posts/
  index.json      ← [{ title, slug, date }, ...]  newest first
  <slug>.json     ← { title, slug, content (HTML), date }
```

Your website never runs this code — it just fetches these files raw from GitHub using **your** repo URL:

- List: `https://raw.githubusercontent.com/YOU/REPO/main/posts/index.json`
- Post: `https://raw.githubusercontent.com/YOU/REPO/main/posts/<slug>.json`

---

## 12. `.gitignore`

```
node_modules/   ← installed dependencies; recreated anytime with `npm install`
blog-data/      ← leftover folder from an old version, ignored just in case
.DS_Store       ← macOS junk file
```

---

## Common questions

**How do I edit a published post?**
Edit your original markdown file and run `publish` on it again. Same filename → same slug → the post is replaced.

**How do I delete a post?**
Delete `posts/<slug>.json`, remove its entry from `posts/index.json`, then:
```bash
git add posts/ && git commit -m "blog: remove <slug>" && git push origin main
```

**Why did it say "No changes to commit"?**
You published a file whose output is identical to what's already there. Nothing to do.

**I changed code files — will publish push them?**
No. Publishing stages only `posts/`. Code changes you commit and push yourself, normally.

**Can I add fields like tags or a description?**
Yes — add them in `src/post.js` (the post object), and in `src/storage.js` inside `updateIndex` if you also want them in the list.
