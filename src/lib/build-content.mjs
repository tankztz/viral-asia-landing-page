import { createClient } from "@sanity/client";
import { SANITY_CONFIG, PUBLISHED_POST_FILTER } from "./content-routes.mjs";
import { createSnapshotLoader } from "./content-snapshot.mjs";

export const CONTENT_SNAPSHOT_QUERY = `{
  "posts": *[${PUBLISHED_POST_FILTER}]
    | order(publishedAt desc, _id asc) {
      _id, _updatedAt, title, slug, publishedAt, excerpt, body,
      "readingMinutes": round(length(pt::text(body)) / 900),
      author->{name},
      categories[]->{_id, title, slug},
      "categoryIds": categories[]._ref,
      mainImage {asset->{url, metadata {dimensions}}}
    },
  "categories": *[_type == "category" && !(_id in path("drafts.**")) && defined(title)]
    | order(title asc, _id asc) {_id, title, slug, description}
}`;

// Symbol.for shares the same promise between config and Astro's bundled routes.
// No persisted cache: each build reads the latest published origin content.
const STATE = Symbol.for("viralasia.content-snapshot.v1");

export function resetContentSnapshot({
  development = false,
  fetchSnapshot,
} = {}) {
  const state = { requests: 0, load: undefined };
  const client = fetchSnapshot
    ? undefined
    : createClient({
        ...SANITY_CONFIG,
        maxRetries: 0,
        requestTagPrefix: "viralasia-build",
      });
  state.load = createSnapshotLoader(
    async () => {
      state.requests += 1;
      const content = await (fetchSnapshot
        ? fetchSnapshot()
        : client.fetch(CONTENT_SNAPSHOT_QUERY, {}, { tag: "snapshot" }));
      console.info(
        `[sanity-snapshot] request ${state.requests}: ${content.posts?.length ?? 0} posts`,
      );
      return content;
    },
    { ttlMs: development ? 5000 : Infinity },
  );
  globalThis[STATE] = state;
}

export function getContentSnapshot() {
  if (!globalThis[STATE]) resetContentSnapshot();
  return globalThis[STATE].load();
}

export function contentSnapshotIntegration() {
  return {
    name: "viralasia-content-snapshot",
    hooks: {
      "astro:config:setup": ({ command }) =>
        resetContentSnapshot({ development: command === "dev" }),
      "astro:build:start": () => resetContentSnapshot(),
      "astro:build:done": ({ logger }) => {
        const requests = globalThis[STATE]?.requests;
        if (requests !== 1)
          throw new Error(
            `Expected one Sanity snapshot request, got ${requests}`,
          );
        logger.info(
          "Verified one Sanity content request for the entire build.",
        );
      },
    },
  };
}
