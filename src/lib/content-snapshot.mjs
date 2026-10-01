import { createContentManifest } from "./content-routes.mjs";

// Match GROQ's descending string order, including null dates before strings.
export function relatedPostsFor(posts, post, limit = 6) {
  const categoryIds = new Set(
    post.categories?.filter(Boolean).map((category) => category._id),
  );
  return posts
    .filter((entry) => entry.slug.current !== post.slug.current)
    .map((entry) => ({
      ...entry,
      categoryScore:
        entry.categoryIds == null
          ? null
          : entry.categoryIds.filter((id) => categoryIds.has(id)).length,
    }))
    .sort(
      (a, b) =>
        Number(b.categoryScore == null) - Number(a.categoryScore == null) ||
        b.categoryScore - a.categoryScore ||
        Number(b.publishedAt == null) - Number(a.publishedAt == null) ||
        compareStrings(b.publishedAt || "", a.publishedAt || "") ||
        compareStrings(a._id, b._id),
    )
    .slice(0, limit);
}

const compareStrings = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function createSnapshotLoader(
  fetchSnapshot,
  { ttlMs = Infinity, now = Date.now } = {},
) {
  let pending;
  let expiresAt = Infinity;
  return () => {
    if (pending && now() >= expiresAt) pending = undefined;
    if (!pending) {
      expiresAt = Infinity; // Never expire an in-flight request.
      pending = Promise.resolve()
        .then(fetchSnapshot)
        .then((content) => {
          if (
            !Array.isArray(content?.posts) ||
            content.posts.length === 0 ||
            !Array.isArray(content.categories)
          ) {
            throw new Error(
              "Invalid content snapshot: refusing to build an empty or malformed site",
            );
          }
          return {
            ...content,
            manifest: createContentManifest({
              posts: content.posts.map((post) => ({
                ...post,
                slug: post.slug?.current,
                author: post.author?.name ?? null,
                categories: post.categories
                  ?.filter(Boolean)
                  .map((category) => ({
                    ...category,
                    slug: category.slug?.current,
                  })),
                imageUrl: post.mainImage?.asset?.url ?? null,
              })),
              categories: content.categories
                .filter((category) => category.slug?.current)
                .map((category) => ({
                  ...category,
                  slug: category.slug?.current,
                })),
            }),
          };
        })
        .finally(() => {
          expiresAt = now() + ttlMs;
        });
    }
    return pending;
  };
}
