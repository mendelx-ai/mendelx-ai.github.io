# mendelX website

Marketing site for **mendelX** — AI for precision agriculture.
Built with [Astro](https://astro.build), deployed to GitHub Pages at **https://mendelx-ai.github.io**.

## Run it locally

Requires Node.js 22+.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # production build into dist/
npm run preview    # serve the production build
```

## Where things live

| What | File |
|---|---|
| **All page text** | `src/content/copy.en.ts` |
| Settings & placeholders (form, email, analytics…) | `src/config.ts` |
| Colours, fonts, buttons, spacing | `src/styles/global.css` |
| Page sections | `src/components/*.astro` |
| Hero point cloud (three.js, lazy-loaded) | `src/scripts/hero-pointcloud.ts` |
| "From orbit to every row" animation | `src/scripts/orbit-sequence.ts` |
| Privacy notice | `src/pages/privacy.astro` |
| Favicons, social image, hero still, fonts | `public/` |

To change wording, edit `src/content/copy.en.ts` and push — the layout adapts.
A Greek version can later be added as `copy.el.ts` with the same structure
(note: Chakra Petch has no Greek characters, so Greek headlines will need a companion font).

## Before launch — placeholders to fill in `src/config.ts`

Anything left empty is hidden automatically.

- [ ] `FORM_ENDPOINT` — create a free form at [formspree.io](https://formspree.io), paste its URL
      (e.g. `https://formspree.io/f/abcdwxyz`). Until then the pilot form shows "Applications open soon".
- [ ] `CONTACT_EMAIL` — used by "Get in touch", the footer and the privacy notice.
- [ ] `LOCATION`, `LINKEDIN_URL` — footer.
- [ ] `LEGAL_ENTITY`, `VAT_NUMBER` — once the company is registered (footer + privacy notice).
- [ ] `CLOUDFLARE_ANALYTICS_TOKEN` — from Cloudflare dashboard → Analytics & Logs → Web Analytics → add site.
      Cookie-free, so no cookie banner is needed.
- [ ] Team photos (optional) — replace the monograms in `src/components/Team.astro`.

## Deployment (GitHub Pages)

Every push to `main` builds and deploys automatically via `.github/workflows/deploy.yml`.

**One-time manual step:** in the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.

The `dist/` output is plain static files, so it also works unchanged on Cloudflare Pages
(build command `npm run build`, output directory `dist`).

## Switching to the custom domain (mendelx.ai)

1. Create `public/CNAME` containing one line: `mendelx.ai`
2. Change `site` in `astro.config.mjs` and `SITE_URL` in `src/config.ts` to `https://mendelx.ai`,
   and the sitemap line in `public/robots.txt`.
3. Repository **Settings → Pages → Custom domain**: enter `mendelx.ai` and save.
4. At your domain registrar, add the DNS records GitHub shows (four `A` records for the apex domain,
   plus a `CNAME` for `www` pointing to `mendelx-ai.github.io`).
5. Once the check passes, tick **Enforce HTTPS**.

## Regenerating images

`public/hero-fallback.webp`, `public/og-image.png` and the PNG icons are generated from the site's own code:

```bash
npm run build
npx astro preview --port 4321 &
pip install playwright pillow && playwright install chromium
npm run assets
```

## Design notes

- Dark only. Accent green `#C6F432` is reserved for buttons, the X in the logo, scan lines and small markers.
- Fonts (self-hosted): Chakra Petch for the logo, headlines and labels; Barlow for body text.
- The hero shows a still image first; the live 3D field loads afterwards, and is skipped on
  reduced-motion, data-saver, slow-connection and low-memory devices.
- Content rule: no invented numbers, testimonials or logos until they are real.
