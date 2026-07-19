import { marked } from "marked";

export function convertMarkdown(raw) {
  // Use marked to convert markdown to HTML
  // Configure for clean output
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  return marked.parse(raw);
}
