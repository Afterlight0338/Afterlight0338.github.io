# vivlos.dev, Project Specification, Technical Documentation & Decision Ledger

> **Single Source of Truth**: This document records the state of `vivlos.dev`: how the redesign is built, the rules that keep it working, every decision Afterlight has made, authoring templates, and what is left to do. Any AI agent (or Afterlight) resuming this project should start by reading this file, then `DESIGN_CONSTITUTION.md`.

*Last updated: 2026-10-07.*

---

## Quick Status Summary

1. **vivlos.dev**: the redesign is live at the root since 2026-09-30. `/preview/` now only redirects there (keeping the tab hash). Missing paths get the custom `404.html`.
2. **What it has**: Five perspective tabs, liquid glass (Discord card + tab lens), osu!lazer palette with one colour per tab, Torus Pro, an **Animations** switch, live Discord presence, live osu! stats, top 50 plays with audio previews. Copy is still a draft for Afterlight to rewrite.
3. **Governing design document**: `DESIGN_CONSTITUTION.md` (symlinked as `AGENTS.md`). Its rules still apply. The one approved exception is glassmorphism, scoped in Part 2.

---

# Part 1: Technical Documentation

> **Principle**: implementation facts only. Content and design decisions live in Part 2.

### 1. Repository layout
```
Afterlight0338.github.io/
├── CNAME                      # vivlos.dev
├── .nojekyll                  # serve files raw (no Jekyll)
├── index.html                 # markup for all five tabs, link-preview tags
├── style.css                  # tokens, layout, glass fallback, motion
├── app.js                     # tabs, motion switch, glass, Lanyard, osu!, audio
├── 404.html                   # custom not-found page (absolute URLs, uses style.css)
├── preview/index.html         # redirect to / for old links
├── s640/                      # vivlos.dev/s640: Veikk S640 firmware notes (generated, see Part 7)
│   ├── index.html             # built from README.md of Afterlight0338/s640-fw-docs-claude
│   ├── s640.css               # page layout on top of /style.css tokens
│   └── images/                # the two annotated board photos
├── assets/
│   ├── fonts/                 # TorusPro Regular / SemiBold / Bold / Heavy (woff2)
│   ├── vivlos/                # casual, racing, stage, summer (transparent webp)
│   └── og.jpg                 # 1200x630 link-preview image (screenshot of the header)
├── data/osu.json              # snapshot: profile + top 50 plays (fallback + score list)
├── worker/                    # Cloudflare Worker proxying the osu! API (osu-api-proxy)
├── DESIGN_CONSTITUTION.md     # design rules (AGENTS.md is a symlink to it)
└── SPECIFICATION_INTERVIEW.md # this file
```

### 2. Page structure (`index.html`)
* **Status rail**: domain, OS, UTC+8 clock, Animations switch (`#motion-switch`, `role="switch"`).
* **Masthead** (`#masthead`, a liquidglass root). Direct children, in order: `.glass-backing`, `img#vivlos-art`, `.masthead-main` (kana, title, manifesto), `aside#lanyard-panel.glass` (Discord card).
* **Tab bar** (`#archive-nav`, a second liquidglass root): `.glass-backing`, five `a.nav-tab` (`#about`, `#projects`, `#workstation`, `#rhythm`, `#lore`), `span#tab-lens.glass`.
* **Sections**: `section.archive-section` per tab. JS sets `hidden` on all but the active one; without JS every section shows as one long page.
* Default tab is Profile (`#about`). The URL hash keeps a tab linkable, and back/forward works (`pushState` + `popstate`).

### 3. Styling (`style.css`)
* No framework or preprocessor. Tokens on `:root`.
* **Accent**: `--accent` is registered with `@property` (so it can animate) and set per tab on `html[data-tab=…]`:

  | Tab | Colour | Token |
  | :--- | :--- | :--- |
  | Profile | `#66ccff` | `--osu-blue` |
  | Projects | `#8c66ff` | `--osu-purple` |
  | Workstation | `#b2ff66` | `--osu-lime` |
  | Rhythm | `#ff66aa` | `--osu-pink` |
  | Lore | `#ffcc22` | `--osu-yellow` |

  All values come from osu!lazer `OsuColour.cs`. Grades use `OsuColour.ForRank` (SS `#de31ae`, S `#02b5c3`, A `#88da20`, B `#e3b130`, C `#ff8e5d`, D `#ff5a5a`); mods use the lazer ModType colours (difficulty increase red, reduction lime, automation blue). Discord status dots keep their own semantic colours.
* **Fonts**: `Torus Pro` (self-hosted) for everything, `Zen Kaku Gothic New` as the fallback for Japanese glyphs only, `Maple Mono` for data and labels.
* **Motion**: every transition and animation is scoped under `[data-motion="on"]`. With the switch off (or no JS) nothing moves.
* **Breakpoints**: 900px (single column, Discord card capped at 360px with headroom for Vivlos) and 640px (tabs become a 3 + 2 grid, tab numbers and kanji hidden, combo and grade columns dropped).

### 4. Behaviour (`app.js`, one IIFE)
* **Motion switch**: defaults to `prefers-reduced-motion`; an explicit choice is stored in `localStorage["vivlos-motion"]` (wrapped in try/catch).
* **Tabs**: `show(id)` sets `data-tab`, toggles `hidden`, moves the lens (`translate` + a WAAPI `scale` squish), swaps the Vivlos outfit, and staggers the new tab's blocks in from the direction of travel (`.rise`, `--dx`, `--i`).
* **First load** (motion on only): the masthead text and the opening tab's blocks rise in with the same `.rise` stagger, and Vivlos is held behind the card until her image decodes, then pops up (`introArt`). Hovering the Discord card makes her hop (`initArtHop`, WAAPI id `hop`). All her moves go through `artPose(img, y)`, which shifts the clip with her.
* **Vivlos outfit per tab**: Profile `summer`, Projects `racing`, Workstation `casual`, Rhythm `stage`, Lore `summer`. The swap drops her behind the card and pops her back up; the `clip-path` moves with the `transform` so she never shows below the masthead. Other outfits are preloaded after `load`.
* **Glass**: after `load` and `document.fonts.ready`, dynamically imports liquidglass 1.0.3 from jsDelivr and initialises both roots in parallel. Skipped when WebGL is missing or `prefers-reduced-transparency: reduce`; on any failure the CSS glass stays.
* **Clock**: `Intl.DateTimeFormat` with `Asia/Kuala_Lumpur`.
* **Lanyard**: WebSocket `wss://api.lanyard.rest/socket`, Discord ID `553169854304354304`, reconnects after 6s. Shows Spotify (with progress), else the first activity, else the custom status. Text that actually changes fades up (`.swap`); Lanyard resends unchanged presence often, and those don't animate.
* **osu!** (user `14671577`): renders `data/osu.json` first, then overwrites stats from `https://osu-api-proxy.mfarrishahk.workers.dev/api/osu?user=14671577` (4s timeout). Live numbers that differ from the snapshot roll over to the new value and flash the accent, held until the Rhythm tab is visible (`pendingStats`). Top 5 plays, expandable to 50 (rows stagger in) and collapsible (extra rows leave bottom-up first); row 1 is the spotlight.
* **Audio previews**: one `Audio` at a time from `https://b.ppy.sh/preview/{setId}.mp3`, volume 0.35. Playing buttons show three level bars (animated only with motion on).

### 5. Original implementation baseline (before the redesign)
The pre-redesign site was a two-column layout (sticky left profile column, four identical rounded "mega-cards" on the right) with scripts (since deleted) `js/vivlos.js` (clock, copy toast), `js/lanyard.js` (presence) and `js/osu.js` (proxy fetch with `sessionStorage` cache, Top 1 banner, Top 5 list). It used cyan/gold/emerald/rose accents, Zen Kaku Gothic New, 20px card radius and radial-gradient backgrounds. Kept here only as the reference for Parts 2 and 3; none of it is in the repo any more (removed 2026-09-30 along with `css/`, `roxy/`, `site-1/`, `stripped/`).

---

# Part 2: Decision Record & Comparison Ledger

Status Legend:
* `decided`: Explicitly chosen and confirmed by Afterlight.
* `user will write`: Content that Afterlight will personally author.
* `undecided`: Not yet determined.
* `removed`: Explicitly discarded.

| Area | Original Site Implementation | Afterlight's Decision / Revision | Status |
| :--- | :--- | :--- | :--- |
| **Site Purpose** | Portfolio + Discord card + osu! widget | **"A place where I be what I want to be and for people to know what kind of person they're dealing with."** | **decided** |
| **Page Architecture** | 1 continuous scrolling page with 4 cards | **Option 3: Single-View Perspective Tabs** (Switch perspectives without full page reloads) | **decided** |
| **Content Scope** | Bio, Repos, Specs, osu!, Vivlos, Discord | **Keep everything** ("Honestly speaking there's nothing I would remove") | **decided** |
| **Bio & Statements** | 3 casual paragraphs ("I build shi...", NixOS larp, Vivlos) | User will re-write based on current baseline | **user will write** |
| **Featured Projects** | 4 simple link rows with 1 generic sentence | See Part 5 answers (5 projects) | **decided** |
| **System & Hardware** | 2-column key-value tables | Keep hardware and calibration telemetry (User will re-write/verify details) | **user will write** |
| **osu! / Rhythm Section**| Live stats grid, Top 1 banner, Top 5 expandable list | Keep stats, Top 50 scores, and audio preview player | **decided** |
| **Lanyard Discord Sync** | Live status, game activity, Spotify progress bar | Keep real-time presence | **decided** |
| **Vivlos Mascot & Lore** | 4 character cutouts in card headers | Keep lore & aesthetic connection (User will re-write/refine commentary) | **user will write** |
| **Visual Containerization**| 4 identical rounded mega-cards | Hairline rules, no cards; one bordered box for live Discord presence. 5 perspective tabs | **decided** |
| **Glassmorphism** | None | **Explicitly requested (2026-09-27)**, overrides the Constitution's default ban. Scope: Discord card + tab lens only, via [liquidglass](https://github.com/ybouane/liquidglass) 1.0.3 (WebGL, pinned on jsDelivr). CSS glass fallback; skipped under `prefers-reduced-transparency` | **decided** |
| **Typography** | Zen Kaku Gothic New + Maple Mono | Torus Pro (osu!'s typeface, self-hosted in `assets/fonts/`); Zen Kaku kept only for Japanese glyphs; Maple Mono for data | **decided** |
| **Colour** | Cyan/gold/emerald/rose accents | osu!lazer `OsuColour` palette, one colour per tab (blue / purple / lime / pink / yellow) that the whole page shifts to; lazer rank + mod colours in the scores table | **decided** |
| **Animation** | Static | Behind an **Animations** switch in the status rail (defaults to OS reduced-motion, remembered per browser): tab content slides in from the travel direction, glass lens slides with squish, Vivlos outfit swap behind the card, eq bars on playing previews, staggered rows on expand and collapse. Added 2026-10-07 at Afterlight's request: first-load entrance (header, tab content, Vivlos rising behind the card), Vivlos hop on hovering the Discord card, live osu! stats rolling to their new value, Discord text fading in when it changes | **decided** |

---

# Part 3: Authoring Clues & Work-in-Progress Ledger (Original | Afterlight's Version)

> **Purpose**: This table provides a clue/baseline of what existed originally to serve as a side-by-side template while Afterlight writes the replacement text.

| Component / Section | Original Text (Clue / Baseline) | Afterlight's Version (To Be Written) |
| :--- | :--- | :--- |
| **Site Title & Tagline** | `"Afterlight"`<br>`"I build stuff, mess around with techs, play way too many rhythm games, and an Arknights enjoyer."` | `placeholder, user authored` |
| **Bio: Opening Paragraph** | `"Hey, I'm Afterlight. I build shi, mess around with tech, and spend a questionable amount of time playing rhythm games. Most of the things I make starts with 'ts so ass im gonna make one my own', or thinking 'no one made ts yet'"` | `placeholder, user authored` |
| **Bio: System / Linux** | `"I run NixOS with Hyprland as my daily setup, mostly because larp. It also gives me a very convenient excuse to spend hours tweaking things that were already working perfectly fine."` | `placeholder, user authored` |
| **Bio: Vivlos / Lore** | `"The name vivlos.dev comes from Vivlos (ヴィブロス) from Umamusume: Pretty Derby. There's no particularly deep meaning behind it, I like Vivlos, I liked the name, and apparently I liked it enough to call the domain vivlos.dev, and i dont even play Uma."` | `placeholder, user authored` |
| **Hardware & Input Calibration** | *Machine*: Acer Nitro V 15, Ryzen 5 7535HS, RTX 3050 6GB, 32GB DDR5 4800MHz, NixOS 26.05, Hyprland, AOC 24G11ZE 240Hz.<br>*Input*: SayoDevice K05 HE (Rapid Trigger 0.2mm actuation / 0.3mm release), Wacom Bamboo CTH-670 (Area: 67.67 × 39.39 mm, Ratio: 1.718 : 1), Everglide AE68 PRO | `placeholder, user authored` |
| **Rhythm Game Commentary** | `"Scores, stats, and other."`<br>Top 1 Spotlight: Power of the Dragonflame (580.1pp, HDHR, 96.21%) | `placeholder, user authored` |

---


# Part 4: Project Catalog (verified against the repos, 2026-09-27)

> Facts below come from each project's README and git history. The earlier catalog had several wrong descriptions; do not reuse them.

**Featured on the site:**
1. **Hitsound Studio** (`Afterlight0338/hitsound-studio`, live at hitsound.vivlos.dev): FL Studio-style lane editor for osu! hitsounding. TypeScript, Canvas, Web Audio; fully client-side; exports a `[Hitsounds]` diff and copies hitsounds without touching SV.
2. **steal-framework** (`Afterlight0338/steal-framework`, live at steal.vivlos.dev): checks whether an osu! map copies another map of the same song (rhythm, positions, slider shapes, flipped/rotated/shifted variants) using the Hinamizawa mirror. TypeScript, Canvas, Vite.
3. **osu! Beatmap Gacha** (`Afterlight0338/osu-beatmap-gacha`, live at gacha.vivlos.dev): gacha game that pulls osu! beatmaps as cards. React 19, TypeScript, Cloudflare Workers + D1, osu! OAuth.
4. **re-fun60-ultra-tmr** (`Afterlight0338/re-fun60-ultra-tmr`, local `~/ry5088-flasher`): Afterlight's own open firmware (C, AT32F405) and WebHID web driver for the MonsGeek FUN60 Ultra TMR. Fixes mechanical-switch double typing (eager press, 8 ms deferred release). Built on dot-agi's ry5088-flasher tooling. Replaced my-nix-setup on 2026-09-30 at Afterlight's request.
5. **osu-skins** (`Afterlight0338/osu-skins`): Afterlight's skin collection, downloadable as `.osk` releases.

**Not featured (Afterlight's call):**
* **veikk-s640-zero-smoothing**: the code stays local, but the full write-up is public since 2026-10-06: repo `Afterlight0338/s640-fw-docs-claude` and the page vivlos.dev/s640. The tablet (MCU relabelled `VK1801`, a GD32F1x0-class Cortex-M3) was bricked by a DFU flash, recovered over SWD with a Pi Pico, and now runs a firmware patch that removes the 8-sample position average and the motion hold. The earlier DFU-only patch never worked (its sites were wrong). Not featured on the Projects tab (Afterlight's call, unchanged).
* **ry5088-flasher**: dot-agi's repository (flasher + firmware for RongYuan RY5088 magnetic keyboards). Afterlight rewrote a keyboard firmware with it; not their project.
* **youtube-music-cli**: a half-baked private fork (`Afterlight0338/ymc`); the commits are by involvex.
* Others in the workspace (osu-splitter-cli, yt-music-obs-overlay, choicer-online, osu-winello, lazer-mapping, etc.) were not discussed.

---

# Part 5: Interview Answers (2026-09-27)

| Question | Answer |
| :--- | :--- |
| **2.1 Tab grouping** | 5 tabs: Profile / Projects / Workstation / Rhythm / Lore. |
| **2.2 Featured projects** | Hitsound Studio (hitsound.vivlos.dev), steal-framework (steal.vivlos.dev), osu! Beatmap Gacha (gacha.vivlos.dev), re-fun60-ultra-tmr (replaced my-nix-setup, 2026-09-30), osu-skins. **Removed:** ry5088-flasher (dot-agi's repo; user only rewrote firmware with it), youtube-music-cli (half-baked private fork), veikk-s640-zero-smoothing (not published). |
| **2.3 Default view / pinned bar** | Profile opens by default. Status rail + Discord presence stay above every tab. |
| **Publish target** | Built at `vivlos.dev/preview/` (renamed from `dir-d`), promoted to the root on 2026-09-30. `/preview/` redirects. |
| **Rhythm games** | osu! standard + maimai. |
| **Input settings** | SayoDevice K05 HE: actuation 1.5 mm / release 0.3 mm, RT 0.2 mm press / 0.4 mm release. Keyboards: HyperX Alloy Origins (Red) + Everglide AE68 PRO. |
| **Links** | GitHub, osu!, Twitch, TikTok (@afterlight_1337), Discord copy. |
| **Copy** | Afterlight rewrote the tagline, Profile bio and sidebar (2026-09-30); project write-ups are still drafted from READMEs. |

---

# Part 6: Next Steps

1. **Copy**: the project write-ups are still drafts from each README; rewrite them whenever. Part 3 has the original text as a baseline.
2. **Look**: Afterlight to confirm the Vivlos size and outfit per tab, and the glass tuning.
3. **Done 2026-09-30**: promoted to the root, old files removed, link previews (`og:*` tags + `assets/og.jpg`), custom 404.

**Known rough edges:**
* The "Discord" label on the card is lower contrast where a bright part of an outfit sits behind it.
* Japanese text arriving from Lanyard (e.g. a Spotify title) renders in the system font, because Zen Kaku is subset to the page's own glyphs.
* Opening a deep link such as `/#rhythm` scrolls the browser to that section.

---

# Part 7: Maintenance Rules (read before editing the site)

These are the non-obvious things that broke once. Each one has a comment at the relevant spot in the code.

### Deploying
* **Bump `?v=` on `style.css` and `app.js` in `index.html` (and on `style.css` in `404.html`) whenever either file changes.** vivlos.dev is served with `cache-control: max-age=14400` (4 hours). Without a new URL, returning visitors get the new HTML with the old CSS/JS, and the page falls apart (this happened on 2026-09-27). Current: `?v=7`.
* GitHub Pages deploys in about 30 to 40 seconds after a push.
* Asset URLs are absolute (`/assets/...`, `/data/...`) so they work from `404.html` at any depth.
* **`assets/og.jpg`** is a screenshot of the header at 1200x630, taken in headless Brave with the live Discord status hidden (a frozen status would look wrong in every embed). Retake it if the header changes. Discord caches previews, so changes can take a while to show there.

### liquidglass (v1.0.3) constraints
* Glass elements must be **direct children** of the root passed to `LiquidGlass.init`.
* The shader's scene starts **white**, so each root has a `.glass-backing` layer in the page colour. It overhangs by 20px (the library's `SHADOW_PAD`), which the 32px section gaps absorb. Do not shrink those gaps below 20px.
* The library only redraws when something is marked dirty. **Anything that moves** (lens slide, Vivlos swap) must call `markChanged()` every frame while moving; that is `keepGlassFresh()` in `app.js`.
* Non-glass children are rasterised once with html-to-image and cached. So the **tab labels must not change style** with state (the lens alone marks the active tab), and images must be **direct `<img>` children** of the root (a wrapped image leaves a frozen copy). CSS `opacity` is ignored by the library; hide things with `display: none`.
* `fresnel` and `specular` are **0 on purpose**: the shader paints them as white from fixed virtual lights (one below the element) plus a "fake" environment reflection, which read as a grey shelf on the dark page. Lens `chromAberration` is 0 because it split the 3px tab bar's colour channels (blue showed olive). The lens uses `bevelMode: 1` (dome): the default biconvex rim pulls samples about 12px inward, which drew copies of the label along the lens's top and bottom edges (fixed 2026-10-07).
* Any `@font-face` inside a glass root must use **absolute URLs**: the library resolves font URLs against the page, not the stylesheet (fontsource's relative `./files/` paths 404'd).

### Fonts
* Zen Kaku Gothic New is requested with Google Fonts `text=`, listing only the Japanese characters on the page. The library embeds every face of a loaded family, and the full sheet meant 242 downloads before the glass appeared. **When adding Japanese text, add its characters to that URL.** To regenerate the list:
  ```
  node -e "const h=require('fs').readFileSync('index.html','utf8');console.log(encodeURIComponent([...new Set(h.match(/[　-ヿ一-鿿＀-￯]/g))].sort().join('')))"
  ```
* Torus is a commercial typeface licensed to ppy for osu!. Self-hosting it is Afterlight's decision (it is also served on hitsound.vivlos.dev).

### Layout and browsers
* `overflow-x: clip` lives on `.site-canvas`, not `body`: Chromium ignores it on `body`, which let the glass backings cause sideways scrolling on phones.
* Afterlight uses **Brave**. Test in Brave (Chromium) as well as Firefox. Headless recipe used here: `puppeteer-core` launching `/run/current-system/sw/bin/brave` with `--use-angle=swiftshader --enable-unsafe-swiftshader`, waiting for `.glass > canvas` to appear twice.

### /s640 (generated page)
* Do not edit `s640/index.html` by hand. Edit `docs/src/*.md` in `Afterlight0338/s640-fw-docs-claude`, then run `python3 tools/build_readme.py` and `python3 tools/build_site_page.py <this repo>/s640` there (python-markdown needed).
* The page loads `/style.css?v=7` (set in `tools/build_site_page.py`): when the main `?v=` is bumped, update it there and rebuild. `s640/s640.css` has its own `?v=`.
* Repository paths in the text link to GitHub; only the two images in `s640/images/` are served from here.
* Two versions on one page: the long one from `README.md` and the short one ("i aint reading allat" switch in the status rail, the main site's `.motion-switch` component) from `docs/short.md`. `#allat` or any `#tldr-…` link opens the short one.
* A disclaimer gate covers the page until "I get it, let me in" is clicked (requested 2026-10-06). Remembered per browser in `localStorage["vivlos-s640-ack"]`; the chosen version in `localStorage["vivlos-s640-view"]`. Without JS there is no gate, the disclaimer shows inline and the long version is shown.
* The page follows the main site's Animations choice (`localStorage["vivlos-motion"]`) for its few hover transitions.

### Writing
* **No em dashes** in site copy or docs (Afterlight's preference). Use commas, colons or parentheses.

