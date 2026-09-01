// ===== VIVLOS.DEV - STYLE 2 APP SCRIPT =====
document.addEventListener('DOMContentLoaded', () => {
  const outfitButtons = document.querySelectorAll('.outfit-pill-btn');
  const mainArtImg = document.getElementById('vivlos-art-image');

  const outfits = {
    racing: '../assets/vivlos/racing.webp',
    stage: '../assets/vivlos/stage.webp',
    summer: '../assets/vivlos/summer.webp',
    casual: '../assets/vivlos/casual.webp'
  };

  outfitButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const outfitKey = btn.dataset.outfit;
      if (!outfits[outfitKey] || !mainArtImg) return;

      outfitButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      mainArtImg.style.opacity = '0';
      setTimeout(() => {
        mainArtImg.src = outfits[outfitKey];
        mainArtImg.style.opacity = '1';
      }, 150);
    });
  });

  window.copyDiscordTag = function () {
    const tag = "afterlight_hd";
    navigator.clipboard.writeText(tag).then(() => {
      alert(`Copied Discord: ${tag}`);
    });
  };
});
