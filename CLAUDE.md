# The Archeometer — Project Guide

## What this is

An English translation of Saint-Yves d'Alveydre's **L'Archéomètre** (1911), published as a web reader at [thearcheometer.com](https://thearcheometer.com). Translated by [@matmoura19](https://x.com/matmoura19) using [translateabook.com](https://translateabook.com).

The site also includes two interactive tools: an Archeometer SVG visual with a gematria music player, and Saint-Yves' natal chart.

## Stack

- **Astro 4** (static site, deployed on Vercel)
- **Tailwind CSS 3** with `@tailwindcss/typography` for prose styling
- **MDX** via `@astrojs/mdx@3` (v3 required — v5 is for Astro 5)
- **React 18** for interactive components (natal chart, music player)
- **Strudel** for the gematria music player
- **kaabalah** npm package for chart calculations

## Project structure

```
src/
├── content/
│   └── chapters/           # Book chapters as .mdx files
│       ├── 00-front-matter.mdx
│       ├── 01-dedication.mdx
│       ├── 02-preface.mdx
│       └── 03-first-part-ch1-mental-regression.mdx
├── pages/
│   ├── index.astro          # Homepage — book intro, chapter list, tool links
│   ├── chapters/
│   │   └── [...slug].astro  # Chapter reader with prev/next navigation
│   ├── archeometer.astro    # Interactive Archeometer (SVG + music)
│   ├── natal-chart.astro    # Saint-Yves' natal chart
│   └── sitemap.xml.ts
├── layouts/
│   └── Layout.astro         # Base layout (nav, footer, meta, analytics)
├── components/
│   ├── ThemeToggle.astro
│   ├── NatalChartWheel.tsx
│   └── GematriaStrudelPlayer.tsx
└── styles/
    └── global.css
```

## Content system — how chapters work

Chapters use Astro's content collections with the `glob` loader. Defined in `src/content.config.ts`:

```ts
const chapters = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/chapters" }),
  schema: z.object({
    title: z.string(),
    part: z.string(),
    chapter: z.number(),    // Determines ordering and navigation
    subtitle: z.string().optional(),
  }),
});
```

**The `chapter` number drives everything** — ordering on the index page, prev/next navigation in the reader. It does NOT have to match the book's own chapter numbering. It's a sequential position in our site:

| chapter | File | Book section |
|---------|------|-------------|
| 0 | `00-front-matter.mdx` | Title page, publisher catalog |
| 1 | `01-dedication.mdx` | Dedication + Notice (editors, 1911) |
| 2 | `02-preface.mdx` | Preface (by Saint-Yves) |
| 3 | `03-first-part-ch1-mental-regression.mdx` | First Part, Chapter One |
| 4 | (next) | First Part, Chapter Two: Triumphant Error |
| ... | ... | ... |

## Adding a new chapter

1. Create `src/content/chapters/NN-slug-name.mdx` (NN = next number for sorting)
2. Add frontmatter:
   ```yaml
   ---
   title: "Chapter Two: Triumphant Error"
   part: "First Part: The Wisdom of Man and Paganism"
   chapter: 4
   subtitle: "Optional subtitle"
   ---
   ```
3. Write content as HTML inside the MDX file (full HTML control — `<p>`, `<div>`, classes, SVGs, React components all work)
4. That's it — it automatically appears on the index and gets prev/next navigation

## Source material

The complete translated HTML is at:
```
/Volumes/AKASH/aula kaabalah/books/archeometer/en_archeometer_with_notes.html
```

This is a ~22,000-line HTML file with the full book. It includes base64-encoded images (which need to be extracted/updated before adding to the site — this is why chapters are added incrementally).

### Book structure in the source HTML

```
Lines 73-413:    Front matter (title pages, publisher catalog)
Lines 414-537:   Book I header, TOC, Dedication, Notice
Lines 538-686:   Preface
Lines 687-853:   First Part → Chapter One: Mental Regression
Lines 854-1242:  First Part → Chapter Two: Triumphant Error
Lines 1243-1483: First Part → Chapter Three
Lines 1484-3872: Second Part → Chapters One–Three
Lines 3873-4485: Appendices I–III
Lines 4486-5148: Notes on the Cabalistic Tradition
Lines 5149-14405: Book II — Description and Study of the Archeometer (Ch. I–V)
Lines 14406+:    Book III — Adaptations of the Archeometer
Lines 21856+:    Translator's Notes (T-01 through T-XX)
```

## MDX gotchas

- **`[*]` must be escaped as `[&#42;]`** — MDX interprets `[*]` as markdown syntax and breaks. All footnote references use this pattern.
- **Footnote links pattern** — in-text: `<sup><a href="#T-01" id="ref-T-01">[&#42;]</a></sup>`, at bottom: `<p id="T-01">...<a href="#ref-T-01">↩</a></p>`. Bidirectional.
- **Use `<i>` not `<em>` inside JSX-attributed elements** (like `<p class="...">`) — MDX sometimes mis-parses `<em>` as markdown emphasis in those contexts.
- **Author footnotes** (like `(1) See Mission des Juifs`) are inline in the text, not linked — they use simple `<sup>(1)</sup>` notation.

## URL structure

- `/` — homepage
- `/chapters/00-front-matter` — chapter pages (slug = filename minus `.mdx`)
- `/archeometer` — interactive Archeometer
- `/natal-chart` — Saint-Yves' natal chart

The `[...slug].astro` page strips `.mdx` from the collection ID to create clean URLs.

## Commands

```bash
npm install              # Use --legacy-peer-deps if peer dep conflicts
npm run dev              # Dev server (usually port 4321)
npm run build            # Static build to .vercel/output/static/
```

## Deployment

Static output on Vercel. Config in `vercel.json` and `astro.config.mjs` (adapter: `@astrojs/vercel/static`).

## What NOT to change

- The interactive tools (archeometer.astro, natal-chart.astro) — they work, don't touch
- The Layout.astro nav structure
- Google Analytics setup
- The `kaabalah` and `@strudel/*` dependencies
