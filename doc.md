# doc.md — How the Blog CLI works

This document explains the whole codebase, file by file. Read it top to bottom — the files are ordered the same way a publish flows.

---

## The big picture

Everything lives in **one repo**: the CLI code, and (after you publish) the posts in `posts/`. When you run `blog publish my-note.md`, this happens:

```
cli.js  →  src/publish.js  →  read file, strip images, save JSON
                            →  src/git.js  (commit posts/ + push)
```

Three files total. Each does one job.

---

## 1. `package.json` — the project's ID card

```json
{
  "name": "blog-cli",
  "type": "module",
  "bin": { "blog": "./cli.js" }
}
```

- `"type": "module"` — modern `import`/`export` syntax.
- `"bin"` — makes `blog` a global command after `npm link`.
- **Zero dependencies.** Everything is plain Node.js.

---

## 2. `cli.js` — the front door

Runs first. Figures out what you asked for and hands off work.

```js
const args = process.argv.slice(2);
```

For `blog publish note.md` this gives `["publish", "note.md"]`.

```js
if (args[0] === "publish") {
  await publish(target);
}
```

One command: `publish`. That's it.

---

## 3. `src/publish.js` — the pipeline

### Resolve input

```js
const EXTS = new Set([".md", ".markdown", ".txt"]);
```

Accepts `.md`, `.markdown`, or `.txt` files.

### Strip images

```js
function stripImages(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")   // ![alt](url)
    .replace(/<img[^>]*>/gi, "")              // <img ...>
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
```

Removes markdown image syntax and HTML img tags. Keeps text only.

### Generate slug and title from filename

```js
function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function title(name) {
  return name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
```

`my-post.md` → slug: `my-post`, title: `My Post`.

### Save JSON

Writes `posts/<slug>.json` with title, slug, content, and date. Updates `posts/index.json` with the new entry (newest first).

### Commit and push

Calls `git.js` to stage `posts/`, commit with message `blog: <title>`, and push.

---

## 4. `src/git.js` — commit and push

```js
execSync("git add posts/", { cwd });
execSync("git commit -m " + JSON.stringify(msg), { cwd, stdio: "pipe" });
execSync(`git push -u origin ${branch}`, { cwd, stdio: "pipe" });
```

- Only stages `posts/` — never accidentally commits your code changes.
- Auto-detects current branch name.
- Checks that `git config user.name` and `user.email` are set before committing.
- Returns `"pushed"`, `"committed"`, or `"nothing"`.

---

## 5. `index.html` — landing page

Static page deployed to Vercel. Shows what the tool does and how to use it.

---

## 6. `vercel.json` — deployment config

Routes all requests to `index.html`. Just a static site.

---

## 7. `posts/` — the output

```
posts/
  index.json      ← [{ title, slug, date }, ...]  newest first
  <slug>.json     ← { title, slug, content, date }
```

Fetch from your site:
- List: `https://raw.githubusercontent.com/YOU/REPO/main/posts/index.json`
- Post: `https://raw.githubusercontent.com/YOU/REPO/main/posts/<slug>.json`

---

## 8. `.gitignore`

```
node_modules/   ← installed dependencies
.DS_Store       ← macOS junk
```

---

## Common questions

**How do I edit a post?**
Edit your original file and publish again. Same filename = same slug = post replaced.

**How do I delete a post?**
Delete `posts/<slug>.json`, remove its entry from `posts/index.json`, commit, push.

**"No changes to commit"?**
Published same content twice. Nothing to do.

**"Git user.name not set"?**
Run `git config --global user.name 'Your Name'` and `git config --global user.email 'you@example.com'`.

**Will publish push my code changes?**
No. Only stages `posts/`.

**Can others use this?**
Clone → change author in `package.json` → `npm link` → done.