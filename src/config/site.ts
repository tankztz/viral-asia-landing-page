export const siteUrl = "https://viralasia.co";

export const canonicalUrl = (path = "/") =>
  `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

export const siteDescriptions = {
  home:
    "Latest Singapore and Thailand happenings, food, events and lifestyle stories from Viral Asia.",
  engage:
    "Viral Asia is a Singapore social media agency creating viral short videos, creator campaigns and digital content for local brands.",
  work:
    "Explore Viral Asia operated channels, social media work and creator platforms built for Singapore audiences.",
  services:
    "Viral Asia offers vertical video production, social media management, influencer marketing and campaign talent for Singapore brands.",
  clients:
    "See the brands and client testimonials behind Viral Asia social media campaigns across Singapore.",
  about:
    "Learn about Viral Asia, a Singapore homegrown media and social content team helping stories and brands reach local audiences.",
  contact:
    "Contact Viral Asia for social media campaigns, creator content and editorial collaborations in Singapore.",
} as const;

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@id": `${siteUrl}/#organization`,
  "@type": "Organization",
  name: "Viral Asia",
  url: siteUrl,
  logo: canonicalUrl("/company/ViralAsia.png"),
  email: "hello@viralasia.co",
  telephone: "+65 9090 6912",
  address: {
    "@type": "PostalAddress",
    streetAddress: "11 Mosque Street #02-01",
    addressCountry: "SG",
  },
  sameAs: [
    "https://www.instagram.com/thesgdaily/",
    "https://www.tiktok.com/@thesgdaily",
    "https://www.facebook.com/thesgdaily8/",
  ],
};
