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

// 5. Mobile View Detection & Desktop Mode Prompt Controller
function initMobileDetection() {
  function getModal() { return document.getElementById('desktop-prompt-modal'); }
  function getPill() { return document.getElementById('mobile-switch-pill'); }

  function isMobileEnvironment() {
    const isSmallViewport = window.innerWidth < 768;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isSmallViewport || (isMobileUA && window.innerWidth < 960);
  }

  function checkPrompt() {
    const modal = getModal();
    const pill = getPill();
    if (!modal) return;

    if (isMobileEnvironment()) {
      const isDismissed = sessionStorage.getItem('dismissed_desktop_prompt') === 'true';
      if (!isDismissed) {
        setTimeout(() => {
          modal.style.display = 'flex';
          setTimeout(() => modal.classList.add('show'), 30);
        }, 1500);
      } else if (pill) {
        pill.style.display = 'flex';
      }
    } else {
      modal.classList.remove('show');
      setTimeout(() => modal.style.display = 'none', 350);
      if (pill) pill.style.display = 'none';
    }
  }

  window.dismissDesktopPrompt = function () {
    const modal = getModal();
    const pill = getPill();
    sessionStorage.setItem('dismissed_desktop_prompt', 'true');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
        if (isMobileEnvironment() && pill) {
          pill.style.display = 'flex';
        }
      }, 350);
    }
    if (window.showToast) window.showToast('Viewing on Mobile • Tip: Request Desktop Site for 240Hz layout');
  };

  window.reopenDesktopPrompt = function () {
    const modal = getModal();
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('show'), 30);
    }
  };

  window.toggleDesktopGuide = function () {
    const guide = document.getElementById('desktop-guide-box');
    if (!guide) return;
    if (guide.style.display === 'none') {
      guide.style.display = 'flex';
    } else {
      guide.style.display = 'none';
    }
  };

  window.addEventListener('resize', checkPrompt);
  window.addEventListener('orientationchange', checkPrompt);
  checkPrompt();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileDetection);
} else {
  initMobileDetection();
}

