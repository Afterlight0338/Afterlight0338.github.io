// ===== VIVLOS.DEV - STYLE 3 APP SCRIPT =====
document.addEventListener('DOMContentLoaded', () => {
  // Tab Switcher
  const tabButtons = document.querySelectorAll('.tab-nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Outfit Switcher
  const outfitButtons = document.querySelectorAll('.deck-outfit-pill');
  const mainArtImg = document.getElementById('deck-art-img');

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
});
