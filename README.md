# Blog CLI

Write markdown anywhere. Publish with one command.

## Usage

```bash
# Publish a markdown file
blog publish ~/Desktop/my-note.md
```

## What happens

1. CLI reads your markdown file
2. Filename becomes the title (`my-note.md` → `My Note`)
3. Markdown converts to HTML
4. JSON files are generated
5. Changes commit and push to GitHub

## Output

```
Reading file...
Generated title: My Note
Converted markdown
Created JSON
Committed changes
Pushed to GitHub

Published successfully
```

## Repository structure

```
content/
  posts.json
  posts/
    my-note.json
```

## JSON format

```json
{
  "title": "My Note",
  "slug": "my-note",
  "content": "<p>HTML content</p>",
  "date": "2026-07-19"
}
```

## Portfolio fetch

```javascript
// Get all posts
const res = await fetch("https://raw.githubusercontent.com/Joelorbit/Blog_Content/main/content/posts.json");
const posts = await res.json();

// Get single post
const post = await fetch(`https://raw.githubusercontent.com/Joelorbit/Blog_Content/main/content/posts/${slug}.json`);
```
