// ===== LIVE OSU! API PROFILE & TOP PLAYS INTEGRATION =====
(function initOsu() {
  const OSU_USER_ID = "14671577";
  const DEFAULT_USERNAME = "RyoYamada";
  const CACHE_KEY = "osu_profile_cache_v2";
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  // Primary live endpoint and static data fallback
  const PRIMARY_ENDPOINT = window.OSU_API_ENDPOINT || `https://osu-api-proxy.mfarrishahk.workers.dev/api/osu?user=${OSU_USER_ID}`;
  const FALLBACK_ENDPOINT = "data/osu.json";

  // Global tab switcher for UI buttons
  window.switchOsuTab = function(tabName) {
    const viewTop1 = document.getElementById('osu-view-top1');
    const viewTop5 = document.getElementById('osu-view-top5');
    const btnTop1 = document.getElementById('osu-tab-top1');
    const btnTop5 = document.getElementById('osu-tab-top5');

    if (tabName === 'top1') {
      if (viewTop1) viewTop1.style.display = 'block';
      if (viewTop5) viewTop5.style.display = 'none';
      if (btnTop1) btnTop1.classList.add('active');
      if (btnTop5) btnTop5.classList.remove('active');
    } else if (tabName === 'top5') {
      if (viewTop1) viewTop1.style.display = 'none';
      if (viewTop5) viewTop5.style.display = 'block';
      if (btnTop1) btnTop1.classList.remove('active');
      if (btnTop5) btnTop5.classList.add('active');
    }
  };

  function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return "--";
    return Number(num).toLocaleString();
  }

  function formatRank(rank) {
    if (!rank || isNaN(rank)) return "--";
    return `#${formatNumber(rank)}`;
  }

  function formatPP(pp) {
    if (pp === null || pp === undefined || isNaN(pp)) return "-- pp";
    return `${formatNumber(Math.round(pp))} pp`;
  }

  function formatAcc(acc) {
    if (acc === null || acc === undefined || isNaN(acc)) return "--%";
    return `${Number(acc).toFixed(2)}%`;
  }

  function renderTop1(top1) {
    if (!top1) return;
    const linkEl = document.getElementById('osu-top1-link');
    const titleEl = document.getElementById('osu-top1-title');
    const artistEl = document.getElementById('osu-top1-artist');
    const ppEl = document.getElementById('osu-top1-pp');
    const accEl = document.getElementById('osu-top1-acc');
    const modsEl = document.getElementById('osu-top1-mods');
    const rankEl = document.getElementById('osu-top1-rank');

    if (linkEl) {
      linkEl.href = `https://osu.ppy.sh/beatmaps/${top1.beatmap_id}`;
      if (top1.cover_url) {
        linkEl.style.backgroundImage = `linear-gradient(180deg, rgba(6, 12, 28, 0.75) 0%, rgba(6, 12, 28, 0.95) 100%), url('${top1.cover_url}')`;
      }
    }
    if (titleEl) titleEl.innerText = top1.title;
    if (artistEl) artistEl.innerText = `${top1.artist} • ${top1.difficulty}`;
    if (ppEl) ppEl.innerText = `${top1.pp} pp`;
    if (accEl) accEl.innerText = `${top1.accuracy}%`;
    if (modsEl) modsEl.innerText = top1.mod_str || 'NM';
    if (rankEl) {
      rankEl.innerText = top1.rank || 'A';
      rankEl.className = `osu-pill-rank rank-${String(top1.rank || 'a').toLowerCase()}`;
    }
  }

  function renderTop5List(scores) {
    if (!scores || !Array.isArray(scores) || scores.length === 0) return;
    const container = document.getElementById('osu-top5-items');
    if (!container) return;

    const rankClasses = ['gold', 'silver', 'bronze', '', ''];
    container.innerHTML = scores.map((s, idx) => {
      const rankClass = rankClasses[idx] || '';
      return `
        <a class="osu-score-row" href="https://osu.ppy.sh/beatmaps/${s.beatmap_id}" target="_blank" rel="noopener">
          <span class="osu-score-rank-num ${rankClass}">#${s.rank_index || idx + 1}</span>
          <div class="osu-score-info">
            <span class="osu-score-title">${s.title}</span>
            <span class="osu-score-diff">${s.difficulty} • ${s.artist}</span>
          </div>
          <div class="osu-score-metrics">
            <span class="osu-score-pp">${s.pp} pp</span>
            <div class="osu-score-sub">
              <span class="osu-score-acc">${s.accuracy}%</span>
              <span class="osu-score-mods">${s.mod_str || 'NM'}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  function updateOsuUI(data, isLive = true) {
    if (!data) return;

    const rankEl = document.getElementById('osu-global-rank');
    const ppEl = document.getElementById('osu-pp');
    const accEl = document.getElementById('osu-acc');
    const playsEl = document.getElementById('osu-plays');
    const usernameEl = document.getElementById('osu-username-display');
    const liveTag = document.getElementById('osu-live-tag');
    const flagEl = document.getElementById('osu-country-flag');

    if (rankEl && data.global_rank) {
      rankEl.innerText = formatRank(data.global_rank);
      rankEl.title = data.country_rank ? `Country Rank: #${formatNumber(data.country_rank)}` : '';
    }
    if (ppEl && (data.pp !== undefined)) {
      ppEl.innerText = formatPP(data.pp);
    }
    if (accEl && (data.hit_accuracy !== undefined)) {
      accEl.innerText = formatAcc(data.hit_accuracy);
    }
    if (playsEl && data.play_count) {
      playsEl.innerText = formatNumber(data.play_count);
    }
    if (usernameEl && data.username) {
      usernameEl.innerText = data.username;
    }

    if (flagEl && data.country_code) {
      flagEl.innerText = data.country_code.toUpperCase();
      flagEl.style.display = 'inline-flex';
      flagEl.title = data.country_name || data.country_code;
    }

    if (liveTag) {
      liveTag.innerText = isLive ? 'STD • LIVE' : 'STD';
      liveTag.style.color = isLive ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    // Render Top Plays
    if (data.top_scores && data.top_scores.length > 0) {
      renderTop1(data.top_scores[0]);
      renderTop5List(data.top_scores);
    }
  }

  function getCachedProfile() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        return parsed.data;
      }
    } catch (e) {
      console.log('osu! cache read error:', e);
    }
    return null;
  }

  function setCachedProfile(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {
      console.log('osu! cache save error:', e);
    }
  }

  async function fetchWithTimeout(url, ms = 4000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(id);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  async function fetchOsuProfile() {
    // 1. Instant Cache Check
    const cached = getCachedProfile();
    if (cached) {
      updateOsuUI(cached, true);
      return;
    }

    // 2. Try primary live proxy
    try {
      const json = await fetchWithTimeout(PRIMARY_ENDPOINT, 4000);
      const profile = (json && json.data) ? json.data : json;
      if (profile && (profile.global_rank || profile.pp)) {
        setCachedProfile(profile);
        updateOsuUI(profile, true);
        return;
      }
    } catch (primaryErr) {
      console.log('Primary live proxy notice:', primaryErr.message || primaryErr);
    }

    // 3. Fallback to synced data/osu.json
    try {
      const fallbackData = await fetchWithTimeout(FALLBACK_ENDPOINT, 3000);
      if (fallbackData && (fallbackData.global_rank || fallbackData.pp)) {
        setCachedProfile(fallbackData);
        updateOsuUI(fallbackData, true);
      }
    } catch (fallbackErr) {
      console.log('Fallback data notice:', fallbackErr.message || fallbackErr);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchOsuProfile);
  } else {
    fetchOsuProfile();
  }
})();
