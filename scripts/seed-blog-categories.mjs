import { createClient } from "@sanity/client";

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || "3an9f3n5";
const dataset = process.env.PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_WRITE_TOKEN || process.env.sanity_editor || process.env.sanity_token;

const categories = [
  {
    title: "Travel",
    slug: "travel",
    description: "Cross-border guides, staycations and short trips for Singapore audiences.",
  },
  {
    title: "Events",
    slug: "events",
    description: "Pop-ups, festivals, openings and local happenings worth planning around.",
  },
  {
    title: "Entertainment",
    slug: "entertainment",
    description: "Shows, nightlife, creator moments and attention-driving cultural stories.",
  },
  {
    title: "Deals",
    slug: "deals",
    description: "Promotions, value finds and limited-time offers for food, retail and services.",
  },
  {
    title: "Wellness",
    slug: "wellness",
    description: "Beauty, fitness, health and self-care stories for urban Singapore living.",
  },
];

if (!token) {
  console.error("Missing SANITY_WRITE_TOKEN, sanity_editor, or sanity_token. Create a Sanity write token and run: sanity_editor=... npm run sanity:seed-categories");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: "2024-03-19",
  useCdn: false,
});

const transaction = client.transaction();

for (const category of categories) {
  transaction.createIfNotExists({
    _id: `category-${category.slug}`,
    _type: "category",
    title: category.title,
    slug: { _type: "slug", current: category.slug },
    description: category.description,
  });
}

await transaction.commit();
console.log(`Seeded ${categories.length} Viral Asia blog categories into ${projectId}/${dataset}.`);
