export const TEMPORARY_FEATURE = Object.freeze({
  slug: "ex-tiktok-gm-delilah-chan-dwelldrop-local-shops",
  startsAt: "2026-10-18T08:30:13Z",
  expiresAt: "2026-10-25T08:30:13Z",
});

export const DEFAULT_FEATURE_SLUG =
  "this-dating-app-lets-users-attend-private-dating-events-without-revealing-their-identities";

export function selectFeaturedPost(posts, now = Date.now()) {
  const active =
    now >= Date.parse(TEMPORARY_FEATURE.startsAt) &&
    now < Date.parse(TEMPORARY_FEATURE.expiresAt);
  const temporary = active
    ? posts.find((post) => post.slug?.current === TEMPORARY_FEATURE.slug)
    : undefined;
  return (
    temporary ??
    posts.find((post) => post.slug?.current === DEFAULT_FEATURE_SLUG) ??
    posts.find((post) => !/test/i.test(post.title)) ??
    posts[0]
  );
}
