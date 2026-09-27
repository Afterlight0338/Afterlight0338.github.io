// vivlos.dev — Direction D prototype
// Tabs, UTC+8 clock, Lanyard presence, osu! stats + scores, audio previews.

(function () {
  'use strict';

  const DISCORD_USER_ID = "553169854304354304";
  const OSU_PROXY = "https://osu-api-proxy.mfarrishahk.workers.dev/api/osu?user=14671577";
  const OSU_DATA_PATH = "../data/osu.json";
  const DEFAULT_TAB = "about";

  let allScores = [];
  let isScoresExpanded = false;
  let currentAudio = null;
  let currentPlayingSetId = null;

  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------
  // Perspective tabs: one section visible, URL hash keeps it linkable
  // ------------------------------------------------------------
  function initTabs() {
    const sections = document.querySelectorAll('.archive-section');
    const links = document.querySelectorAll('#archive-nav a');

    function show(id) {
      if (!$(id) || !$(id).classList.contains('archive-section')) id = DEFAULT_TAB;
      sections.forEach(s => { s.hidden = s.id !== id; });
      links.forEach(a => {
        if (a.hash === '#' + id) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    }

    $('archive-nav').addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault(); // no scroll jump to the section
      history.pushState(null, '', a.hash);
      show(a.hash.slice(1));
    });
    window.addEventListener('popstate', () => show(location.hash.slice(1)));
    show(location.hash.slice(1));
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
  // osu! — live stats from the Worker proxy, scores from osu.json
  // ------------------------------------------------------------
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

    let local = null;
    try {
      const res = await fetch(OSU_DATA_PATH);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      local = await res.json();
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

  function renderScoreTable() {
    const tbody = $('scores-tbody');
    if (allScores.length === 0) return;

    const list = isScoresExpanded ? allScores : allScores.slice(0, 5);

    tbody.innerHTML = list.map((s, idx) => {
      const rankNum = s.rank_index || (idx + 1);
      const setId = Number(s.beatmapset_id) || 0;
      const mapUrl = s.beatmap_id ? `https://osu.ppy.sh/beatmaps/${Number(s.beatmap_id)}` : '#';
      const mods = (s.mods || []).map(escapeHtml).join(' ') || 'NM';
      // osu! API grades: XH/X = SS, SH/S = S; the H variants are silver (HD/FL)
      const grade = escapeHtml({ XH: 'SS', X: 'SS', SH: 'S' }[s.rank] || s.rank || '');
      const silver = s.rank === 'XH' || s.rank === 'SH' ? 'grade-silver' : '';
      const playing = currentPlayingSetId === String(setId);

      return `
        <tr${rankNum === 1 ? ' class="top-play"' : ''}>
          <td class="td-rank">${rankNum}</td>
          <td>
            <button type="button" class="td-audio-btn${playing ? ' playing' : ''}" data-beatmapset-id="${setId}"
              onclick="toggleAudioPreview(${setId})" aria-pressed="${playing}" aria-label="Preview ${escapeHtml(s.title)}">
              <span class="play-symbol" aria-hidden="true">▶</span><span class="pause-symbol" aria-hidden="true">❚❚</span>
            </button>
          </td>
          <td>
            <a href="${mapUrl}" target="_blank" rel="noopener" class="td-song-title">${escapeHtml(s.title)}</a>
            <div class="td-song-diff">${escapeHtml(s.artist)} · [${escapeHtml(s.difficulty)}]</div>
          </td>
          <td class="num td-pp">${Number(s.pp).toFixed(0)}</td>
          <td class="num td-dim">${Number(s.accuracy).toFixed(2)}%</td>
          <td class="num td-dim td-combo">${s.max_combo ? Number(s.max_combo).toLocaleString('en-US') + 'x' : '—'}</td>
          <td class="td-mods">${mods}</td>
          <td class="td-grade ${silver}">${grade}</td>
        </tr>`;
    }).join('');
  }

  window.toggleScoreTable = function () {
    isScoresExpanded = !isScoresExpanded;
    renderScoreTable();
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
    initTabs();
    initClock();
    initLanyard();
    loadOsuData();
  });
})();
