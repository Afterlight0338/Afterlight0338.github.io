// ===== VIVLOS.DEV - STYLE 1 APP SCRIPT =====
document.addEventListener('DOMContentLoaded', () => {
  // 1. Vivlos Outfit Switcher
  const outfitButtons = document.querySelectorAll('.outfit-btn');
  const mainArtImg = document.getElementById('vivlos-art-image');
  const outfitLabel = document.getElementById('current-outfit-label');

  const outfits = {
    racing: {
      src: '../assets/vivlos/racing.webp',
      name: 'Racing Silks (Dubai Turf)'
    },
    stage: {
      src: '../assets/vivlos/stage.webp',
      name: 'Stage / Live Performance'
    },
    summer: {
      src: '../assets/vivlos/summer.webp',
      name: 'Summer / Resort'
    },
    casual: {
      src: '../assets/vivlos/casual.webp',
      name: 'Casual / School'
    }
  };

  outfitButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const outfitKey = btn.dataset.outfit;
      if (!outfits[outfitKey] || !mainArtImg) return;

      // Update button state
      outfitButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Cross-fade image
      mainArtImg.style.opacity = '0';
      mainArtImg.style.transform = 'scale(0.96)';

      setTimeout(() => {
        mainArtImg.src = outfits[outfitKey].src;
        if (outfitLabel) outfitLabel.innerText = outfits[outfitKey].name;
        mainArtImg.style.opacity = '1';
        mainArtImg.style.transform = 'scale(1)';
      }, 150);
    });
  });

  // 2. Live UTC+8 Clock
  const clockEl = document.getElementById('live-clock-text');
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    // UTC+8
    const utc8 = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (8 * 3600000));
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(utc8.getHours())}:${pad(utc8.getMinutes())}:${pad(utc8.getSeconds())} UTC+8`;
    clockEl.innerText = timeStr;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 3. Discord Tag Copy To Clipboard
  window.copyDiscordTag = function () {
    const tag = "afterlight_hd";
    navigator.clipboard.writeText(tag).then(() => {
      showToast(`Copied Discord: ${tag}`);
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
