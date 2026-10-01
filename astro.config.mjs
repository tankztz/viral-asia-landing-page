import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

import sanity from "@sanity/astro";
import { contentSnapshotIntegration } from "./src/lib/build-content.mjs";

// https://astro.build/config
export default defineConfig({
  integrations: [contentSnapshotIntegration(), tailwind(), sanity({
    projectId: "3an9f3n5",
    dataset: "production",
    useCdn: false, // for static builds
  }),]
});