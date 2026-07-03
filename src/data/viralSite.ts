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

export const heroVideos = [
  ["/viral-posts/food/26yrfishball.png", "12.3M", "Hawker story"],
  [
    "/viral-posts/food/Screenshot 2024-10-11 at 10.05.56 PM.png",
    "8.7M",
    "Restaurant hook",
  ],
  ["/viral-posts/things_to_do/IMG_8299.PNG", "7.1M", "Event reel"],
  ["/viral-posts/food/loklok.png", "6.3M", "Buffet reel"],
  ["/viral-posts/things_to_do/ritual_team.png", "5.4M", "Lifestyle reel"],
  ["/viral-posts/property/Screenshot_1.png", "4.6M", "Property story"],
  ["/viral-posts/food/containercafe.png", "3.8M", "Cafe launch"],
  ["/viral-posts/things_to_do/tattoo.png", "3.2M", "Studio reel"],
  ["/viral-posts/property/Screenshot_2.png", "2.9M", "Home tour"],
  ["/viral-posts/food/bistro.png", "2.7M", "Dining reel"],
  [
    "/viral-posts/things_to_do/Screenshot 2024-10-11 at 10.28.32 PM.png",
    "2.4M",
    "Attraction reel",
  ],
  ["/viral-posts/food/pigtrotter.png", "2.1M", "Food guide"],
] as const;

export const workCards = [
  [
    "/viral-posts/food/26yrfishball.png",
    "Hawker food campaign",
    "@ SGDaily",
    "12.3M",
  ],
  [
    "/viral-posts/food/Screenshot 2024-10-11 at 10.05.56 PM.png",
    "Pizza promotion",
    "@ Fast casual chain",
    "8.7M",
  ],
  [
    "/viral-posts/things_to_do/IMG_8299.PNG",
    "Event launch reel",
    "@ Local attraction",
    "7.1M",
  ],
  ["/viral-posts/food/loklok.png", "Late-night buffet", "@ F&B brand", "6.3M"],
  [
    "/viral-posts/things_to_do/ritual_team.png",
    "Lifestyle experience",
    "@ Ritual team",
    "5.4M",
  ],
  [
    "/viral-posts/property/Screenshot_1.png",
    "Property explainer",
    "@ SGHomez",
    "4.6M",
  ],
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
  ["Short Video Creation", "TikTok, Instagram Reels and YouTube Shorts."],
  ["Social Media Management", "Content calendars, posting and community care."],
  ["Influencer Marketing", "Creator matching, outreach and campaign tracking."],
  ["Paid Advertising", "Meta, TikTok and conversion-led ad campaigns."],
  ["Strategy and Consulting", "Positioning, scripts and launch planning."],
] as const;

export const testimonials = [
  [
    "Viral Asia captured the essence of our restaurant and turned it into content customers remembered.",
    "Eric Tan",
    "Director, 87 Just Thai",
  ],
  [
    "They helped us build meaningful connections with potential partners and clients.",
    "Christel Goh",
    "Director, Grow Public Relations",
  ],
  [
    "Their targeted content explained our software clearly and brought the right audience to us.",
    "Yoeven D. Khemlani",
    "CEO, Jigsawstack",
  ],
  [
    "The team understands local trends and knows how to create content that drives action.",
    "Tianze Zhao",
    "Director, Nurture Studio",
  ],
  [
    "Their social media work increased our visibility and gave our brand a sharper voice.",
    "Shebella Beauty",
    "Beauty and cosmetics brand",
  ],
  [
    "Their attention to detail made a measurable impact on our marketing results.",
    "Travis Tay",
    "Director, The Social Chamber",
  ],
] as const;

export const stats = [
  ["500M+", "Total Views Generated"],
  ["1000+", "Viral Videos Created"],
  ["100+", "Brands Served"],
  ["50K+", "Followers Gained"],
] as const;

export const pageContent = {
  work: {
    title: "Our work",
    intro:
      "Short-form campaigns across food, property, retail and local experiences.",
    items: workCards.map((card) => [card[1], card[2], card[3]]),
  },
  services: {
    title: "Services",
    intro:
      "Production, creator partnerships and media buying handled as one growth system.",
    items: services.map((service) => [service[0], service[1], ""]),
  },
  clients: {
    title: "Clients",
    intro:
      "Singapore brands choose us when they need attention that turns into store visits, leads and sales.",
    items: partners
      .slice(0, 12)
      .map((partner) => [partner[1], "Campaign partner", ""]),
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
      ["WhatsApp", "+65 9090 6912", ""],
      ["Email", "hello@viralasia.co", ""],
      ["Office", "71 Ayer Rajah Crescent #02-12/13, Singapore 139951", ""],
    ],
  },
} as const;
