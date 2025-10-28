# Viral Asia Landing Page

A modern Astro-based landing page for Viral Asia, a TikTok affiliate marketing partner specializing in viral content creation and social media marketing.

## 🚀 Project Structure

Inside of this Viral Asia Landing Page, you'll see the following folders and files:

```text
/
├── public/
│   ├── images/           # Static images and assets
│   ├── logos/           # Company logos and brand assets
│   ├── viral-posts/     # Sample viral content examples
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Accounts.astro
│   │   ├── BlogHeader.astro
│   │   ├── Card.astro
│   │   ├── ClientsSection.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── ImageCard.astro
│   │   ├── LinkTree.astro
│   │   ├── Offers.astro
│   │   ├── PartnerCard.astro
│   │   ├── Posts.astro
│   │   ├── Testimonials.astro
│   │   ├── TestimonialSlider.astro
│   │   └── TikTokAffiliate.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   └── sanity.ts     # Sanity CMS integration
│   ├── pages/
│   │   ├── bio.astro
│   │   ├── blog/
│   │   │   ├── [slug].astro
│   │   │   └── index.astro
│   │   ├── index.astro
│   │   └── studio.astro
│   └── schemas/
│       └── [Sanity schemas]
└── package.json
```

## 🛠️ Tech Stack

- **Astro 4.1.1** - Static site generator
- **React 19.0.0** - Component framework
- **Tailwind CSS** - Utility-first CSS framework
- **Sanity CMS** - Headless content management
- **Swiper** - Touch slider component
- **Styled Components** - CSS-in-JS styling

## 📄 Pages

- **Home** (`/`) - Main landing page with TikTok affiliate marketing content
- **Bio** (`/bio`) - Team and company information
- **Blog** (`/blog`) - Content marketing blog with dynamic posts
- **Studio** (`/studio`) - Sanity CMS studio for content management

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🎯 Features

- **TikTok Affiliate Marketing** - Specialized landing page for TikTok partnerships
- **Dynamic Blog System** - Content management with Sanity CMS
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Testimonial Sliders** - Interactive client testimonials
- **Viral Content Showcase** - Portfolio of successful campaigns
- **Multi-page Architecture** - Bio, blog, and studio pages