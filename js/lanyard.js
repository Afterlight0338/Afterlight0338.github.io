// ===== REAL-TIME DISCORD PRESENCE VIA LANYARD =====
(function () {
  const DISCORD_USER_ID = "553169854304354304";
  let lanyardSocket = null;
  let heartbeatInterval = null;
  let spotifyInterval = null;

  function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  function formatElapsed(startTimeMs) {
    const diffSec = Math.floor((Date.now() - startTimeMs) / 1000);
    const hrs = Math.floor(diffSec / 3600);
    const min = Math.floor((diffSec % 3600) / 60);
    const sec = diffSec % 60;
    if (hrs > 0) {
      return `${hrs}:${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec} elapsed`;
    }
    return `${min}:${sec < 10 ? '0' : ''}${sec} elapsed`;
  }

  function updatePresenceUI(d) {
    if (!d) return;

    const statusBadge = document.getElementById('discord-status-badge');
    const statusText = document.getElementById('discord-status-text');
    const avatarPip = document.getElementById('avatar-pip');
    const deviceBadges = document.getElementById('device-badges');
    const customStatusEl = document.getElementById('discord-custom-status');
    const customStatusVal = document.getElementById('custom-status-val');
    const customEmoji = document.getElementById('custom-emoji');

    const activityType = document.getElementById('activity-type');
    const activityName = document.getElementById('activity-name');
    const activityState = document.getElementById('activity-state');
    const activityTime = document.getElementById('activity-time');
    const activityIcon = document.getElementById('activity-icon');
    const spotifyWrap = document.getElementById('spotify-progress-wrap');
    const spotifyFill = document.getElementById('spotify-fill');
    const spotifyCur = document.getElementById('spotify-cur');
    const spotifyTot = document.getElementById('spotify-tot');

    const rawStatus = d.discord_status || 'offline';
    
    // Update status badge & pip
    if (statusBadge) statusBadge.className = 'status-badge ' + rawStatus;
    if (avatarPip) avatarPip.className = 'avatar-status-pip ' + rawStatus;

    const statusLabels = {
      online: 'Online in Sanctuary',
      idle: 'Idle / AFK',
      dnd: 'Do Not Disturb',
      offline: 'Offline in Sanctuary'
    };
    if (statusText) statusText.innerText = statusLabels[rawStatus] || 'Water Holy Class';

    // Device Badges
    let devicesHTML = '';
    if (d.active_on_discord_desktop) devicesHTML += '<span title="Desktop App">💻</span>';
    if (d.active_on_discord_mobile) devicesHTML += '<span title="Mobile App">📱</span>';
    if (d.active_on_discord_web) devicesHTML += '<span title="Web Client">🌐</span>';
    if (deviceBadges) deviceBadges.innerHTML = devicesHTML || '<span title="Sanctuary">🌊</span>';

    // Custom Status
    if (d.activities && d.activities.length > 0) {
      const custom = d.activities.find(a => a.type === 4);
      if (custom && custom.state && customStatusEl) {
        customStatusEl.style.display = 'flex';
        if (customStatusVal) customStatusVal.innerText = custom.state;
        if (customEmoji) customEmoji.innerText = custom.emoji ? (custom.emoji.name || '💬') : '💬';
      } else if (customStatusEl) {
        customStatusEl.style.display = 'none';
      }
    } else if (customStatusEl) {
      customStatusEl.style.display = 'none';
    }

    // Clear previous timers
    if (spotifyInterval) { clearInterval(spotifyInterval); spotifyInterval = null; }

    // Check Spotify
    if (d.listening_to_spotify && d.spotify && activityType) {
      const s = d.spotify;
      activityType.innerText = 'LISTENING TO SPOTIFY';
      if (activityName) activityName.innerText = s.song;
      if (activityState) activityState.innerText = `by ${s.artist}`;
      if (activityTime) activityTime.innerText = s.album;
      if (activityIcon) activityIcon.src = s.album_art_url || 'roxy-ff.png';
      if (spotifyWrap) spotifyWrap.style.display = 'flex';

      function updateSpotifyProgress() {
        const now = Date.now();
        const start = s.timestamps.start;
        const end = s.timestamps.end;
        const current = Math.min(Math.max(now - start, 0), end - start);
        const percent = ((current / (end - start)) * 100).toFixed(1);
        
        if (spotifyFill) spotifyFill.style.width = percent + '%';
        if (spotifyCur) spotifyCur.innerText = formatDuration(current);
        if (spotifyTot) spotifyTot.innerText = formatDuration(end - start);
      }
      updateSpotifyProgress();
      spotifyInterval = setInterval(updateSpotifyProgress, 1000);
      return;
    }

    // Check Game / Rich Presence Activity
    const gameActivity = d.activities && d.activities.find(a => a.type === 0 || a.type === 1 || a.type === 2);
    if (gameActivity && activityType) {
      if (spotifyWrap) spotifyWrap.style.display = 'none';
      activityType.innerText = gameActivity.type === 1 ? 'STREAMING' : 'PLAYING GAME';
      if (activityName) activityName.innerText = gameActivity.name;
      if (activityState) activityState.innerText = gameActivity.details || gameActivity.state || 'In Session';
      
      if (gameActivity.timestamps && gameActivity.timestamps.start && activityTime) {
        activityTime.innerText = formatElapsed(gameActivity.timestamps.start);
      } else if (activityTime) {
        activityTime.innerText = 'Active on NixOS';
      }

      if (gameActivity.assets && gameActivity.assets.large_image && activityIcon) {
        if (gameActivity.assets.large_image.startsWith('mp:external/')) {
          activityIcon.src = `https://media.discordapp.net/external/${gameActivity.assets.large_image.replace('mp:external/', '')}`;
        } else {
          activityIcon.src = `https://cdn.discordapp.com/app-assets/${gameActivity.application_id}/${gameActivity.assets.large_image}.png`;
        }
      } else if (activityIcon) {
        activityIcon.src = 'roxy-ff.png';
      }
      return;
    }

    // Fallback: Idle / Sanctuary Default
    if (spotifyWrap) spotifyWrap.style.display = 'none';
    if (activityType) activityType.innerText = 'SANCTUARY STATUS';
    if (activityName) activityName.innerText = rawStatus === 'offline' ? 'Resting in Sanctuary' : 'Exploring NixOS & Roxy Arts';
    if (activityState) activityState.innerText = 'Water Holy Class Mage';
    if (activityTime) activityTime.innerText = 'Live • NixOS 26.05';
    if (activityIcon) activityIcon.src = 'roxy-ff.png';
  }

  function initLanyardREST() {
    fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          updatePresenceUI(res.data);
        }
      })
      .catch(err => console.log('Lanyard REST error:', err));
  }

  function initLanyardWS() {
    try {
      lanyardSocket = new WebSocket('wss://api.lanyard.rest/socket');

      lanyardSocket.onopen = function () {
        const note = document.getElementById('lanyard-status-note');
        const dot = document.getElementById('lanyard-ping-dot');
        if (note) note.innerText = 'Lanyard Gateway: Connected';
        if (dot) dot.style.background = 'var(--accent-emerald)';
      };

      lanyardSocket.onmessage = function (event) {
        const msg = JSON.parse(event.data);
        
        // Hello event (OP 1) -> Start heartbeat & subscribe
        if (msg.op === 1) {
          const interval = msg.d.heartbeat_interval;
          heartbeatInterval = setInterval(() => {
            if (lanyardSocket && lanyardSocket.readyState === WebSocket.OPEN) {
              lanyardSocket.send(JSON.stringify({ op: 3 }));
            }
          }, interval);

          // Send OP 2: Initialize
          lanyardSocket.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: DISCORD_USER_ID }
          }));
        }

        // Event Dispatch (OP 0)
        if (msg.op === 0) {
          if (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') {
            updatePresenceUI(msg.d);
          }
        }
      };

      lanyardSocket.onclose = function () {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        const note = document.getElementById('lanyard-status-note');
        const dot = document.getElementById('lanyard-ping-dot');
        if (note) note.innerText = 'Lanyard Gateway: Reconnecting...';
        if (dot) dot.style.background = 'var(--accent-amber)';
        setTimeout(initLanyardWS, 5000);
      };

      lanyardSocket.onerror = function () {
        if (lanyardSocket) lanyardSocket.close();
      };
    } catch (e) {
      console.log('WebSocket not supported or failed', e);
    }
  }

  initLanyardREST();
  initLanyardWS();
})();
