# vivlos.dev — Project Specification, Technical Documentation & Decision Ledger

> **Single Source of Truth**: This document records the complete state of `vivlos.dev`, the technical baseline of the original site, the governing design principles, all user decisions, authoring templates, and the exact questions queued for **Afterlight**. Any AI agent (or Afterlight) resuming this project should start by reading this file.

---

## Quick Status Summary (Current State of Deployment)

1. **Live Production Site (`vivlos.dev`)**:
   * Currently wiped clean and running in **Clean Placeholder Mode** ([`index.html`](file:///home/afterlight/Afterlight0338.github.io/index.html)).
   * All copy, descriptions, project titles, and content-specific labels are set to `placeholder` (128 placeholder tokens live).
2. **Visual Prototype (`vivlos.dev/dir-d/` & `vivlos.dev/dir-c/`)**:
   * Working prototype demonstrating **Direction D (Personal Digital World)**: Japanese personal web × technical archive × rhythm game instrumentation.
   * Features: live UTC+8 clock, WebSocket Lanyard presence, interactive osu! audio preview player, and dense scores ledger.
3. **Governing Design Document**:
   * [`DESIGN_CONSTITUTION.md`](file:///home/afterlight/Afterlight0338.github.io/DESIGN_CONSTITUTION.md) (also symlinked as [`AGENTS.md`](file:///home/afterlight/Afterlight0338.github.io/AGENTS.md)). All assistants must strictly adhere to its rules (no generic SaaS, no floating blobs, no glassmorphism, no bubble card enclosures, restrained typography, projects as stories).

---

# Part 1: Technical Documentation of Current Implementation

> **Principle**: Documenting *how* the site currently functions. All items below are **implementation facts**, strictly separated from **content/design decisions**.

### 1. File Structure & Repository Layout
```
/home/afterlight/Afterlight0338.github.io/
├── CNAME                    # Domain routing to vivlos.dev
├── .nojekyll                # Bypasses Jekyll on GitHub Pages (ensures raw static delivery)
├── index.html               # Main root document (wiped clean with placeholders)
├── style.css                # Monolithic production stylesheet (1,267 lines, 26 KB)
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
├── DESIGN_CONSTITUTION.md   # Governing design rules & constraints
├── AGENTS.md                # Symlink to DESIGN_CONSTITUTION.md for automatic agent ingestion
└── SPECIFICATION_INTERVIEW.md # This master document
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
* `user will write`: Content that Afterlight will personally author.
* `undecided`: Not yet determined.
* `removed`: Explicitly discarded.

| Area | Original Site Implementation | Afterlight's Decision / Revision | Status |
| :--- | :--- | :--- | :--- |
| **Site Purpose** | Portfolio + Discord card + osu! widget | **"A place where I be what I want to be and for people to know what kind of person they're dealing with."** | **decided** |
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

> **Purpose**: This table provides a clue/baseline of what existed originally to serve as a side-by-side template while Afterlight writes the replacement text.

| Component / Section | Original Text (Clue / Baseline) | Afterlight's Version (To Be Written) |
| :--- | :--- | :--- |
| **Site Title & Tagline** | `"Afterlight"`<br>`"I build stuff, mess around with techs, play way too many rhythm games, and an Arknights enjoyer."` | `placeholder — user authored` |
| **Bio: Opening Paragraph** | `"Hey, I'm Afterlight. I build shi, mess around with tech, and spend a questionable amount of time playing rhythm games. Most of the things I make starts with 'ts so ass im gonna make one my own', or thinking 'no one made ts yet'"` | `placeholder — user authored` |
| **Bio: System / Linux** | `"I run NixOS with Hyprland as my daily setup, mostly because larp. It also gives me a very convenient excuse to spend hours tweaking things that were already working perfectly fine."` | `placeholder — user authored` |
| **Bio: Vivlos / Lore** | `"The name vivlos.dev comes from Vivlos (ヴィブロス) from Umamusume: Pretty Derby. There's no particularly deep meaning behind it, I like Vivlos, I liked the name, and apparently I liked it enough to call the domain vivlos.dev, and i dont even play Uma."` | `placeholder — user authored` |
| **Hardware & Input Calibration** | *Machine*: Acer Nitro V 15, Ryzen 5 7535HS, RTX 3050 6GB, 32GB DDR5 4800MHz, NixOS 26.05, Hyprland, AOC 24G11ZE 240Hz.<br>*Input*: SayoDevice K05 HE (Rapid Trigger 0.2mm actuation / 0.3mm release), Wacom Bamboo CTH-670 (Area: 67.67 × 39.39 mm, Ratio: 1.718 : 1), Everglide AE68 PRO | `placeholder — user authored` |
| **Rhythm Game Commentary** | `"Scores, stats, and other."`<br>Top 1 Spotlight: Power of the Dragonflame (580.1pp, HDHR, 96.21%) | `placeholder — user authored` |

---

# Part 4: Real Project Catalog from Afterlight's Workspace

> **Context for Project Selection**: These are the actual repositories and projects discovered directly in Afterlight's workspace (`/home/afterlight`):

1. **`veikk-s640-zero-smoothing`** (`/home/afterlight/veikk-s640-zero-smoothing`)
   * *What it is*: Linux kernel-level input driver patch that bypasses internal drawing-tablet smoothing and interpolation filters, achieving raw 1:1 hardware polling for rhythm gaming.
   * *Stack*: C, Linux Kernel / HID, udev rules.
2. **`youtube-music-cli`** (`/home/afterlight/youtube-music-cli`)
   * *What it is*: Terminal UI player for YouTube Music built with React and Ink, controlling headless MPV via Unix domain sockets (IPC) for lightweight background playback with zero browser overhead.
   * *Stack*: TypeScript, React, Ink, MPV, Node.js.
3. **`my-nix-setup`** (`/home/afterlight/my-nix-setup`)
   * *What it is*: Fully declarative daily-driver configuration: NixOS, Hyprland Wayland compositor rules, custom udev permissions for magnetic switches, Wacom active area clamping, and audio routing.
   * *Stack*: Nix, Hyprland, Wayland, Bash.
4. **`ry5088-flasher`** (`/home/afterlight/ry5088-flasher`)
   * *What it is*: Lightweight flashing utility for custom rhythm keypad microcontrollers over serial, bypassing proprietary vendor software.
   * *Stack*: Rust, USB Serial, Embedded.
5. **`choicer-online`** (`/home/afterlight/choicer-online`)
   * *What it is*: Deployed online interactive decision-making tool.
   * *Stack*: Web / JavaScript.
6. **`osu-skins` / `osu-skins-repo`** (`/home/afterlight/osu-skins-repo`)
   * *What it is*: Curated collection and archive of competitive rhythm game skins.
7. **`osu-winello`** (`/home/afterlight/osu-winello`)
   * *What it is*: Wine environment wrapper and audio latency optimizer for running osu! on Linux.
8. **`hitsound-studio`** (`/home/afterlight/hitsound-studio`)
   * *What it is*: Audio hitsound editing and testing tool for beatmap creation.
9. **`vivlos.dev`** (`/home/afterlight/Afterlight0338.github.io`)
   * *What it is*: This website—pure static frontend, Cloudflare Worker proxy, and Lanyard real-time WebSocket bridge.

---

# Part 5: Progressive Interview Queue (Ready for Afterlight)

When Afterlight returns, these are the exact questions to answer:

### Question 2.1: Defining the Perspective Tabs (Option 3)
In Option 3, visitors switch views without page reloads. Which tab grouping feels right?
* **Option A (4 Dedicated Perspectives)**:
  1. `[Overview]` (Identity, Bio, Live Discord/Status, High-level summary)
  2. `[Projects]` (Your featured software, tools, and deployed sites)
  3. `[Workstation]` (NixOS configuration, machine specs, input calibration)
  4. `[Rhythm]` (osu! player stats, Top 1 spotlight, Top 50 scores, audio previews)
* **Option B (3 Focused Perspectives)**:
  1. `[Profile & System]` (Bio + NixOS + Hardware specs in one technical dossier)
  2. `[Projects]` (Dedicated software archive)
  3. `[Rhythm & Audio]` (osu! telemetry & beatmap audio lounge)
* **Option C**: Your own custom tab naming and grouping.

### Question 2.2: Your Featured Project Lineup
From the project catalog in Part 4 (or any other projects you have):
* **Which 3 to 5 projects do you want featured?**
* **For each project, do you want a short summary or a full story (problem → hack → outcome)?**

### Question 2.3: Default View & Persistent Elements
1. **Which perspective tab should be open by default when someone first loads `vivlos.dev`?**
2. **Should the live telemetry bar (UTC+8 clock, NixOS status, Discord presence) stay permanently pinned at the top across all tabs?**

---

# Part 6: Next Steps for Implementation

Once Afterlight answers the questions in Part 5:
1. Lock in the tab architecture in `SPECIFICATION_INTERVIEW.md`.
2. Construct the **Option 3 Tab Component System** in [`dir-d/`](file:///home/afterlight/Afterlight0338.github.io/dir-d/) (or directly in a prototype branch).
3. Insert Afterlight's newly authored copy into the corresponding sections as they provide it.
4. Verify responsiveness, keyboard navigation, and audio preview playback.
5. Deploy to production once Afterlight gives final approval.
