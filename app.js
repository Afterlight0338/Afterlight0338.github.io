// vivlos.dev, Direction D prototype
// Tabs, motion switch, glass (liquidglass), UTC+8 clock, Lanyard presence,
// osu! stats + scores, audio previews.

(function () {
  'use strict';

  const DISCORD_USER_ID = "553169854304354304";
  const OSU_PROXY = "https://osu-api-proxy.mfarrishahk.workers.dev/api/osu?user=14671577";
  const OSU_DATA_PATH = "/data/osu.json";
  // Pinned: npm versions are immutable, so this can't change under us
  const LIQUIDGLASS_URL = "https://cdn.jsdelivr.net/npm/@ybouane/liquidglass@1.0.3/dist/index.js";

  const TABS = ['about', 'projects', 'workstation', 'rhythm', 'lore'];
  const DEFAULT_TAB = 'about';
  // Which Vivlos outfit stands behind the Discord card on each tab
  const ART = { about: 'summer', projects: 'racing', workstation: 'casual', rhythm: 'stage', lore: 'summer' };

  const glass = { masthead: null, nav: null };

  let allScores = [];
  let isScoresExpanded = false;
  let currentAudio = null;
  let currentPlayingSetId = null;

  const $ = (id) => document.getElementById(id);
  const motionOn = () => document.documentElement.dataset.motion === 'on';

  // ------------------------------------------------------------
  // Animations switch, defaults to the OS reduced-motion setting,
  // an explicit choice is remembered per browser
  // ------------------------------------------------------------
  function initMotionSwitch() {
    const btn = $('motion-switch');
    let saved = null;
    try { saved = localStorage.getItem('vivlos-motion'); } catch (e) { /* storage blocked */ }
    const initial = saved ? saved === 'on' : !matchMedia('(prefers-reduced-motion: reduce)').matches;

    const apply = (on) => {
      document.documentElement.dataset.motion = on ? 'on' : 'off';
      btn.setAttribute('aria-checked', String(on));
    };
    apply(initial);

    btn.addEventListener('click', () => {
      const on = !motionOn();
      apply(on);
      try { localStorage.setItem('vivlos-motion', on ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
    });
  }

  // ------------------------------------------------------------
  // Perspective tabs: one section visible, URL hash keeps it linkable
  // ------------------------------------------------------------
  function initTabs() {
    const sections = document.querySelectorAll('.archive-section');
    const links = Array.from(document.querySelectorAll('#archive-nav .nav-tab'));
    const lens = $('tab-lens');
    let current = null;

    function placeLens(link, how) {
      if (how === 'instant') lens.style.transition = 'none';
      lens.style.width = link.offsetWidth + 'px';
      lens.style.height = link.offsetHeight + 'px';
      lens.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
      keepGlassFresh('nav', lens, how === 'animate' ? 650 : 0);
      if (how === 'instant') {
        void lens.offsetWidth; // commit before re-enabling the transition
        lens.style.transition = '';
      } else if (how === 'animate') {
        // Liquid squish while it travels (scale composes with the transform)
        lens.animate(
          [{ scale: '1 1' }, { scale: '1.14 0.86', offset: 0.35 }, { scale: '1 1' }],
          { duration: 550, easing: 'ease-out' }
        );
      }
    }

    function show(id, initial) {
      if (!TABS.includes(id)) id = DEFAULT_TAB;
      if (id === current) return;
      const animate = !initial && motionOn();
      const dir = current ? Math.sign(TABS.indexOf(id) - TABS.indexOf(current)) : 0;
      current = id;

      document.documentElement.dataset.tab = id;
      sections.forEach(s => { s.hidden = s.id !== id; });
      const link = links.find(a => a.hash === '#' + id);
      links.forEach(a => {
        if (a === link) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });

      placeLens(link, initial ? 'instant' : animate ? 'animate' : 'plain');
      swapArt(ART[id], animate);
      if (animate) enter($(id), dir);
    }

    $('archive-nav').addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault(); // no scroll jump to the section
      history.pushState(null, '', a.hash);
      show(a.hash.slice(1));
    });
    window.addEventListener('popstate', () => show(location.hash.slice(1)));
    window.addEventListener('resize', () => {
      const link = links.find(a => a.hasAttribute('aria-current'));
      if (link) placeLens(link, 'instant');
    });
    show(location.hash.slice(1), true);
  }

  // Stagger the new tab's blocks in from the direction of travel
  const RISE_ITEMS = ':scope > h2, .narrative-prose > *, .data-pair, .project-entry, .spec-table, ' +
    '.rhythm-profile-strip, .table-container, .lore-narrative, .editorial-plate';

  function enter(section, dir) {
    const items = section.querySelectorAll(RISE_ITEMS);
    section.style.setProperty('--dx', dir * 24 + 'px');
    items.forEach((el, i) => {
      el.classList.remove('rise');
      el.style.setProperty('--i', Math.min(i, 10));
    });
    void section.offsetWidth; // restart the animation if re-entering quickly
    items.forEach(el => el.classList.add('rise'));
    clearTimeout(section._riseTimer);
    section._riseTimer = setTimeout(() => items.forEach(el => el.classList.remove('rise')), 1100);
  }

  // ------------------------------------------------------------
  // Vivlos outfit swap: she drops behind the card and pops back up.
  // The clip moves with her so she never shows below the masthead.
  // ------------------------------------------------------------
  let artSeq = 0;

  // liquidglass only re-renders when something is marked dirty, it never
  // notices CSS/WAAPI motion by itself, so mark the mover every frame
  function keepGlassFresh(which, el, ms) {
    const end = performance.now() + ms;
    (function tick() {
      if (glass[which]) glass[which].markChanged(el);
      if (performance.now() < end) requestAnimationFrame(tick);
    })();
  }

  async function swapArt(name, animate) {
    const img = $('vivlos-art');
    const src = `/assets/vivlos/${name}.webp`;
    if (img.getAttribute('src') === src) return;
    const seq = ++artSeq;

    if (!animate) {
      img.getAnimations().forEach(a => a.cancel());
      img.src = src;
      await img.decode().catch(() => {});
      if (glass.masthead) glass.masthead.markChanged();
      return;
    }

    const sink = parseFloat(getComputedStyle(img).getPropertyValue('--art-sink')) || 0;
    const drop = img.offsetHeight - sink;
    const home = { transform: 'translateY(0)', clipPath: `inset(0 0 ${sink}px 0)` };
    const down = { transform: `translateY(${drop}px)`, clipPath: `inset(0 0 ${sink + drop}px 0)` };

    keepGlassFresh('masthead', img, 300);
    // Already mid-swap (fast clicking): skip the exit, just change outfit
    if (img.getAnimations().length === 0) {
      await img.animate([home, down], { duration: 220, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' })
        .finished.catch(() => {});
    }
    if (seq !== artSeq) return;
    img.src = src;
    await img.decode().catch(() => {});
    if (seq !== artSeq) return;
    img.getAnimations().forEach(a => a.cancel());
    keepGlassFresh('masthead', img, 700);
    img.animate([down, home], { duration: 620, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
  }

  function preloadArt() {
    new Set(Object.values(ART)).forEach(name => { new Image().src = `/assets/vivlos/${name}.webp`; });
  }

  // ------------------------------------------------------------
  // Liquid glass (WebGL). Loaded last; the CSS glass stays if it fails.
  // ------------------------------------------------------------
  // fresnel/specular are off on purpose: the shader paints them as white from
  // fixed virtual lights (one below the element) and a "fake" environment
  // reflection, on a dark page that reads as a grey shelf reflecting nothing.
  // Keep only what's really behind the glass, plus the thin top-lit rim.
  const PRESENCE_GLASS = {
    cornerRadius: 14, zRadius: 14, blurAmount: 0.35, refraction: 0.55,
    chromAberration: 0.05, edgeHighlight: 0.12, specular: 0, fresnel: 0,
    brightness: -0.22, saturation: 0.25, shadowOpacity: 0.4, shadowSpread: 14, shadowOffsetY: 4,
  };
  const LENS_GLASS = {
    cornerRadius: 12, zRadius: 9, blurAmount: 0, refraction: 0.45,
    chromAberration: 0, edgeHighlight: 0.2, specular: 0, fresnel: 0, // any aberration splits the 3px tab bar into the wrong colour
    brightness: 0.06, saturation: 0.3, shadowOpacity: 0.3, shadowSpread: 8, shadowOffsetY: 2,
  };

  function webglAvailable() {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext(); // don't hold one of the ~16 context slots
    return true;
  }

  async function startGlass(LiquidGlass, root, el, config) {
    el.dataset.config = JSON.stringify(config);
    root.classList.add('lg-on'); // drop the CSS fallback before capture
    try {
      return await LiquidGlass.init({ root, glassElements: [el] });
    } catch (err) {
      root.classList.remove('lg-on');
      console.warn('liquidglass failed, keeping CSS glass:', err);
      return null;
    }
  }

  async function initGlass() {
    if (matchMedia('(prefers-reduced-transparency: reduce)').matches) return;
    if (!webglAvailable()) return;
    await document.fonts.ready; // captured labels need the real fonts

    let LiquidGlass;
    try {
      ({ LiquidGlass } = await import(LIQUIDGLASS_URL));
    } catch (err) {
      console.warn('liquidglass unavailable, keeping CSS glass:', err);
      return;
    }
    [glass.masthead, glass.nav] = await Promise.all([
      startGlass(LiquidGlass, $('masthead'), $('lanyard-panel'), PRESENCE_GLASS),
      startGlass(LiquidGlass, $('archive-nav'), $('tab-lens'), LENS_GLASS),
    ]);
  }

  // ------------------------------------------------------------
  // UTC+8 clock
  // ------------------------------------------------------------
  function initClock() {
    const el = $('clock-display');
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const update = () => { el.textContent = fmt.format(new Date()); };
    update();
    setInterval(update, 1000);
  }

  // ------------------------------------------------------------
  // Lanyard (Discord + Spotify)
  // ------------------------------------------------------------
  function initLanyard() {
    const statusText = $('presence-text');
    const pip = $('lanyard-pip');
    const titleEl = $('sidecar-activity-title');
    const descEl = $('sidecar-activity-desc');
    const spotifyWrap = $('sidecar-spotify');
    const spotifyTime = $('spotify-time');
    const spotifyFill = $('spotify-fill');

    let heartbeat = null;
    let spotifyTimer = null;

    const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, '0')}`;

    function connect() {
      let socket;
      try {
        socket = new WebSocket('wss://api.lanyard.rest/socket');
      } catch (e) {
        return;
      }

      socket.addEventListener('message', (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch (e) { return; }

        if (data.op === 1) {
          heartbeat = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ op: 3 }));
          }, data.d.heartbeat_interval);
          socket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
        }

        if (data.op === 0 && (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE')) {
          updatePresence(data.d);
        }
      });

      socket.addEventListener('close', () => {
        clearInterval(heartbeat);
        setTimeout(connect, 6000);
      });
    }

    function updatePresence(d) {
      if (!d) return;
      const status = d.discord_status || 'offline';
      statusText.textContent = status === 'dnd' ? 'do not disturb' : status;
      pip.className = 'status-dot ' + status;

      clearInterval(spotifyTimer);

      if (d.listening_to_spotify && d.spotify) {
        spotifyWrap.hidden = false;
        titleEl.textContent = d.spotify.song || 'Listening to Spotify';
        descEl.textContent = d.spotify.artist || '';

        const { start, end } = d.spotify.timestamps;
        const tick = () => {
          const total = end - start;
          const current = Math.max(0, Math.min(Date.now() - start, total));
          spotifyFill.style.width = (current / total * 100) + '%';
          spotifyTime.textContent = `${mmss(current)} / ${mmss(total)}`;
        };
        tick();
        spotifyTimer = setInterval(tick, 1000);
        return;
      }

      spotifyWrap.hidden = true;
      const act = (d.activities || []).find(a => a.type !== 4); // 4 = custom status
      const custom = (d.activities || []).find(a => a.type === 4);
      if (act) {
        titleEl.textContent = act.name || 'In an app';
        descEl.textContent = act.details || act.state || '';
      } else {
        titleEl.textContent = '@afterlight_hd';
        descEl.textContent = (custom && custom.state) || (status === 'offline' ? 'Not around right now' : 'Not doing anything in particular');
      }
    }

    connect();
  }

  // ------------------------------------------------------------
  // Audio previews (one track at a time)
  // ------------------------------------------------------------
  window.toggleAudioPreview = function (beatmapsetId) {
    if (!beatmapsetId) return;
    const targetId = String(beatmapsetId);

    if (currentAudio && currentPlayingSetId === targetId) {
      if (currentAudio.paused) currentAudio.play().then(() => markPlaying(targetId)).catch(() => {});
      else { currentAudio.pause(); markPlaying(null); }
      return;
    }

    if (currentAudio) currentAudio.pause();

    const audio = new Audio(`https://b.ppy.sh/preview/${targetId}.mp3`);
    audio.volume = 0.35;
    currentAudio = audio;
    currentPlayingSetId = targetId;

    audio.play().then(() => markPlaying(targetId)).catch(() => markPlaying(null));
    audio.addEventListener('ended', () => {
      markPlaying(null);
      currentAudio = null;
      currentPlayingSetId = null;
    });
  };

  function markPlaying(playingId) {
    document.querySelectorAll('[data-beatmapset-id]').forEach(btn => {
      const on = playingId !== null && btn.dataset.beatmapsetId === playingId;
      btn.classList.toggle('playing', on);
      btn.setAttribute('aria-pressed', on);
    });
  }

  // ------------------------------------------------------------
  // osu!, live stats from the Worker proxy, scores from osu.json
  // ------------------------------------------------------------
  // osu!lazer ModType: difficulty increase / reduction / automation
  const MOD_TYPE = {
    HD: 'inc', HR: 'inc', DT: 'inc', NC: 'inc', FL: 'inc', SD: 'inc', PF: 'inc',
    EZ: 'red', NF: 'red', HT: 'red', RX: 'auto', AP: 'auto', SO: 'auto',
  };
  // osu! API grade → [shown as, colour class]; H = silver (HD/FL) variants
  const GRADE = {
    XH: ['SS', 'ss'], X: ['SS', 'ss'], SH: ['S', 's'], S: ['S', 's'],
    A: ['A', 'a'], B: ['B', 'b'], C: ['C', 'c'], D: ['D', 'd'],
  };

  function renderStats(p) {
    if (!p) return;
    const n = (v) => Number(v).toLocaleString('en-US');
    if (p.global_rank) $('osu-rank').textContent = '#' + n(p.global_rank);
    if (p.country_rank) $('osu-country').textContent = '#' + n(p.country_rank);
    if (p.pp) $('osu-pp').textContent = n(Math.round(p.pp));
    if (p.hit_accuracy) $('osu-acc').textContent = Number(p.hit_accuracy).toFixed(2) + '%';
    if (p.play_count) $('osu-plays').textContent = n(p.play_count);
    if (p.level) $('osu-level').textContent = 'Lv ' + p.level;
  }

  async function loadOsuData() {
    const tbody = $('scores-tbody');

    try {
      const res = await fetch(OSU_DATA_PATH);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const local = await res.json();
      allScores = local.top_scores || [];
      renderStats(local); // snapshot first, live numbers overwrite below
      renderScoreTable();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-msg">Couldn't load scores.</td></tr>`;
    }

    try {
      const res = await fetch(OSU_PROXY, { signal: AbortSignal.timeout(4000) });
      const json = await res.json();
      if (json.success) renderStats(json.data);
    } catch (err) {
      // proxy down: keep the osu.json snapshot
    }
  }

  // riseFrom: rows at or after this index animate in (used on expand)
  function renderScoreTable(riseFrom) {
    const tbody = $('scores-tbody');
    if (allScores.length === 0) return;

    const list = isScoresExpanded ? allScores : allScores.slice(0, 5);
    const rise = riseFrom !== undefined && motionOn();

    tbody.innerHTML = list.map((s, idx) => {
      const rankNum = s.rank_index || (idx + 1);
      const setId = Number(s.beatmapset_id) || 0;
      const mapUrl = s.beatmap_id ? `https://osu.ppy.sh/beatmaps/${Number(s.beatmap_id)}` : '#';
      const mods = (s.mods || [])
        .map(m => `<span class="mod-${MOD_TYPE[m] || 'other'}">${escapeHtml(m)}</span>`).join(' ') || 'NM';
      const [gradeText, gradeClass] = GRADE[s.rank] || [escapeHtml(s.rank || ''), 'd'];
      const playing = currentPlayingSetId === String(setId);

      const classes = [rankNum === 1 && 'top-play', rise && idx >= riseFrom && 'rise'].filter(Boolean).join(' ');
      const riseStyle = rise && idx >= riseFrom ? ` style="--i:${Math.min(idx - riseFrom, 20) * 0.5}"` : '';

      return `
        <tr${classes ? ` class="${classes}"` : ''}${riseStyle}>
          <td class="td-rank">${rankNum}</td>
          <td>
            <button type="button" class="td-audio-btn${playing ? ' playing' : ''}" data-beatmapset-id="${setId}"
              onclick="toggleAudioPreview(${setId})" aria-pressed="${playing}" aria-label="Preview ${escapeHtml(s.title)}">
              <span class="play-symbol" aria-hidden="true">▶</span><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
            </button>
          </td>
          <td>
            <a href="${mapUrl}" target="_blank" rel="noopener" class="td-song-title">${escapeHtml(s.title)}</a>
            <div class="td-song-diff">${escapeHtml(s.artist)} · [${escapeHtml(s.difficulty)}]</div>
          </td>
          <td class="num td-pp">${Number(s.pp).toFixed(0)}</td>
          <td class="num td-dim">${Number(s.accuracy).toFixed(2)}%</td>
          <td class="num td-dim td-combo">${s.max_combo ? Number(s.max_combo).toLocaleString('en-US') + 'x' : ''}</td>
          <td class="td-mods">${mods}</td>
          <td class="td-grade grade-${gradeClass}">${gradeText}</td>
        </tr>`;
    }).join('');
  }

  window.toggleScoreTable = function () {
    isScoresExpanded = !isScoresExpanded;
    renderScoreTable(isScoresExpanded ? 5 : undefined);
    const btn = $('expand-scores-btn');
    btn.textContent = isScoresExpanded ? 'Show top 5 only' : `Show all ${allScores.length}`;
    btn.setAttribute('aria-expanded', isScoresExpanded);
  };

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ------------------------------------------------------------
  // Clipboard + toast
  // ------------------------------------------------------------
  window.copyDiscord = function () {
    const handle = "afterlight_hd";
    navigator.clipboard.writeText(handle)
      .then(() => showToast(`Copied @${handle}`))
      .catch(() => showToast(`Discord: @${handle}`));
  };

  function showToast(msg) {
    const toast = $('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMotionSwitch();
    initTabs();
    initClock();
    initLanyard();
    loadOsuData();
  });

  // Glass and the other outfits wait until the page itself has loaded
  window.addEventListener('load', () => {
    preloadArt();
    initGlass();
  });
})();

