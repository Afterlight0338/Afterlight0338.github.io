// ===== VIVLOS.DEV - STYLE 1 SCRIPT =====
document.addEventListener('DOMContentLoaded', () => {
  // 1. Live UTC+8 Clock
  const clockEl = document.getElementById('live-clock-text');
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const utc8 = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (8 * 3600000));
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(utc8.getHours())}:${pad(utc8.getMinutes())}:${pad(utc8.getSeconds())} UTC+8`;
    clockEl.innerText = timeStr;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 2. Discord Tag Clipboard Copy
  window.copyDiscordTag = function () {
    const tag = "afterlight_hd";
    navigator.clipboard.writeText(tag).then(() => {
      showToast(`Copied Discord tag: ${tag}`);
    }).catch(() => {
      showToast(`Discord: ${tag}`);
    });
  };

  function showToast(msg) {
    let toast = document.getElementById('toast-box');
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 2500);
  }
});
