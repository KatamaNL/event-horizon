/* EVENT HORIZON — interactief neon deeltjesveld.
   Vanilla canvas, geen dependencies. */

const NEON = ['#00f0ff', '#ff2bd6', '#9b5cff', '#7afcff'];

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

    // singulariteit-puls (klik): radiale impuls vanaf klikpunt
    if (field.burst > 0) {
      const bdx = this.x - field.burstX;
      const bdy = this.y - field.burstY;
      const bd = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
      const push = field.burst * 6;
      this.vx += (bdx / bd) * push / bd * 60;
      this.vy += (bdy / bd) * push / bd * 60;
    }

    // audio-reactief: lichte jitter op het volume
    if (audioBoost > 0) {
      this.vx += (Math.random() - 0.5) * audioBoost * 1.5;
      this.vy += (Math.random() - 0.5) * audioBoost * 1.5;
    }

    // demping + beweging
    this.vx *= 0.94;
    this.vy *= 0.94;
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
    const glow = Math.min(1, this.baseAlpha + this.speed * 0.08 + audioBoost);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size + this.speed * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = glow;
    ctx.shadowBlur = 12 + this.speed * 2;
    ctx.shadowColor = this.color;
    ctx.fill();
  }
}

class Field {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.pointer = { x: 0, y: 0, active: false, radius: 220 };
    this.burst = 0;
    this.burstX = 0;
    this.burstY = 0;
    this.audioBoost = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    // deeltjesaantal schaalt met schermoppervlak, gecapt voor mobiel
    const target = Math.min(420, Math.round((this.w * this.h) / 5200));
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

    const fire = (x, y) => { this.burst = 1; this.burstX = x; this.burstY = y; };
    window.addEventListener('click', (e) => {
      // negeer klikken op echte UI-knoppen
      if (e.target.closest('button, a')) return;
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

    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      p.step(this);
      p.draw(ctx, this.audioBoost);
    }
    ctx.globalCompositeOperation = 'source-over';

    if (this.burst > 0) this.burst = Math.max(0, this.burst - 0.08);
    this.audioBoost *= 0.9;
  }
}

window.EventHorizon = { Field };
