import { readdirSync } from "node:fs";
import viralPosts from "./viralPosts.json";

export const whatsappHref =
  "https://wa.me/6590906912?text=I'm%20interested%20in%20your%20social%20media%20service";

export const navItems = [
  ["Home", "/"],
  ["Our Work", "/work"],
  ["Services", "/services"],
  ["Clients", "/clients"],
  ["About Us", "/about"],
  ["Contact Us", "/contact"],
] as const;

export const viralPostItems = viralPosts;

export const heroVideos = viralPostItems.map((post) => [
  post.cover,
  post.combinedViewsLabel,
  post.title,
  post.slug,
]);

export const workCards = [
  [
    "/recent-work-covers/recent-xing-rong-ji.jpg",
    "339 AMK Xing Rong Ji",
    "@SGDaily - Jun 2026",
    "11K",
  ],
  [
    "/recent-work-covers/DZXEQ27RSNY.jpg",
    "Eat3Cuts Geylang opening",
    "@SGDaily - Jun 2026",
    "55K",
  ],
  [
    "/recent-work-covers/batamfast-app.jpg",
    "BatamFast app booking",
    "@SGDaily - Jun 2026",
    "14K",
  ],
  [
    "/recent-work-covers/vold-artisan-sourdough.jpg",
    "Vold Artisan sourdough",
    "@SGDaily - Jun 2026",
    "11K",
  ],
  [
    "/recent-work-covers/guangzhou-wanton-noodle.jpg",
    "Guangzhou Wanton Noodle",
    "@SGDaily - Jul 2026",
    "11K",
  ],
  [
    "/recent-work-covers/DZy5if1RPw3.jpg",
    "Malaysia supermarket dispute",
    "@SGDaily - Jun 2026",
    "66K",
  ],
] as const;

export const operatedAccounts = [
  {
    title: "SGDaily",
    platform: "Instagram",
    handle: "@thesgdaily",
    href: "https://www.instagram.com/thesgdaily",
    image: "/company/SGDaily.png",
  },
  {
    title: "SGDaily",
    platform: "TikTok",
    handle: "@thesgdaily",
    href: "https://www.tiktok.com/@thesgdaily",
    image: "/company/SGDaily.png",
  },
  {
    title: "SGHomez",
    platform: "YouTube",
    handle: "@sghomez",
    href: "https://www.youtube.com/@sghomez",
    image: "/company/SGHomez.png",
  },
  {
    title: "SGHomez",
    platform: "TikTok",
    handle: "@thesghome",
    href: "https://www.tiktok.com/@thesghome",
    image: "/company/SGHomez.png",
  },
  {
    title: "Creators Hub",
    platform: "Website",
    handle: "gocreatorshub.com",
    href: "https://gocreatorshub.com/",
    image: "/company/hypehub.png",
  },
] as const;

export const partners = [
  ["stayr.png", "Stayr"],
  ["ibis.png", "Ibis"],
  ["klook.png", "Klook"],
  ["tiktok.png", "TikTok"],
  ["subway.png", "Subway"],
  ["crosscoop.png", "Cross Coop"],
  ["spinelli.png", "Spinelli"],
  ["mox.png", "MOX"],
  ["socialchamber.jpeg", "Social Chamber"],
  ["stsignature.png", "ST Signature"],
  ["furama.png", "Furama"],
  ["hotelg.png", "Hotel G"],
  ["Nan Yang Dao 1.png", "Nan Yang Dao"],
  ["Singapore Comic Con 1.png.webp", "Singapore Comic Con"],
  ["West Mall 1.png", "West Mall"],
  ["TOPTABLE 1.webp", "TOPTABLE"],
  ["JWC Cafe.png", "JWC Cafe"],
  ["Origanics SG.png", "Origanics SG"],
] as const;

export const services = [
  {
    title: "Vertical video production",
    body: "TikTok, Instagram Reels and YouTube Shorts built for fast local attention.",
    image: "/images/ad_posting.png",
  },
  {
    title: "Horizontal video production",
    body: "YouTube, property tours, explainers and polished long-form stories.",
    image: "/images/tahsh.png",
  },
  {
    title: "Managing your social media",
    body: "Content calendars, posting, community management and performance review.",
    image: "/images/smm.png",
  },
  {
    title: "Influencer marketing",
    body: "Creator matching, KOL outreach, campaign tracking and reporting.",
    image: "/images/influencer.png",
  },
  {
    title: "In house models",
    body: "On-camera talent for food, lifestyle, beauty, property and retail shoots.",
    image: "/images/models.jpg",
  },
] as const;

export const beforeAfter = [
  {
    image: "/images/socialchamber.png",
    partner: "Social Chamber",
    quote:
      "Social Chamber's month on month revenue growth reached 5X after our vertical video release.",
  },
  {
    image: "/images/stayr.png",
    partner: "Stayr Pte Ltd",
    quote:
      "Top 3 in the iOS most downloaded chart after social media management in the first month.",
  },
  {
    image: "/images/stayr2.png",
    partner: "Stayr Pte Ltd",
    quote:
      "Stayr gained 51% more sales per month and achieved a 100X revenue boost in a year.",
  },
] as const;

export const testimonials = [
  {
    quote:
      "Viral Asia captured the essence of our restaurant and turned it into content customers remembered.",
    name: "Eric Tan",
    role: "Director, 87 Just Thai",
    logo: "/logos/3. 87 Just Thai.jpg",
  },
  {
    quote:
      "They helped us build meaningful connections with potential partners and clients.",
    name: "Christel Goh",
    role: "Director, Grow Public Relations",
    logo: "/logos/16. Grow Public Relations.png",
  },
  {
    quote:
      "Their targeted content explained our software clearly and brought the right audience to us.",
    name: "Yoeven D. Khemlani",
    role: "CEO, Jigsawstack",
    logo: "/logos/17. Jigsawstack.jpg",
  },
  {
    quote:
      "The team understands local trends and knows how to create content that drives action.",
    name: "Tianze Zhao",
    role: "Director, Nurture Studio",
    logo: "/logos/12. Nurture Studio.jpg",
  },
  {
    quote:
      "Their social media work increased our visibility and gave our brand a sharper voice.",
    name: "Shebella Beauty",
    role: "Beauty and cosmetics brand",
    logo: "/logos/9. Shebella.jpeg",
  },
  {
    quote:
      "Their attention to detail made a measurable impact on our marketing results.",
    name: "Travis Tay",
    role: "Director, The Social Chamber",
    logo: "/logos/1. The Social Chamber.png",
  },
] as const;

export const stats = [
  ["500M+", "Total Views Generated"],
  ["1000+", "Viral Videos Created"],
  ["100+", "Brands Served"],
  ["50K+", "Followers Gained"],
] as const;

const logoName = (file: string) =>
  file
    .replace(/\.(png|jpg|jpeg|webp|avif)$/i, "")
    .replace(/\.(png|jpg|jpeg|webp|avif)$/i, "")
    .replace(/[_+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const allClientLogos = readdirSync("public/logos")
  .filter((file) => /\.(png|jpg|jpeg|webp|avif)$/i.test(file))
  .sort((a, b) => a.localeCompare(b))
  .map((file) => [file, logoName(file)] as const);

export const pageContent = {
  work: {
    title: "Our work",
    intro:
      "Owned media channels and creator platforms operated by the Viral Asia team.",
    items: operatedAccounts.map((account) => [
      account.title,
      `${account.platform} - ${account.handle}`,
      account.href,
    ]),
  },
  services: {
    title: "Services",
    intro:
      "Production, creators, social media management and campaign talent handled as one system.",
    items: services.map((service) => [service.title, service.body, ""]),
  },
  clients: {
    title: "Clients",
    intro:
      "Singapore brands choose us when they need attention that turns into store visits, leads and sales.",
    items: [],
  },
  about: {
    title: "About us",
    intro:
      "We are a Singapore-based social media team built for fast local campaigns.",
    items: [
      ["Singapore homegrown", "Local context shapes every hook.", ""],
      [
        "Platform native",
        "We write and edit for TikTok, Reels and Shorts.",
        "",
      ],
      [
        "Full-service",
        "Strategy, creators, production and ads under one roof.",
        "",
      ],
    ],
  },
  contact: {
    title: "Contact us",
    intro:
      "Tell us what you sell, who you need to reach and when the campaign needs to launch.",
    items: [
      ["Mailing Address", "11 mosque street #02-01", ""],
      ["Email Address", "hello@viralasia.co", "mailto:hello@viralasia.co"],
      ["Phone Number", "(+65) 9090 6912", "tel:+6590906912"],
    ],
  },
} as const;
