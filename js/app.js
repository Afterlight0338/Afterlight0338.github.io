// ===== CORE APPLICATION CONTROLLER =====

// 1. Splash Screen & Card Entrance Stagger
(function initSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const cards = Array.from(document.querySelectorAll('.bento-card'));

  function dismissSplash() {
    splash.classList.add('hide');
    cards.forEach((card, i) => {
      setTimeout(() => {
        card.classList.add('visible');
      }, i * 60);
    });
    setTimeout(() => {
      splash.style.display = 'none';
    }, 650);
  }

  setTimeout(dismissSplash, 1600);
  splash.addEventListener('click', dismissSplash);
})();

// 2. Live UTC+8 Clock
function updateClock() {
  const now = new Date();
  const options = { timeZone: 'Asia/Shanghai', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const timeStr = now.toLocaleTimeString('en-US', options);
  const clockEl = document.getElementById('live-clock');
  if (clockEl) clockEl.innerText = timeStr + ' UTC+8';
}
setInterval(updateClock, 1000);
updateClock();

// 3. Toast Notifications
window.showToast = function (msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
};

// 4. Discord Tag Clipboard Copy
window.copyDiscord = function () {
  const discordTag = 'afterlight_hd';
  navigator.clipboard.writeText(discordTag).then(() => {
    window.showToast('Copied Discord tag: ' + discordTag);
  }).catch(() => {
    prompt('Copy Discord tag:', discordTag);
  });
};

