# vivlos.dev — Technical Specification & User Decision Record

This document establishes the technical baseline of the current site, tracks all architectural and content decisions made by **Afterlight**, and provides the authoring templates for the new site.

---

# Part 1: Technical Documentation of Current Implementation

> **Principle**: Documenting *how* the site currently functions. All items below are **implementation facts**, strictly separated from **content/design decisions**.

### 1. File Structure & Repository Layout
```
/home/afterlight/Afterlight0338.github.io/
├── CNAME                    # Domain routing to vivlos.dev
├── .nojekyll                # Bypasses Jekyll on GitHub Pages
├── index.html               # Main single-page document (currently in clean placeholder state)
├── style.css                # Monolithic stylesheet (1,267 lines, 26 KB)
├── assets/
│   └── vivlos/              # WebP character art: casual.webp, racing.webp, stage.webp, summer.webp
├── data/
│   └── osu.json             # Static dataset: user profile + 50 top plays (912 lines, 27 KB)
├── js/
│   ├── vivlos.js            # Live UTC+8 clock + clipboard copy toast (36 lines)
│   ├── lanyard.js           # Discord WebSocket + Spotify progress loop (215 lines)
│   ├── osu.js               # osu! API proxy fetcher, cache, audio engine, score renderer (380 lines)
│   ├── app.js               # [Orphaned/Legacy] Splash screen controller from /roxy
│   ├── canvas.js            # [Orphaned/Legacy] Particle canvas from /roxy
│   └── tilt.js              # [Orphaned/Legacy] 3D mouse tilt from /roxy
├── worker/
│   ├── osu-worker.js        # Cloudflare Worker proxy for osu! API v2 OAuth token exchange
│   └── wrangler.toml        # Worker config (account binding: osu-api-proxy)
├── roxy/                    # [Archived] Previous site version (particle canvas, 3D tilt)
├── site-1/                  # [Archived] Staging prototype graduated to root in commit 2203d57
├── dir-c/ & dir-d/          # [Isolated Prototype] Direction D visual prototype
├── stripped/                # Stripped placeholder revision
└── SPECIFICATION_INTERVIEW.md # This document
```

### 2. HTML Architecture
* **Layout Model**: A 2-column desktop grid wrapped in `.app-container` (`max-width: 1320px`, `grid-template-columns: 340px 1fr`, `gap: 36px`):
  * **Left Column (`<aside class="left-stage">`)**: Sticky column (`top: 40px`, `height: fit-content`). Contains `.profile-meta-card`, avatar container, title group, domain pill, tagline, Lanyard presence card, jump navigation list, social icon button row, and UTC+8 live clock.
  * **Right Column (`<main class="right-feed">`)**: Vertical stack of 4 `.unified-section-card` containers with `gap: 32px`, followed by `<footer class="site-footer">`.
* **Section Card Anatomy**: Every section shares an identical HTML wrapper:
  * `.card-header-flex`: Header flexbox containing `.card-title-group` (mono index label, `<h2>` main title, `.card-subtext`) and `.section-character-art` (`<img>` width 140, height 185).
  * Card body: Section-specific markup (paragraphs, list rows, split spec grid, or score ledger).

### 3. CSS Architecture & Design Tokens
* **Preprocessors / Frameworks**: Zero. Hand-authored vanilla CSS with CSS Custom Properties.
* **Token Palette Declared in `:root`**:
  * Surfaces: `--bg-main: #060911`, `--bg-surface: #0b101c`, `--bg-card: rgba(14, 21, 37, 0.65)`, `--bg-card-hover: rgba(20, 30, 52, 0.85)`.
  * Borders: `--border-subtle: rgba(255, 255, 255, 0.08)`, `--border-focus: rgba(6, 182, 212, 0.4)`, `--border-gold: rgba(251, 191, 36, 0.35)`.
  * Accents: `--accent-cyan: #06b6d4`, `--accent-cyan-light: #38bdf8`, `--accent-cyan-glow: rgba(6, 182, 212, 0.12)`, `--accent-gold: #fbbf24`, `--accent-gold-glow: rgba(251, 191, 36, 0.12)`, `--accent-emerald: #10b981`, `--accent-rose: #f43f5e`, `--accent-violet: #a78bfa`.
  * Text: `--text-primary: #f8fafc`, `--text-secondary: #94a3b8`, `--text-muted: #64748b`.
  * Fonts: `--font-sans: 'Zen Kaku Gothic New', ...`, `--font-mono: 'Maple Mono', ...`.
* **Geometry Rules**:
  * Section cards: `border-radius: 20px`, `padding: 28px 32px`, `box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.6)`.
  * Sub-cards / list rows: `border-radius: 12px–14px`.
  * Body background: Dual fixed radial gradient ellipses (`rgba(6, 182, 212, 0.07)` and `rgba(251, 191, 36, 0.04)`).

### 4. JavaScript Modules & Runtime
* **Script Loading**: All scripts use `defer` at the bottom of `<body>`:
  1. `js/vivlos.js`:
     * Updates `#live-clock-text` every 1,000ms calculating UTC+8 from local date offset.
     * `window.copyDiscordTag()` copies `"afterlight_hd"` via `navigator.clipboard.writeText` and displays `#toast-box` for 2,500ms.
  2. `js/lanyard.js`:
     * Opens WebSocket connection to `wss://api.lanyard.rest/socket`.
     * Subscribes to Discord User ID `553169854304354304`.
     * Handles op 1 (heartbeat intervals), op 0 (`INIT_STATE` / `PRESENCE_UPDATE`).
     * Dynamically alters status dot (`online`, `idle`, `dnd`, `offline`), custom status emoji/text, game activity title/subtitle, and device badges (`💻`, `📱`, `🌐`).
     * Runs Spotify progress interval tracking `timestamps.start` / `timestamps.end` with live width percent and elapsed minute:second counter.
  3. `js/osu.js`:
     * Targets osu! User ID `14671577`.
     * Caching mechanism: Checks `sessionStorage.getItem("osu_profile_cache_v5")` with TTL of 5 minutes (`CACHE_TTL_MS = 300,000`).
     * Multi-stage fetch with timeout:
       1. Primary live endpoint: `https://osu-api-proxy.mfarrishahk.workers.dev/api/osu?user=14671577` (4s timeout).
       2. Fallback static endpoint: `data/osu.json` (3s timeout).
       3. Merges live profile statistics (rank, PP, accuracy, play count) with fallback `top_scores` array if live proxy only returned user profile.
     * Dynamic DOM rendering:
       * Populates user bar, level pill, country rank, and 4 metric tiles.
       * Populates Top 1 Spotlight banner with cover backdrop and audio button.
       * Renders Top 5 score card items (expandable to 50 items via `window.toggleScoresExpand()`).
     * Audio Preview Engine:
       * `window.toggleAudioPreview(beatmapsetId, btnEl, e)` manages a single HTML5 `new Audio("https://b.ppy.sh/preview/{setId}.mp3")`.
       * Volume is clamped to `0.18` (soft, comfortable level).
       * Toggles `.playing` CSS class across all buttons sharing the active `beatmapsetId`.
       * Resets state on audio `ended` or manual pause.

---

# Part 2: Decision Record & Comparison Ledger

Status Legend:
* `decided`: Explicitly chosen and confirmed by Afterlight.
* `user will write`: Content that Afterlight will personally write.
* `undecided`: Not yet determined.
* `removed`: Explicitly discarded.

| Area | Original Site Implementation | Afterlight's Decision / Revision | Status |
| :--- | :--- | :--- | :--- |
| **Site Purpose** | Portfolio + Discord card + osu! widget | "A place where I be what I want to be and for people to know what kind of person they're dealing with." | **decided** |
| **Page Architecture** | 1 continuous scrolling page with 4 cards | **Option 3: Single-View Perspective Tabs** (Switch perspectives without full page reloads) | **decided** |
| **Content Scope** | Bio, Repos, Specs, osu!, Vivlos, Discord | **Keep everything** ("Honestly speaking there's nothing I would remove") | **decided** |
| **Bio & Statements** | 3 casual paragraphs ("I build shi...", NixOS larp, Vivlos) | User will re-write based on current baseline | **user will write** |
| **Featured Projects** | 4 simple link rows with 1 generic sentence | Projects with deployed sites, latest work, and top projects (User will select & write) | **user will decide & write** |
| **System & Hardware** | 2-column key-value tables | Keep hardware and calibration telemetry (User will re-write/verify details) | **user will write** |
| **osu! / Rhythm Section**| Live stats grid, Top 1 banner, Top 5 expandable list | Keep stats, Top 50 scores, and audio preview player | **decided** |
| **Lanyard Discord Sync** | Live status, game activity, Spotify progress bar | Keep real-time presence | **decided** |
| **Vivlos Mascot & Lore** | 4 character cutouts in card headers | Keep lore & aesthetic connection (User will re-write/refine commentary) | **user will write** |
| **Visual Containerization**| 4 identical rounded mega-cards | To be redesigned around Option 3 Perspective Tabs adhering to Constitution | **undecided** |

---

# Part 3: Authoring Clues & Work-in-Progress Ledger (Original | Afterlight's Version)

> **Purpose**: This table provides a clue/baseline of what currently exists alongside a dedicated space for Afterlight to provide the exact new text.

| Component / Section | Original Text (Clue / Baseline) | Afterlight's Version (To Be Written) |
| :--- | :--- | :--- |
| **Site Title / Tagline** | `"Afterlight"`<br>`"I build stuff, mess around with techs, play way too many rhythm games, and an Arknights enjoyer."` | `placeholder — user authored` |
| **Bio: Opening Paragraph** | `"Hey, I'm Afterlight. I build shi, mess around with tech, and spend a questionable amount of time playing rhythm games. Most of the things I make starts with 'ts so ass im gonna make one my own', or thinking 'no one made ts yet'"` | `placeholder — user authored` |
| **Bio: System / Linux** | `"I run NixOS with Hyprland as my daily setup, mostly because larp. It also gives me a very convenient excuse to spend hours tweaking things that were already working perfectly fine."` | `placeholder — user authored` |
| **Bio: Vivlos / Domain Lore**| `"The name vivlos.dev comes from Vivlos (ヴィブロス) from Umamusume: Pretty Derby. There's no particularly deep meaning behind it, I like Vivlos, I liked the name, and apparently I liked it enough to call the domain vivlos.dev, and i dont even play Uma."` | `placeholder — user authored` |
| **Featured Project 1** | *Original*: `my-nix-setup`<br>*Desc*: `"My NixOS configuration, including the Hyprland setup, tablet configuration, hardware rules, and the other bits that make my system mine."` | `placeholder — user authored` |
| **Featured Project 2** | *Original*: `osu-skins`<br>*Desc*: `"A collection of osu! skins I use or have collected, mostly an answer to 'skin name?'."` | `placeholder — user authored` |
| **Featured Project 3** | *Original*: `roxy-fastfetch`<br>*Desc*: `"My Fastfetch setup with custom ASCII layouts and hardware information for showing off what is currently running under the hood. Its kinda broken tho so /shrug"` | `placeholder — user authored` |
| **Featured Project 4** | *Original*: `vivlos.dev`<br>*Desc*: `"The source code for this website. Includes the frontend, Lanyard integration, Cloudflare Worker bits, and the styling used across the site."` | `placeholder — user authored` |
| **Additional Candidates from Workspace** | 1. `veikk-s640-zero-smoothing` (Kernel tablet smoothing driver patch)<br>2. `youtube-music-cli` (React + Ink terminal UI player with MPV)<br>3. `ry5088-flasher` (Microcontroller firmware flasher)<br>4. `osu-winello` (Wine wrapper for osu!)<br>5. `choicer-online` (Deployed decision maker site) | `placeholder — user authored` |
| **Hardware & Input Commentary** | *Current table*: Host laptop, Ryzen 5 7535HS, RTX 3050, NixOS 26.05, AOC 240Hz, SayoDevice K05 HE (Rapid Trigger 0.2/0.3mm), Wacom Bamboo CTH-670 (Area: 67.67 × 39.39 mm), Everglide AE68 PRO | `placeholder — user authored` |
| **Rhythm Game Commentary** | *Current text*: `"Scores, stats, and other."`<br>Top 1 Spotlight: Power of the Dragonflame (580.1pp) | `placeholder — user authored` |

---

# Part 4: Progressive Interview — Round 2: Perspective Tabs & Project Roster

Now that we have established **Option 3 (Single-View Perspective Tabs)** and agreed to retain all major areas, let's nail down how the tabs should be structured and which projects will be featured:

### Question 2.1: Defining the Perspective Tabs
In Option 3, visitors switch perspectives without full-page reloads. Which tabs should exist on the site?
* **Option A**: 4 Tabs:
  1. `[Overview / Profile]` (Identity, Bio, Live Status, Quick Highlights)
  2. `[Engineering / Projects]` (Deployed sites, latest work, top projects with stories)
  3. `[Workstation / Specs]` (NixOS, Hyprland, SayoDevice rapid trigger, Wacom area)
  4. `[Rhythm / Audio Lounge]` (osu! player profile, Top 1 banner, Top 50 scores, audio previews)
* **Option B**: 3 Tabs:
  1. `[Identity & Workstation]` (Bio, NixOS setup, hardware calibration, Lanyard)
  2. `[Projects & Archive]` (All featured software and experiments)
  3. `[Rhythm & Audio]` (osu! stats, scores ledger, audio preview player)
* **Option C**: Your own custom tab naming and grouping.
* **Your decision**: *Which tab structure do you want?*

---

### Question 2.2: The Project Roster
You mentioned: *"Featured project is project where i actually deployed a site for it, my latest thing, and my top projects. ill decide that."*

Looking across your workspace and GitHub, here are the real candidates:
1. **Projects with deployed sites**:
   * `choicer-online` (Deployed online web app)
   * `vivlos.dev` (This personal website)
   * `osu-skins` (osu! skins web repo)
2. **Latest / Top engineering work**:
   * `veikk-s640-zero-smoothing` (Linux tablet driver patch removing internal smoothing latency)
   * `youtube-music-cli` (React + Ink TUI terminal music player with MPV IPC)
   * `my-nix-setup` (Declarative NixOS + Hyprland daily configuration)
   * `ry5088-flasher` (Microcontroller firmware flasher)
   * `osu-winello` (Wine wrapper for osu!)
   * `hitsound-studio` (Audio hitsound tool)

* **Which 3–5 projects from this list (or any others) do you want to feature?**
* **For each chosen project, do you want to write a short paragraph or a full story (problem → hack → outcome)?**

---

### Question 2.3: Tab Interaction & Default View
When someone loads `vivlos.dev`:
* **Which tab should be open by default?** (e.g. `[Overview / Profile]`?)
* **Should the live telemetry bar (UTC+8 clock, NixOS status, Discord presence) stay permanently visible across all tabs?**
