# Melanie Baratto — Portfolio

A single-page personal portfolio for [Melanie Baratto](https://github.com/melaniesigrid), a Software Developer with a front-end specialty based in Toronto.

Built as a deliberate exercise in editorial typography, motion, and craft — without a framework, without a build step, and without a `node_modules` folder.

🌐 **Live:** [melaniesigrid.github.io](https://melaniesigrid.github.io/EditorialPortfolio/)

---

## ✦ Highlights

- **Single static HTML file** — no build pipeline, no dependencies, deploys via drag-and-drop
- **Ten-language i18n** (EN, ES, DE, FR, HE, RU, PT, UK, ZH, AR) with full RTL support for Arabic and Hebrew, browser-language auto-detect, and `localStorage` persistence
- **Editorial brutalist aesthetic** — `Anton` display + `Cormorant Garamond` italic + `IBM Plex Mono` + `DM Sans`
- **Scroll-driven motion** — staggered reveals, fill-on-scroll text, parallax cursor effects on work cards, animated mesh background
- **Glassmorphism**, drop-in letter animations with idle breathing/shimmer/ghost-echo, custom cursor with adaptive light/dark detection
- **Functional contact form** wired to [Formspree](https://formspree.io) with full client-side validation, sending state, and live region status announcements
- **Full accessibility pass** — skip link, `:focus-visible` rings, semantic landmarks, `aria-live` for form status, `aria-pressed` for toggles, `aria-hidden` on decorative elements
- **SEO complete** — Open Graph tags, Twitter cards, Schema.org `Person` + `Occupation` + `award` structured data, `knowsLanguage` array, dynamic `<html lang>` updates
- **Mobile-first responsive** — `vh` + `vw` clamps, sticky nav with adaptive theming, dedicated touch breakpoints

---

## ✦ Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 (single file) |
| Styling | CSS3 (custom properties, Grid, Flexbox, `clamp()`, `aspect-ratio`) |
| Motion | CSS keyframes + IntersectionObserver + Vanilla JS scroll listeners |
| Type | Google Fonts (Anton, Cormorant Garamond, IBM Plex Mono, DM Sans) |
| Forms | Formspree |
| Hosting | GitHub Pages |
| i18n | Custom vanilla translation engine (no library) |

**Why no framework?** A portfolio is a content site, not an application. React would have meant a build pipeline, a bundle the browser must parse before painting, and a hosting story more complex than `git push`. The single-file approach loads instantly and stays maintainable at this scale.

---

## ✦ Local Development

```bash
git clone https://github.com/melaniesigrid/melaniesigrid.github.io.git
cd melaniesigrid.github.io

# Serve locally with any static server:
python3 -m http.server 8000
# or
npx serve
```

Open `http://localhost:8000` and you're running the production site.

---

## ✦ File Structure

```
.
├── index.html                          # Entire site — markup, styles, scripts, translations
├── melaniemainpic.jpg                  # About-section portrait
├── BlockchainFuturistConference.jpeg   # NEAR section gallery
├── nearBountyWinners.jpeg              # NEAR banner team photo
├── discordWinnerAnnouncement.jpeg      # NEAR section gallery
├── blockchainConferenceViews.jpeg      # NEAR section gallery
├── melsmeta.jpeg                       # Mel's Meta logo
└── README.md                           # You are here
```

---

## ✦ Customising

**Adding a new language** — extend the `i18n` object in the inline `<script>` near the bottom of `index.html`:

```js
const i18n = {
  en: { /* ... */ },
  ja: {
    "nav.work": "仕事",
    "nav.expertise": "専門",
    // ... matching keys for every entry in `en`
  }
};
```

Then add a button in the `.lang-dropdown` markup:

```html
<button class="lang-option" data-lang-set="ja">
  <span>日本語</span>
  <span class="lang-option-code">JA</span>
</button>
```

**Updating the contact form endpoint** — replace the Formspree URL in the `submit` handler. The form ID is `contactForm`.

**Adjusting the theme** — all colors and type tokens live in CSS custom properties at the top of `<style>`:

```css
:root {
  --ink: #0E0E0E;
  --paper: #F4F1EC;
  --red: #E8380D;
  --D: 'Anton', Impact, sans-serif;          /* Display */
  --S: 'Cormorant Garamond', Georgia, serif; /* Serif italic */
  --M: 'IBM Plex Mono', monospace;           /* Mono */
  --B: 'DM Sans', system-ui, sans-serif;     /* Body */
}
```

---

## ✦ Performance

- **Single HTTP request** for HTML; remaining requests are images and Google Fonts only
- **No JavaScript framework** to parse before first paint
- **`will-change` hints** scoped to animated elements only
- **`IntersectionObserver`** for scroll-triggered animations (no `scroll` listeners except for hero logo + section detection)
- **Images served as WebP** for further size reduction and quick load.

---

## ✦ Accessibility

- Skip-to-main link for keyboard users
- Visible `:focus-visible` outlines on all interactive elements
- Semantic landmarks (`<nav>`, `<section>`, `<footer>`)
- `aria-label`, `aria-pressed`, `aria-expanded`, `aria-modal` where appropriate
- Form errors and status announced via `role="alert"` and `aria-live="polite"`
- Decorative motion elements marked `aria-hidden`
- Custom cursor disabled on touch devices via `@media (hover: none)`
- All translations update `<html lang>` and `<html dir>` for screen-reader correctness

---

## ✦ Contact

**Melanie Baratto** — Software Developer · Front-End Specialty
📍 Toronto, ON

- ✉️ [melaniesigrid@protonmail.com](mailto:melaniesigrid@protonmail.com)
- 💼 [LinkedIn](https://linkedin.com/in/melaniesigrid)
- 💻 [GitHub](https://github.com/melaniesigrid)
- ✍️ [Medium](https://medium.com/@melaniesigrid)
- 🚀 [Wellfound](https://wellfound.com/u/melanie-sigrid-arellano-baratto)

---

## © 2026 Melanie Baratto. All rights reserved.

This repository is published publicly so the live site can be hosted via GitHub Pages, but the code, content, design, copy, photographs, and personal information are not licensed for reuse, redistribution, or derivative works.
If you'd like to discuss using parts of this work, please reach out first.
The **content** — copy, photographs, design choices, and personal information — is © Melanie Baratto and is not licensed for reuse.

---

<sub>Built with intention. No frameworks were harmed in the making of this portfolio.</sub>