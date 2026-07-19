export function generatePost(title, slug, content) {
  const now = new Date();
  const date = now.toISOString().split("T")[0];

  return {
    title,
    slug,
    content,
    date,
  };
}
