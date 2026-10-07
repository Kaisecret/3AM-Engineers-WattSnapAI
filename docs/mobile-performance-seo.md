# Mobile performance and public SEO

The public landing page uses `https://www.wattsnapai.dev` as its canonical origin. The user supplied `wattsnapai.dev`; its HTTPS response redirects to www. Canonical links, Open Graph URLs, WebSite structured data, robots.txt and sitemap.xml use that same origin, defined in `src/lib/site.ts`.

## Changes

- Replace the CSS panorama PNG (1,594,805 bytes) with a mobile WebP (38,462 bytes) and desktop WebP (86,658 bytes), generated from the existing artwork. The mobile background is 97.6% smaller. The desktop feature-section background reuses the desktop WebP.
- Preload only the background that matches the viewport, plus the mobile phone artwork on phones. Keep the responsive preload and rendered image URLs consistent through Next's `getImageProps`.
- Add 480px and 960px image candidates to Next's existing defaults, correct the mobile headline size hint, and use quality 70 for the hero images. The original source artwork remains available.
- Self-host Plus Jakarta Sans through `next/font/google`, with swap and an adjusted fallback. Runtime requests no longer depend on Google's font stylesheet or font servers.
- Scope the existing loading screen to the account and household route groups. The public homepage renders visibly without JavaScript instead of remaining behind the root loading boundary.
- Add a concise title/description, canonical link, Open Graph/Twitter metadata, a 1200×630 sharing image, WebSite JSON-LD, robots.txt and a public sitemap. Use a small square favicon and retain the existing install and Apple icons.
- Replace the ambiguous "Learn More" link with "Review advisories" pointing to Advisories. Account and household preview pages use noindex metadata and are omitted from the sitemap; crawlers can still retrieve those pages to read their noindex directive.

## Verification on October 7, 2026

Lighthouse 13.5.0 audited the production build at `http://127.0.0.1:3001`, using its default mobile configuration. The original build and final build used the same local setup. These are lab results; they do not reproduce the supplied screenshot's deployment/network conditions or establish field Core Web Vitals.

| Metric | Original build | Final build |
| --- | --- | --- |
| Performance | 59 | 82 |
| SEO | 91 | 100 |
| Accessibility | 100 | 100 |
| Best practices | 100 | 100 |
| First contentful paint | 1.8 s | 1.7 s |
| Largest contentful paint | 14.6 s | 4.6 s |
| Total blocking time | 530 ms | 40 ms |
| Cumulative layout shift | 0 | 0 |
| Total transfer size | 2,674 KiB | 613 KiB |

The remaining LCP time is mostly rendering delay in the lab model. The background now passes all three discovery checks: early discovery, high fetch priority and eager loading. A public PageSpeed rerun after deployment is needed to measure the production domain.

`npm run build` passes TypeScript and generates the homepage, robots and sitemap statically. The existing missing-ESLint-configuration warning remains.

`tests/e2e/landing-performance-preview.cjs` passes at 1440, 768, 412 and 320px. It verifies SEO metadata, visible server-rendered content without JavaScript, the matching background only, self-hosted fonts, layout, menu, walkthrough and chat. It also checks sitemap/robots responses and noindex metadata on account/household routes. `tests/e2e/ui-workflow-navigation.cjs` passes at desktop and phone widths across all seven household workflows.

To repeat the audit, build and start the production server, then run:

```sh
npx --yes lighthouse@13.5.0 http://127.0.0.1:3001 --chrome-flags="--headless" --output=json --output=html --output-path=./mobile-audit
```

The browser scripts accept `UI_PREVIEW_URL` and `PLAYWRIGHT_MODULE` when Chrome/Playwright are installed outside the project.

Implementation references: [Next 15 fonts](https://nextjs.org/docs/15/app/api-reference/components/font), [responsive images and resource priorities](https://nextjs.org/docs/15/app/api-reference/components/image), [metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), [Google favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search).
