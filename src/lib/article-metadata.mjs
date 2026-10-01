// Metadata only: retain the full excerpt in the visible article and RSS.
export function articleMetaDescription(post) {
  const description =
    post.excerpt && post.excerpt.length >= 50
      ? post.excerpt
      : `${post.title}. Read the latest Viral Asia story covering Singapore and regional happenings.`;
  if (description.length <= 180) return description;
  const prefix = description.slice(0, 179);
  const boundary = prefix.lastIndexOf(" ");
  return `${(boundary >= 50 ? prefix.slice(0, boundary) : prefix).trimEnd()}…`;
}
