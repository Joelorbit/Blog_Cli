# doc.md — How every piece of the Blog CLI works

This document explains the whole codebase, file by file, so you can understand and change anything yourself. Read it top to bottom once — the files are ordered the same way a publish actually flows.

---

## The big picture

Everything lives in **one repo** (`Joelorbit/Blog_Cli`): the CLI code, and the published posts in `posts/`. When you run `node cli.js publish my-note.md`, this happens:

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
- `"bin"` — if you ever run `npm link`, this makes the command `blog` available globally, so you can type `blog publish note.md` from anywhere instead of `node cli.js publish note.md`.
- `"dependencies"` — the only outside library is **marked**, a popular markdown-to-HTML converter. Everything else is plain Node.js.

---

## 2. `cli.js` — the front door

This is the file Node runs first. Its only job: figure out what you asked for and hand off the work.

```js
const args = process.argv.slice(2);
```
- `process.argv` is the full command line as an array. For `node cli.js publish note.md` it is `["node", "cli.js", "publish", "note.md"]`.
- `.slice(2)` throws away the first two entries (the node binary and the script name), leaving just what *you* typed: `["publish", "note.md"]`.

```js
if (args.length === 0 || args[0] === "--help") {
  console.log(` ...usage text... `);
  process.exit(0);
}
```
- No arguments, or `--help`? Print the help text and stop. `process.exit(0)` means "quit successfully" (exit code 0 = success in the terminal world).

```js
if (command === "publish") {
  const filePath = args[1];
  if (!filePath) { ...error... process.exit(1); }
```
- The first word is the command. If it's `publish`, the second word must be the file path. Missing? Print an error and `process.exit(1)` — exit code 1 means "something went wrong".

```js
  try {
    await publish(filePath);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
```
- Call the pipeline. If *anything* inside throws an error, we catch it here, print a clean one-line message instead of a scary stack trace, and exit with failure.

```js
} else {
  console.error(`Unknown command: ${command}`);
}
```
- Typed something that isn't `publish`? Tell the user and point them to `--help`.

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

## 6. `src/storage.js` — writing the JSON files

### Finding the project root

```js
export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
```
- `import.meta.url` is the location of `storage.js` itself. Two `dirname` calls walk up: `src/storage.js` → `src/` → project root.
- Why? So `node cli.js publish ...` works **no matter which folder you run it from** — posts always land in the right place.

### The layout, defined in two constants

```js
const POSTS_DIR  = path.join(ROOT, "posts");          // one file per post
const INDEX_FILE = path.join(POSTS_DIR, "index.json"); // the list of all posts
```

### `savePost(slug, post)`

```js
await fs.mkdir(POSTS_DIR, { recursive: true });
```
- Makes sure `posts/` exists. `recursive: true` = create parents too, and don't error if it's already there.

```js
const postFile = path.join(POSTS_DIR, `${slug}.json`);
await fs.writeFile(postFile, JSON.stringify(post, null, 2));
```
- Writes the full post to `posts/<slug>.json`. `JSON.stringify(obj, null, 2)` = pretty-print with 2-space indentation so it's readable on GitHub.

### `updateIndex(slug, newPost)` — keeping `posts/index.json` correct

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

This file talks to git by running real git commands with `execSync` (run a shell command and wait for it). All commands run at the project `ROOT`.

```js
const REMOTE_URL = "https://github.com/Joelorbit/Blog_Cli.git";
```
- The one repo everything pushes to. Change this constant if you ever move the blog.

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

### Make sure the remote exists

```js
try {
  execSync("git remote get-url origin", { cwd, stdio: "pipe" });
} catch {
  execSync(`git remote add origin ${REMOTE_URL}`, { cwd });
}
```
- Asks git "is there an `origin` remote?" (`stdio: "pipe"` captures output quietly). If not, it's added automatically — one less thing to set up.

### Push

```js
try {
  execSync("git push origin main", ...);
  return { pushed: true };
} catch {
  try {
    execSync("git push -u origin main", ...);   // first-ever push needs -u
    return { pushed: true };
  } catch (e) {
    return { pushed: false, error: e.message };
  }
}
```
- Normal push first; if that fails, retry with `-u` (needed the very first time a branch is pushed, to link local `main` with GitHub's `main`). If both fail (no internet, no permission), report the error — the commit is still safe locally.

---

## 8. `posts/` — the output (what your website fetches)

```
posts/
  index.json      ← [{ title, slug, date }, ...]  newest first
  <slug>.json     ← { title, slug, content (HTML), date }
```

Your website never runs this code — it just fetches these files raw from GitHub:

- List: `https://raw.githubusercontent.com/Joelorbit/Blog_Cli/main/posts/index.json`
- Post: `https://raw.githubusercontent.com/Joelorbit/Blog_Cli/main/posts/<slug>.json`

---

## 9. `.gitignore`

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
