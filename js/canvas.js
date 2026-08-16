// ===== WATER MANA & EXPANDING RIPPLE CANVAS SYSTEM =====
(function () {
  const canvas = document.getElementById('net');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w, h, particles = [], ripples = [];

  const PALETTE = ['56, 189, 248', '96, 165, 250', '167, 139, 250', '125, 211, 252', '37, 99, 235'];

  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticles() {
    const count = Math.max(30, Math.min(Math.round((w * h) / 14000), 75));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -(Math.random() * 0.45 + 0.15),
        r: Math.random() * 2.2 + 1.1,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        pulse: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.035 + 0.015
      });
    }
  }

  function addRipple(x, y, maxRadius = 45, customColor = '56, 189, 248') {
    if (ripples.length > 20) ripples.shift();
    ripples.push({
      x: x,
      y: y,
      r: 4,
      maxR: maxRadius,
      alpha: 0.85,
      color: customColor
    });
  }

  window.castWaterSurge = function () {
    if (window.showToast) window.showToast('💧 Cast: [Water Holy Magic] Mana Surge!');
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 3 + 2,
        color: '56, 189, 248',
        pulse: 0,
        wobbleSpeed: 0.05
      });
    }
    addRipple(cx, cy, 140, '56, 189, 248');
  };

  window.castCumulonimbus = function () {
    if (window.showToast) window.showToast('❄️ Cast: [Water Holy Class] Cumulonimbus!');
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * w,
        y: -10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 5 + 3,
        r: Math.random() * 2.5 + 1.5,
        color: '167, 139, 250',
        pulse: 0,
        wobbleSpeed: 0.08
      });
    }
  };

  function stepCanvas() {
    ctx.clearRect(0, 0, w, h);

    // Particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.pulse += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.pulse) * 0.3;
      p.y += p.vy;

      if (p.y < -20) {
        p.y = h + 20;
        p.x = Math.random() * w;
      }
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;

      const currentRadius = p.r + Math.sin(p.pulse) * 0.4;

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.6, currentRadius), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, 0.75)`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgba(${p.color}, 0.8)`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, currentRadius * 1.6), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, 0.1)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Ripples
    for (let k = ripples.length - 1; k >= 0; k--) {
      const rip = ripples[k];
      rip.r += 1.4;
      rip.alpha -= 0.022;

      if (rip.alpha <= 0 || rip.r >= rip.maxR) {
        ripples.splice(k, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rip.color}, ${rip.alpha})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    if (!reduceMotion) requestAnimationFrame(stepCanvas);
  }

  let lastRippleTime = 0;
  window.addEventListener('mousemove', function (e) {
    const now = Date.now();
    if (now - lastRippleTime > 110) {
      addRipple(e.clientX, e.clientY, 35);
      lastRippleTime = now;
    }
  });

  window.addEventListener('touchstart', function (e) {
    if (e.touches && e.touches[0]) {
      addRipple(e.touches[0].clientX, e.touches[0].clientY, 40);
    }
  }, { passive: true });

  window.addEventListener('click', function (e) {
    addRipple(e.clientX, e.clientY, 55, '167, 139, 250');
  });

  function handleResize() {
    sizeCanvas();
    makeParticles();
    if (reduceMotion) stepCanvas();
  }

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  sizeCanvas();
  makeParticles();
  stepCanvas();
})();
