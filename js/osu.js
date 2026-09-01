// ===== LIVE OSU! API PROFILE & TOP PLAYS INTEGRATION =====
(function initOsu() {
  const OSU_USER_ID = "14671577";
  const CACHE_KEY = "osu_profile_cache_v3";
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  // Primary live endpoint and static fallback
  const PRIMARY_ENDPOINT = window.OSU_API_ENDPOINT || `https://osu-api-proxy.mfarrishahk.workers.dev/api/osu?user=${OSU_USER_ID}`;
  const FALLBACK_ENDPOINT = window.OSU_FALLBACK_ENDPOINT || (window.location.pathname.includes('/site-') ? '../data/osu.json' : 'data/osu.json');

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

  function renderModPills(mods) {
    if (!mods) return '<span class="mod-pill mod-nm">NM</span>';
    const modArr = Array.isArray(mods) ? mods : String(mods).split(',').map(m => m.trim());
    if (modArr.length === 0 || (modArr.length === 1 && modArr[0] === '')) {
      return '<span class="mod-pill mod-nm">NM</span>';
    }
    return modArr.map(m => {
      const lower = m.toLowerCase();
      let cls = 'mod-nm';
      if (lower === 'hd') cls = 'mod-hd';
      else if (lower === 'hr') cls = 'mod-hr';
      else if (lower === 'dt' || lower === 'nc') cls = 'mod-dt';
      else if (lower === 'fl') cls = 'mod-fl';
      return `<span class="mod-pill ${cls}">${m}</span>`;
    }).join(' ');
  }

  function getGradeBadge(grade) {
    const g = String(grade || 'A').toUpperCase();
    let cls = 'grade-a';
    if (g === 'XH' || g === 'SS') cls = 'grade-ss';
    else if (g === 'SH') cls = 'grade-sh';
    else if (g === 'S') cls = 'grade-s';
    else if (g === 'A') cls = 'grade-a';
    else if (g === 'B') cls = 'grade-b';
    return `<span class="osu-grade-badge ${cls}">${g}</span>`;
  }

  function renderTop1(top1) {
    if (!top1) return;
    const linkEl = document.getElementById('osu-top1-link');
    const titleEl = document.getElementById('osu-top1-title');
    const artistEl = document.getElementById('osu-top1-artist');
    const ppEl = document.getElementById('osu-top1-pp');
    const accEl = document.getElementById('osu-top1-acc');
    const comboEl = document.getElementById('osu-top1-combo');
    const modsWrap = document.getElementById('osu-top1-mods-wrap');
    const rankWrap = document.getElementById('osu-top1-rank-wrap');

    if (linkEl) {
      linkEl.href = `https://osu.ppy.sh/beatmaps/${top1.beatmap_id}`;
      if (top1.cover_url) {
        linkEl.style.backgroundImage = `linear-gradient(180deg, rgba(6, 12, 28, 0.78) 0%, rgba(6, 12, 28, 0.94) 100%), url('${top1.cover_url}')`;
      }
    }
    if (titleEl) titleEl.innerText = top1.title;
    if (artistEl) artistEl.innerHTML = `${top1.artist} • <span class="score-diff-highlight">[${top1.difficulty}]</span>`;
    if (ppEl) ppEl.innerText = `${top1.pp} pp`;
    if (accEl) accEl.innerText = `${top1.accuracy}%`;
    if (comboEl && top1.max_combo) comboEl.innerText = `${formatNumber(top1.max_combo)}x`;
    if (modsWrap) modsWrap.innerHTML = renderModPills(top1.mods || top1.mod_str);
    if (rankWrap) rankWrap.innerHTML = getGradeBadge(top1.rank);
  }

  function renderTop5List(scores) {
    if (!scores || !Array.isArray(scores) || scores.length === 0) return;
    const container = document.getElementById('osu-top5-items');
    if (!container) return;

    const rankBadges = ['gold', 'silver', 'bronze', '', ''];
    container.innerHTML = scores.map((s, idx) => {
      const badgeClass = rankBadges[idx] || '';
      const comboText = s.max_combo ? `${formatNumber(s.max_combo)}x max combo` : '';
      const modsHtml = renderModPills(s.mods || s.mod_str);
      const gradeHtml = getGradeBadge(s.rank);

      return `
        <a class="osu-score-row-item" href="https://osu.ppy.sh/beatmaps/${s.beatmap_id}" target="_blank" rel="noopener">
          <span class="score-rank-badge ${badgeClass}">#${s.rank_index || idx + 1}</span>
          <div class="score-detail-text">
            <span class="score-title-text">${s.title}</span>
            <span class="score-diff-text">${s.artist} • <span class="score-diff-highlight">[${s.difficulty}]</span></span>
          </div>
          <div class="score-metric-text">
            <span class="score-pp-val">${s.pp} pp</span>
            <div class="score-tags-row">
              <span class="score-acc-text">${s.accuracy}%</span>
              ${comboText ? `<span class="score-combo-text">(${comboText})</span>` : ''}
              ${modsHtml}
              ${gradeHtml}
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  function updateOsuUI(data, isLive = true) {
    if (!data) return;

    const rankEl = document.getElementById('osu-global-rank');
    const countryRankSubEl = document.getElementById('osu-country-rank-sub');
    const ppEl = document.getElementById('osu-pp');
    const accEl = document.getElementById('osu-acc');
    const playsEl = document.getElementById('osu-plays');
    const levelPill = document.getElementById('osu-level-pill');
    const usernameEl = document.getElementById('osu-username-display');
    const liveTag = document.getElementById('osu-live-tag');
    const flagEl = document.getElementById('osu-country-flag');
    const avatarImg = document.getElementById('osu-avatar-img');

    if (rankEl && data.global_rank) {
      rankEl.innerText = formatRank(data.global_rank);
    }
    if (countryRankSubEl && data.country_rank) {
      countryRankSubEl.innerText = `#${formatNumber(data.country_rank)} ${data.country_code || 'MY'}`;
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
    if (levelPill && data.level) {
      levelPill.innerText = `Lv. ${data.level}`;
    }
    if (usernameEl && data.username) {
      usernameEl.innerText = data.username;
    }
    if (avatarImg && data.avatar_url) {
      avatarImg.src = data.avatar_url;
    }

    if (flagEl && data.country_code) {
      flagEl.innerText = `🇲🇾 ${data.country_code.toUpperCase()} #${data.country_rank || 146}`;
      flagEl.style.display = 'inline-flex';
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
