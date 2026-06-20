/* EVENT HORIZON — interactief neon deeltjesveld.
   Vanilla canvas, geen dependencies. */

const NEON = ['#00f0ff', '#ff2bd6', '#9b5cff', '#7afcff'];

/* Vooraf-getekende glow-sprite per kleur. shadowBlur per deeltje is op canvas
   loodzwaar; een radial-gradient sprite die we met drawImage + 'lighter'
   compositen geeft dezelfde bloom voor een fractie van de kosten. */
const GLOW_SIZE = 64;
const glowSprites = {};
function buildGlowSprites() {
  for (const color of NEON) {
    const c = document.createElement('canvas');
    c.width = c.height = GLOW_SIZE;
    const g = c.getContext('2d');
    const r = GLOW_SIZE / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.25, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();
    glowSprites[color] = c;
  }
}

class Particle {
  constructor(w, h) {
    this.reset(w, h);
    // verspreid bij start zodat het scherm meteen vol staat
    this.x = Math.random() * w;
    this.y = Math.random() * h;
  }

  reset(w, h) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.size = Math.random() * 1.8 + 0.6;
    this.color = NEON[(Math.random() * NEON.length) | 0];
    this.sprite = glowSprites[this.color];
    this.baseAlpha = Math.random() * 0.5 + 0.3;
  }

  step(field) {
    const { pointer, w, h, audioBoost } = field;

    // zwaartekracht richting cursor
    const dx = pointer.x - this.x;
    const dy = pointer.y - this.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq) || 1;

    if (pointer.active && dist < pointer.radius) {
      // binnen invloedsfeer: aantrekken, met afstoting heel dichtbij
      const force = (pointer.radius - dist) / pointer.radius;
      const dir = dist < 70 ? -1 : 1; // dichtbij = wegduwen
      this.vx += (dx / dist) * force * 0.6 * dir;
      this.vy += (dy / dist) * force * 0.6 * dir;
    }

    // singulariteit-puls (klik): begrensde radiale impuls met afstand-falloff
    if (field.burst > 0) {
      const bdx = this.x - field.burstX;
      const bdy = this.y - field.burstY;
      const bd = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
      // sterkte zakt met afstand; gecapt zodat deeltjes vlakbij niet exploderen
      const falloff = Math.max(0, 1 - bd / 600);
      const push = field.burst * falloff * 9;
      this.vx += (bdx / bd) * push;
      this.vy += (bdy / bd) * push;
    }

    // audio-reactief: lichte jitter op het volume
    if (audioBoost > 0) {
      this.vx += (Math.random() - 0.5) * audioBoost * 1.5;
      this.vy += (Math.random() - 0.5) * audioBoost * 1.5;
    }

    // demping + beweging
    this.vx *= 0.94;
    this.vy *= 0.94;

    // snelheidsplafond: voorkomt dat glow/grootte exploderen en de GPU verstikken
    const MAX_V = 16;
    const v2 = this.vx * this.vx + this.vy * this.vy;
    if (v2 > MAX_V * MAX_V) {
      const s = MAX_V / Math.sqrt(v2);
      this.vx *= s;
      this.vy *= s;
    }

    this.x += this.vx;
    this.y += this.vy;

    // wrap rond de randen
    if (this.x < -20) this.x = w + 20;
    if (this.x > w + 20) this.x = -20;
    if (this.y < -20) this.y = h + 20;
    if (this.y > h + 20) this.y = -20;

    this.speed = Math.abs(this.vx) + Math.abs(this.vy);
  }

  draw(ctx, audioBoost) {
    const glow = Math.min(1, this.baseAlpha + this.speed * 0.05 + audioBoost);
    // bloom-radius schaalt met grootte + snelheid, gecapt zodat niets explodeert
    const r = Math.min(26, (this.size + this.speed * 0.2) * 6);
    ctx.globalAlpha = glow;
    ctx.drawImage(this.sprite, this.x - r, this.y - r, r * 2, r * 2);
  }
}

class Field {
  constructor(canvas) {
    buildGlowSprites();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.pointer = { x: 0, y: 0, active: false, radius: 220 };
    this.burst = 0;
    this.burstX = 0;
    this.burstY = 0;
    this.audioBoost = 0;
    this.rings = []; // shockwave-ringen bij klik
    this.hue = 0;    // langzaam roterende basistint voor het web
    // DPR gecapt op 1.5: een shadow-blur-zwaar canvas op retina (2x) is 4x zo duur
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.resize();
    this.bindPointer();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const { canvas } = this;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    canvas.width = this.w * this.dpr;
    canvas.height = this.h * this.dpr;
    canvas.style.width = this.w + 'px';
    canvas.style.height = this.h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // deeltjesaantal schaalt met schermoppervlak, gecapt voor soepele framerate
    const target = Math.min(260, Math.round((this.w * this.h) / 8500));
    while (this.particles.length < target) this.particles.push(new Particle(this.w, this.h));
    this.particles.length = target;

    if (!this.pointer.active) {
      this.pointer.x = this.w / 2;
      this.pointer.y = this.h / 2;
    }
    this.pointer.radius = Math.min(260, Math.max(150, this.w * 0.18));
  }

  bindPointer() {
    const set = (x, y) => {
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.active = true;
    };
    window.addEventListener('mousemove', (e) => set(e.clientX, e.clientY));
    window.addEventListener('mouseleave', () => { this.pointer.active = false; });
    window.addEventListener('touchmove', (e) => {
      if (e.touches[0]) set(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchend', () => { this.pointer.active = false; });

    const fire = (x, y) => {
      this.burst = 1; this.burstX = x; this.burstY = y;
      this.rings.push({ x, y, r: 0, life: 1 }); // shockwave
    };
    window.addEventListener('click', (e) => {
      // negeer klikken op echte UI-knoppen
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('button, a')) return;
      fire(e.clientX, e.clientY);
    });
  }

  frame() {
    const { ctx, w, h } = this;
    // trail-effect: half-transparante wipe i.p.v. clear
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(5, 1, 15, 0.22)';
    ctx.fillRect(0, 0, w, h);

    this.hue = (this.hue + 0.3) % 360;
    ctx.globalCompositeOperation = 'lighter';

    // 1. stap alle deeltjes
    for (const p of this.particles) p.step(this);

    // 2. constellation-web: lijntjes tussen nabije deeltjes
    this.drawWeb(ctx);

    // 3. cursor-glow als zachte lichtbron
    if (this.pointer.active) {
      const cg = 90 + this.audioBoost * 120;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(glowSprites['#7afcff'], this.pointer.x - cg, this.pointer.y - cg, cg * 2, cg * 2);
    }

    // 4. teken de deeltjes zelf bovenop het web
    for (const p of this.particles) p.draw(ctx, this.audioBoost);

    // 5. shockwave-ringen
    this.drawRings(ctx);

    ctx.globalCompositeOperation = 'source-over';

    if (this.burst > 0) this.burst = Math.max(0, this.burst - 0.08);
    this.audioBoost *= 0.9;
  }

  drawWeb(ctx) {
    const ps = this.particles;
    const MAX = 130, MAX2 = MAX * MAX;
    ctx.lineWidth = 1;
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i];
      for (let j = i + 1; j < ps.length; j++) {
        const b = ps[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > MAX2) continue;
        const alpha = (1 - Math.sqrt(d2) / MAX) * 0.5;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = a.color;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // verbind ook met de cursor voor een 'spinnenweb aan je vinger'-effect
      if (this.pointer.active) {
        const dx = a.x - this.pointer.x, dy = a.y - this.pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < MAX2 * 2.2) {
          ctx.globalAlpha = (1 - Math.sqrt(d2) / (MAX * 1.5)) * 0.4;
          if (ctx.globalAlpha > 0) {
            ctx.strokeStyle = '#7afcff';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(this.pointer.x, this.pointer.y);
            ctx.stroke();
          }
        }
      }
    }
  }

  drawRings(ctx) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += 14;
      r.life -= 0.022;
      if (r.life <= 0) { this.rings.splice(i, 1); continue; }
      ctx.globalAlpha = r.life * 0.6;
      ctx.lineWidth = 2 + r.life * 3;
      ctx.strokeStyle = '#ff2bd6';
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      // tweede, snellere cyan-ring eromheen
      ctx.globalAlpha = r.life * 0.4;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * 1.25, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

window.EventHorizon = { Field };
