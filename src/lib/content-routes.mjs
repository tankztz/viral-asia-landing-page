export const SANITY_CONFIG = {
  projectId: "3an9f3n5",
  dataset: "production",
  apiVersion: "2024-03-19",
  useCdn: false,
};

export const PUBLISHED_POST_FILTER = `
  _type == "post"
  && !(_id in path("drafts.**"))
  && defined(slug.current)
`;

export const CONTENT_MANIFEST_QUERY = `{
  "posts": *[${PUBLISHED_POST_FILTER}]|order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    _updatedAt,
    "author": author->name,
    "categories": categories[]->{title, "slug": slug.current},
    "imageUrl": mainImage.asset->url
  },
  "categories": *[
    _type == "category"
    && !(_id in path("drafts.**"))
    && defined(slug.current)
    && defined(title)
  ]|order(title asc){
    _id,
    title,
    "slug": slug.current
  }
}`;

export const articlePath = (slug) => `/blog/${slug}/`;

const duplicates = (values) =>
  [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

export function createContentManifest(content) {
  if (!Array.isArray(content?.posts) || !Array.isArray(content?.categories)) {
    throw new Error("Sanity content manifest must contain posts and categories arrays");
  }

  const posts = content.posts.map((post, index) => {
    if (!post?.slug || !post?.title) {
      throw new Error(`Published post ${index + 1} is missing a slug or title`);
    }
    return { ...post, path: articlePath(post.slug) };
  });
  const categories = content.categories.map((category, index) => {
    if (!category?.slug || !category?.title) {
      throw new Error(`Category ${index + 1} is missing a slug or title`);
    }
    return category;
  });
  const articlePaths = posts.map((post) => post.path);
  const duplicateArticlePaths = duplicates(articlePaths);
  const duplicateCategorySlugs = duplicates(
    categories.map((category) => category.slug),
  );

  if (duplicateArticlePaths.length || duplicateCategorySlugs.length) {
    throw new Error(
      `Duplicate content routes: ${[
        ...duplicateArticlePaths,
        ...duplicateCategorySlugs.map((slug) => `category:${slug}`),
      ].join(", ")}`,
    );
  }

  return {
    posts,
    categories,
    articlePaths,
    articleCount: articlePaths.length,
    categoryCount: categories.length,
  };
}

export async function discoverContentRoutes(client) {
  return createContentManifest(await client.fetch(CONTENT_MANIFEST_QUERY));
}

export function compareRouteManifest(expectedPaths, actualPaths) {
  const expected = new Set(expectedPaths);
  const actual = new Set(actualPaths);
  return {
    missing: [...expected].filter((path) => !actual.has(path)),
    stale: [...actual].filter((path) => !expected.has(path)),
    duplicates: duplicates(actualPaths),
  };
}

export function assertRouteManifest(
  expectedPaths,
  actualPaths,
  label = "route manifest",
) {
  const comparison = compareRouteManifest(expectedPaths, actualPaths);
  const problems = Object.entries(comparison)
    .filter(([, paths]) => paths.length)
    .map(([kind, paths]) => `${kind}: ${paths.join(", ")}`);
  if (problems.length) {
    throw new Error(`${label} mismatch (${problems.join("; ")})`);
  }
  return comparison;
}
