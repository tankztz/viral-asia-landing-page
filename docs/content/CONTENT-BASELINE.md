# Content Baseline For Style Refactor

Snapshot date: 2026-06-14

This document defines the content that should survive the next visual rebuild.
The generated [rendered snapshots](./snapshot/README.md) contain the complete
visible text, image paths, links, and current render counts for every public
page except `/studio`.

Use the generated [visible image gallery](./snapshot/IMAGE-GALLERY.md) to review
all displayed local and Sanity-hosted images visually.

## Preservation Principle

The next phase may replace layout, typography, color, animation, and component
structure. It should not silently remove or rewrite business claims, proof,
portfolio media, contact methods, social links, blog content, or conversion
targets.

Content changes should be reviewed separately from style changes.

## Snapshot Coverage

- 7 public content routes recorded; `/studio` is intentionally excluded.
- Homepage: 76 visible text lines and 124 unique displayed inline/background
  images.
- Full public site: 134 unique displayed image URL variants, including Sanity
  main images rendered at different URLs on index and detail pages.
- Every snapshot records visible text, inline images, background images, links,
  render counts, and file sizes where available.

## Global Content

### Brand And Positioning

- Brand: Viral Asia
- Primary positioning: TikTok Affiliate Partner
- Primary promise: Go VIRAL Today!
- SEO description: Viral Asia is a leading social media marketing company in
  Singapore that helps businesses grow their online presence.

### Primary Conversion

- CTA label: Enquire Now / Enquire now
- Target:
  `https://wa.me/6590906912?text=I'm%20interested%20in%20your%20social%20media%20service`
- This WhatsApp target appears throughout the homepage and blog. Preserve it as
  the primary conversion destination until a replacement funnel is approved.

### Contact And Legal

- Address: 11 mosque street #02-01
- Email: hello@viralasia.co
- Phone: (+65) 9090 6912
- Legal name: VIRALASIA PTE LTD
- Current copyright text: © 2025 VIRALASIA PTE LTD. ALL RIGHTS RESERVED.

### Shared Brand Media

- `/company/ViralAsia.png`
- `/favicon.svg`
- `/images/moving.gif` is the current CTA background.
- `/images/professional_team.jpg` is the current footer background.

## Homepage Content Order

The current page establishes this narrative. The redesign may reorder sections,
but should preserve the underlying content until the conversion strategy is
explicitly changed.

1. Hero: brand, “Go VIRAL Today!”, WhatsApp CTA.
2. TikTok affiliate positioning and explanation.
3. Viral post portfolio across food, things to do, property, and horizontal
   video.
4. Owned viral accounts and outbound social links.
5. Five service offers.
6. Three before-and-after result claims.
7. Six long-form client testimonials.
8. Client/partner logo wall.
9. Contact and legal footer.

## Homepage Portfolio Media

### Viral Post Categories

- Food: 8 unique images from `public/viral-posts/food`.
- Things to do: 9 unique displayed images from
  `public/viral-posts/things_to_do`.
- Property: 7 unique images from `public/viral-posts/property`.
- Horizontal video: 4 image thumbnails linked to YouTube.

`public/viral-posts/things_to_do/IMG_8299.PNG` exists but is not currently
displayed because its uppercase extension does not match the source glob.

### Horizontal Video Links

| Thumbnail                                  | YouTube target                                |
| ------------------------------------------ | --------------------------------------------- |
| `/viral-posts/horizontal/59JCT.jpg`        | `https://www.youtube.com/watch?v=-fMmrm7shjY` |
| `/viral-posts/horizontal/bali.png`         | `https://www.youtube.com/watch?v=FQXLzUmQsLM` |
| `/viral-posts/horizontal/intan.png`        | `https://www.youtube.com/watch?v=jtkM3z5l3xc` |
| `/viral-posts/horizontal/shophouse160.jpg` | `https://www.youtube.com/watch?v=nbXoNcELyyI` |

## Owned Accounts

| Account  | Description                         | Image                  | Target                                        |
| -------- | ----------------------------------- | ---------------------- | --------------------------------------------- |
| SGDaily  | Daily updates on Singapore life     | `/company/SGDaily.png` | `https://www.instagram.com/thesgdaily/reels/` |
| SGHomez  | Singapore homes and property market | `/company/SGHomez.png` | `https://www.instagram.com/thesghomez/reels/` |
| Hype Hub | Asian culture                       | `/company/hypehub.png` | `https://www.tiktok.com/@hypehub88`           |

The `/bio` page uses a related but different account set: SGDaily, SGHomez, and
SGCupid. Its complete content is recorded in the rendered snapshot.

## Services

| Service                     | Current image            |
| --------------------------- | ------------------------ |
| VERTICAL video production   | `/images/ad_posting.png` |
| HORIZONTAL video production | `/images/tahsh.png`      |
| Managing your social media  | `/images/smm.png`        |
| Influencer marketing        | `/images/influencer.png` |
| In house models             | `/images/models.jpg`     |

## Proof And Testimonials

### Before And After Claims

| Claim                                                                                 | Company        | Image                       |
| ------------------------------------------------------------------------------------- | -------------- | --------------------------- |
| Social Chamber’s month on month revenue growth 5X after our vertical video release.   | Social Chamber | `/images/socialchamber.png` |
| Top 3 in iOS most downloaded chart after our social media management within 1st month | Stayr Pte Ltd  | `/images/stayr.png`         |
| Stayr gains 51% more sales per month and achieved a 100X revenue boost in a year.     | Stayr Pte Ltd  | `/images/stayr2.png`        |

The exact long-form testimonial quotes, names, roles, and six associated logos
are preserved in [the homepage snapshot](./snapshot/home.md).

### Partner Logos

The homepage currently displays 76 unique partner logo images in a three-row
carousel. Preserve the logo set, but it can be deduplicated, optimized, and
presented with a different interaction. The exact displayed set is recorded in
[the homepage snapshot](./snapshot/home.md).

The six testimonial logos are separate from the 76 partner logos. Partner logo
alt text is currently broken and renders as the literal `{{text}}`; correct it
during the refactor without removing the logos.

## Blog Content

- Content source: Sanity project `3an9f3n5`, dataset `production`.
- Blog index currently displays four posts.
- Each post displays a title, publication date, main image, shared marketing
  introduction, PortableText body, CTA, and footer.
- Two posts contain body images that currently fail to render. Do not treat
  those missing rendered images as removable content.
- “image testing page testing 12:58” appears to be a test post. Keep it in the
  baseline, but flag it for an editorial keep/remove decision before launch.

The full rendered body text and external Sanity image URLs are recorded in the
individual [blog snapshots](./snapshot/README.md).

## Style Refactor Guardrails

- Preserve all primary CTA destinations and social targets.
- Preserve every proof claim and testimonial verbatim until fact-checked.
- Preserve the complete displayed portfolio and partner-logo set.
- Preserve existing public routes or add explicit redirects.
- Keep blog content sourced from Sanity during the style-only phase.
- Do not carry `/studio` into the redesigned public marketing bundle.
- Separate content edits from visual changes so review can identify both.
- Add conversion analytics before evaluating whether the redesign performs
  better.
