export const TEMPORARY_FEATURE = Object.freeze({
  enabled: false,
  slug: "ex-tiktok-gm-delilah-chan-dwelldrop-local-shops",
  startsAt: "2026-10-18T08:30:13Z",
  expiresAt: "2026-10-25T08:30:13Z",
});

export const PRIMARY_FEATURE_SLUG =
  "singapore-expo-halloween-trading-card-show-caps-2026";

export const DEFAULT_FEATURE_SLUG =
  "this-dating-app-lets-users-attend-private-dating-events-without-revealing-their-identities";

export function selectFeaturedPost(posts, now = Date.now()) {
  const active =
    TEMPORARY_FEATURE.enabled &&
    now >= Date.parse(TEMPORARY_FEATURE.startsAt) &&
    now < Date.parse(TEMPORARY_FEATURE.expiresAt);
  const temporary = active
    ? posts.find((post) => post.slug?.current === TEMPORARY_FEATURE.slug)
    : undefined;
  return (
    posts.find((post) => post.slug?.current === PRIMARY_FEATURE_SLUG) ??
    temporary ??
    posts.find((post) => post.slug?.current === DEFAULT_FEATURE_SLUG) ??
    posts.find((post) => !/test/i.test(post.title)) ??
    posts[0]
  );
}

export function selectSecondaryFeaturedPost(
  posts,
  featuredPost,
  now = Date.now(),
) {
  if (
    !TEMPORARY_FEATURE.enabled ||
    now < Date.parse(TEMPORARY_FEATURE.startsAt) ||
    now >= Date.parse(TEMPORARY_FEATURE.expiresAt)
  )
    return undefined;
  return posts.find(
    (post) =>
      post.slug?.current === TEMPORARY_FEATURE.slug &&
      post._id !== featuredPost?._id,
  );
}
