// ============================================================
// DIRECTION D: PROTOTYPE CONTROLLER (dir-d/app.js)
// Real-time Station Telemetry, osu! Audio Engine & Ledger Renderer
// ============================================================

(function () {
  'use strict';

  const DISCORD_USER_ID = "553169854304354304";
  const OSU_USER_ID = "14671577";
  const OSU_DATA_PATH = "../data/osu.json";

  let allScores = [];
  let isScoresExpanded = false;
  let currentAudio = null;
  let currentPlayingSetId = null;

  // ------------------------------------------------------------
  // 1. Live UTC+8 Station Clock
  // ------------------------------------------------------------
  function initClock() {
    const clockEl = document.getElementById('clock-display');
    if (!clockEl) return;

    function update() {
      const now = new Date();
      const utc8 = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (8 * 3600000));
      const pad = (n) => String(n).padStart(2, '0');
      clockEl.textContent = `${pad(utc8.getHours())}:${pad(utc8.getMinutes())}:${pad(utc8.getSeconds())} UTC+8`;
    }

    update();
    setInterval(update, 1000);
  }

  // ------------------------------------------------------------
  // 2. Lanyard Real-Time Discord & Spotify Sync
  // ------------------------------------------------------------
  function initLanyard() {
    const railText = document.getElementById('discord-rail-text');
    const badgeEl = document.getElementById('presence-badge');
    const pipEl = document.getElementById('lanyard-pip');
    const titleEl = document.getElementById('sidecar-activity-title');
    const descEl = document.getElementById('sidecar-activity-desc');
    const spotifyWrap = document.getElementById('sidecar-spotify');
    const spotifyTime = document.getElementById('spotify-time');
    const spotifyFill = document.getElementById('spotify-fill');

    let socket = null;
    let heartbeatInterval = null;
    let spotifyTimer = null;

    function connect() {
      try {
        socket = new WebSocket('wss://api.lanyard.rest/socket');
      } catch (e) {
        console.warn('Lanyard socket init failed:', e);
        return;
      }

      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.op === 1) {
            // Heartbeat ACK
            const interval = data.d.heartbeat_interval;
            heartbeatInterval = setInterval(() => {
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ op: 3 }));
              }
            }, interval);

            // Initialize subscription
            socket.send(JSON.stringify({
              op: 2,
              d: { subscribe_to_id: DISCORD_USER_ID }
            }));
          }

          if (data.op === 0 && (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE')) {
            updatePresence(data.d);
          }
        } catch (err) {
          console.warn('Lanyard message error:', err);
        }
      });

      socket.addEventListener('close', () => {
        clearInterval(heartbeatInterval);
        setTimeout(connect, 6000);
      });
    }

    function updatePresence(d) {
      if (!d) return;

      const status = d.discord_status || 'offline';
      
      // Update rail & badge
      if (railText) railText.textContent = status.toUpperCase();
      if (badgeEl) badgeEl.textContent = status.toUpperCase();

      // Update avatar pip dot
      if (pipEl) {
        pipEl.className = 'avatar-pip-dot ' + status;
      }

      // Spotify priority
      if (d.listening_to_spotify && d.spotify) {
        if (spotifyWrap) spotifyWrap.style.display = 'flex';
        if (titleEl) titleEl.textContent = d.spotify.song || 'Listening to Spotify';
        if (descEl) descEl.textContent = d.spotify.artist || '';

        clearInterval(spotifyTimer);
        spotifyTimer = setInterval(() => {
          const start = d.spotify.timestamps.start;
          const end = d.spotify.timestamps.end;
          const now = Date.now();
          const total = end - start;
          const current = Math.max(0, Math.min(now - start, total));
          const pct = Math.min(100, (current / total) * 100);

          if (spotifyFill) spotifyFill.style.width = pct + '%';
          if (spotifyTime) {
            const pad = (s) => (s < 10 ? '0' : '') + s;
            const cMin = Math.floor(current / 60000);
            const cSec = Math.floor((current % 60000) / 1000);
            const tMin = Math.floor(total / 60000);
            const tSec = Math.floor((total % 60000) / 1000);
            spotifyTime.textContent = `${cMin}:${pad(cSec)} / ${tMin}:${pad(tSec)}`;
          }
        }, 800);
      } else {
        if (spotifyWrap) spotifyWrap.style.display = 'none';
        clearInterval(spotifyTimer);

        // Check games or other activities
        const activities = (d.activities || []).filter(a => a.type !== 4);
        if (activities.length > 0) {
          const act = activities[0];
          if (titleEl) titleEl.textContent = act.name || 'In App';
          if (descEl) descEl.textContent = act.details || act.state || 'Active';
        } else {
          if (titleEl) titleEl.textContent = 'osu! gaming';
          if (descEl) descEl.textContent = 'fuck osu! *plays it*';
        }
      }
    }

    connect();
  }

  // ------------------------------------------------------------
  // 3. Audio Preview Controller (Soft Volume, Clamped)
  // ------------------------------------------------------------
  window.toggleAudioPreview = function (beatmapsetId, btnEl, e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (!beatmapsetId) return;

    const targetId = String(beatmapsetId);

    // If clicking current playing track, toggle pause
    if (currentAudio && currentPlayingSetId === targetId) {
      if (!currentAudio.paused) {
        currentAudio.pause();
        updateAudioButtonIcons(null);
        return;
      } else {
        currentAudio.play().then(() => {
          updateAudioButtonIcons(targetId);
        }).catch(err => console.warn('Audio resume error:', err));
        return;
      }
    }

    // Stop existing audio
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (err) {}
      currentAudio = null;
      currentPlayingSetId = null;
      updateAudioButtonIcons(null);
    }

    // Spawn new audio
    const previewUrl = `https://b.ppy.sh/preview/${targetId}.mp3`;
    const audio = new Audio(previewUrl);
    audio.volume = 0.35; // Soft, comfortable volume

    currentAudio = audio;
    currentPlayingSetId = targetId;

    audio.play().then(() => {
      updateAudioButtonIcons(targetId);
    }).catch(err => {
      console.warn('Audio play failed:', err);
      updateAudioButtonIcons(null);
    });

    audio.addEventListener('ended', () => {
      updateAudioButtonIcons(null);
      currentAudio = null;
      currentPlayingSetId = null;
    });

    audio.addEventListener('pause', () => {
      if (currentPlayingSetId === targetId) {
        updateAudioButtonIcons(null);
      }
    });
  };

  function updateAudioButtonIcons(playingId) {
    const allBtns = document.querySelectorAll('[data-beatmapset-id]');
    allBtns.forEach(btn => {
      const setId = btn.getAttribute('data-beatmapset-id');
      if (playingId && setId === playingId) {
        btn.classList.add('playing');
      } else {
        btn.classList.remove('playing');
      }
    });
  }

  // ------------------------------------------------------------
  // 4. osu! Data Ledger Table Renderer
  // ------------------------------------------------------------
  async function loadOsuData() {
    const tbody = document.getElementById('scores-tbody');
    if (!tbody) return;

    try {
      const res = await fetch(OSU_DATA_PATH);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allScores = data.top_scores || [];
      renderScoreTable();
    } catch (err) {
      console.warn('Failed to load local osu.json:', err);
      // Fallback message
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 18px; color:var(--text-dim); font-family:var(--font-mono);">Failed to load local score dataset.</td></tr>`;
    }
  }

  function renderScoreTable() {
    const tbody = document.getElementById('scores-tbody');
    if (!tbody || allScores.length === 0) return;

    const count = isScoresExpanded ? allScores.length : Math.min(5, allScores.length);
    const displayList = allScores.slice(0, count);

    tbody.innerHTML = displayList.map((s, idx) => {
      const rankNum = s.rank_index || (idx + 1);
      const setId = s.beatmapset_id || '';
      const mapId = s.beatmap_id || '';
      const mapUrl = mapId ? `https://osu.ppy.sh/beatmaps/${mapId}` : '#';
      const mods = (s.mods || []).map(m => `<span class="mod-badge">${m}</span>`).join(' ') || '<span style="color:var(--text-dim); font-family:var(--font-mono); font-size:0.7rem;">NM</span>';
      
      const grade = (s.rank || 'A').toUpperCase();
      const gradeClass = grade.toLowerCase().includes('sh') || grade.toLowerCase().includes('ss') ? 'grade-sh' : 'grade-a';

      const isPlaying = currentPlayingSetId && String(currentPlayingSetId) === String(setId);
      const playingClass = isPlaying ? 'playing' : '';

      return `
        <tr>
          <td class="td-rank">#${rankNum}</td>
          <td>
            <button class="td-audio-btn ${playingClass}" data-beatmapset-id="${setId}" onclick="toggleAudioPreview(${setId}, this, event)" title="Preview Audio">
              <span class="play-symbol">▶</span>
              <span class="pause-symbol">⏸</span>
            </button>
          </td>
          <td>
            <a href="${mapUrl}" target="_blank" rel="noopener" class="td-song-title">${escapeHtml(s.title)}</a>
            <div class="td-song-diff">${escapeHtml(s.artist)} • <span class="diff-name">[${escapeHtml(s.difficulty)}]</span></div>
          </td>
          <td class="td-pp">${parseFloat(s.pp).toFixed(1)} pp</td>
          <td class="td-acc">${parseFloat(s.accuracy).toFixed(2)}%</td>
          <td class="td-combo">${s.max_combo ? s.max_combo + 'x' : '—'}</td>
          <td style="text-align: center;">${mods}</td>
          <td style="text-align: center;"><span class="grade-badge ${gradeClass}">${grade}</span></td>
        </tr>
      `;
    }).join('');
  }

  window.toggleScoreTable = function () {
    isScoresExpanded = !isScoresExpanded;
    renderScoreTable();
    const btn = document.getElementById('expand-scores-btn');
    if (btn) {
      if (isScoresExpanded) {
        btn.innerHTML = `<span>Collapse Ledger (Top 5 Only)</span> <span class="expand-arrow">▲</span>`;
      } else {
        btn.innerHTML = `<span>Show Complete Top 50 Ledger</span> <span class="expand-arrow">▼</span>`;
      }
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ------------------------------------------------------------
  // 5. Toast & Clipboard
  // ------------------------------------------------------------
  window.copyDiscord = function () {
    const handle = "afterlight_hd";
    navigator.clipboard.writeText(handle).then(() => {
      showToast(`Copied Discord handle: @${handle}`);
    }).catch(() => {
      showToast(`Discord: @${handle}`);
    });
  };

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initLanyard();
    loadOsuData();
  });

})();
