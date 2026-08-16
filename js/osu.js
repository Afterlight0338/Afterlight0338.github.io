// ===== LIVE OSU! API PROFILE INTEGRATION =====
(function initOsu() {
  const OSU_USER_ID = "14671577";
  const DEFAULT_USERNAME = "RyoYamada";
  const CACHE_KEY = "osu_profile_cache_v1";
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  // Primary live endpoint and static data fallback
  const PRIMARY_ENDPOINT = window.OSU_API_ENDPOINT || `https://osu-api-proxy.mfarrishahk.workers.dev/api/osu?user=${OSU_USER_ID}`;
  const FALLBACK_ENDPOINT = "data/osu.json";

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
