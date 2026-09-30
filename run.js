(() => {
'use strict';
const EPG = window.EPG;
const { $, $$, clamp, shuffle, buildOptions, sfx, startTimer, hud, updateHUD, fx, finish, correct, wrong, timeUp,
        afterChallenge, fitCanvas, fitText, rrect, poly, drawPanda, FONT } = EPG;
// S always points at the current session held by core.js
const S = new Proxy({}, { get: (_, k) => EPG.S ? EPG.S[k] : undefined, set: (_, k, v) => { if (EPG.S) EPG.S[k] = v; return true; } });

/* =====================================================================
   GAME 2 — RUN & CHOOSE  (3-lane 3D runner)
   ===================================================================== */
const GATE_Z = 100;
const LANE_COL = ['#ff6b57', '#ffc83d', '#7a5cff'];
const RUN = {
  state: 'idle', bound: false,
  init(){
    this.page = $('#page-run'); this.cv = $('#runCv');
    this.fit();
    this.tl = 1; this.px = 0; this.dash = false; this.dm = 1; this.dist = 0; this.obs = []; this.gates = null;
    this.lives = 3; this.stumble = 0; this.invul = 0; this.flash = 0; this.v0 = 9; this.state = 'idle';
    this.bamboo = Array.from({ length: 30 }, (_, i) => ({ side: i % 2 ? 1 : -1, z: i / 30 * 230, off: 0.5 + Math.random() * 1.6, h: 0.8 + Math.random() * 0.6 }));
    this.chips = $$('.chip', this.page);
    if (!this.bound){
      this.bound = true;
      window.addEventListener('resize', () => { if (EPG.S && EPG.S.game === 'run') this.fit(); });
      $$('[data-run]', this.page).forEach(b => {
        const k = b.dataset.run;
        if (k === 'dash'){
          const on = e => { e.preventDefault(); this.dash = true; b.classList.add('down'); };
          const off = () => { this.dash = false; b.classList.remove('down'); };
          b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
        } else b.addEventListener('pointerdown', e => { e.preventDefault(); this.move(k === 'left' ? -1 : 1); });
      });
      this.cv.addEventListener('pointerdown', e => { const r = this.cv.getBoundingClientRect(); this.move(e.clientX - r.left < r.width / 2 ? -1 : 1); });
    }
    hud('lives', '❤️❤️❤️');
  },
  fit(){ const f = fitCanvas(this.cv); this.ctx = f.ctx; this.W = f.W; this.H = f.H; },
  move(d){ this.tl = clamp(this.tl + d, 0, 2); this.chips.forEach((c, i) => c.classList.toggle('on', i === this.tl)); },
  begin(){
    const q = S.cur; this.opts = buildOptions(q, 3); this.ci = this.opts.indexOf(q.a);
    $('.run-q', this.page).textContent = q.q;
    this.chips.forEach((c, i) => { c.textContent = 'ABC'[i] + ': ' + this.opts[i]; c.classList.toggle('on', i === this.tl); });
    startTimer(1);
    this.v0 = GATE_Z / (0.75 * S.limit);                                 // running speed (units/s) grows with game speed
    // obstacle rows: closer together + more double blocks as speed grows, always at least one free lane
    this.obs = [];
    const gapTime = Math.max(0.72, 1.05 - (S.speed - 1) * 0.3), gapZ = this.v0 * gapTime;
    const p2 = Math.min(0.65, 0.12 + (S.speed - 1) * 0.5);
    let prevFree = [1];
    for (let z = 30 + Math.random() * 4; z < GATE_Z - 14; z += gapZ){
      if (Math.random() < 0.22) continue;
      let blocked, free, tries = 0;
      do {
        blocked = shuffle([0, 1, 2]).slice(0, Math.random() < p2 ? 2 : 1);
        free = [0, 1, 2].filter(l => !blocked.includes(l)); tries++;
      } while (!free.some(f => prevFree.some(g => Math.abs(f - g) <= 1)) && tries < 12);
      prevFree = free;
      blocked.forEach(l => this.obs.push({ z, lane: l, type: Math.floor(Math.random() * 3), hit: false }));
    }
    this.gates = { z: GATE_Z, done: false, picked: -1, rush: false };
    this.state = 'run';
  },
  onTimeout(){
    if (this.state !== 'run') return;
    this.state = 'feedback'; this.gates.rush = true; this.gates.done = true; this.gates.picked = -1; this.obs.length = 0;
    timeUp(); afterChallenge();
  },
  crash(){
    this.state = 'dead'; S.timing = false; S.streak = 0; S.wrong++; S.done++; S.crashed = true; S.over = true;
    sfx('bad'); updateHUD();
    fx('CRASH!', 'bad', ['No lives left']);
    const s = EPG.S; setTimeout(() => { if (EPG.S === s) finish(); }, 1300);
  },
  update(dt, now){
    if (!this.ctx) return;
    this.stumble = Math.max(0, this.stumble - dt); this.invul = Math.max(0, this.invul - dt); this.flash = Math.max(0, this.flash - dt * 2);
    this.dm += ((this.dash && this.state !== 'dead' ? 2.4 : 1) - this.dm) * Math.min(1, dt * 7);
    let v = this.v0 * this.dm * (this.stumble > 0 ? 0.35 : 1);
    if (this.state === 'dead') v = 0;
    this.dist += v * dt;
    this.px += (this.tl - 1 - this.px) * Math.min(1, dt * 12);
    this.bamboo.forEach(b => { b.z -= v * dt; if (b.z < -6) b.z += 230; });

    if (this.state === 'run'){
      this.obs.forEach(o => {
        o.z -= v * dt;
        if (!o.hit && this.invul <= 0 && o.z < 1.4 && o.z > -1.4 && Math.abs(o.lane - 1 - this.px) < 0.6){
          o.hit = true; this.stumble = 0.7; this.invul = 1.3; this.flash = 1; S.streak = 0;
          this.lives--; hud('lives', '❤️'.repeat(this.lives) + '🤍'.repeat(3 - this.lives)); updateHUD(); sfx('bad');
          if (this.lives <= 0) this.crash();
        }
      });
      this.obs = this.obs.filter(o => o.z > -4);
      const g = this.gates;
      if (this.state === 'run' && g){
        g.z -= v * dt;
        if (!g.done && g.z <= 0){
          g.done = true; g.picked = clamp(Math.round(this.px) + 1, 0, 2);
          this.state = 'feedback'; this.obs.length = 0;
          if (g.picked === this.ci) correct(); else wrong();
          afterChallenge();
        }
      }
    } else if (this.gates){
      this.gates.z -= v * dt * (this.gates.rush ? 4 : 1);
      if (this.gates.z < -4) this.gates = null;
    }
    this.draw(now);
  },
  draw(now){
    const ctx = this.ctx, W = this.W, H = this.H;
    const hy = H * 0.30, yb = H * 0.86, LW = Math.min(W * 0.24, H * 0.4);
    const sc = z => 1 / (1 + z / 22), Y = z => hy + (yb - hy) * sc(z), X = (l, z) => W / 2 + l * LW * sc(z);

    // sky + hills + ground
    let g = ctx.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, '#7fd6ee'); g.addColorStop(1, '#d8f5ef');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 1);
    ctx.fillStyle = '#a9dd97'; ctx.beginPath(); ctx.ellipse(W * 0.2, hy + 2, W * 0.34, H * 0.1, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#8fd27f'; ctx.beginPath(); ctx.ellipse(W * 0.72, hy + 2, W * 0.4, H * 0.13, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#6cc04a'; ctx.fillRect(0, hy, W, H - hy);

    // road bands (scroll with distance)
    const BL = 8, off = this.dist % (BL * 2);
    for (let k = -2; k < 34; k++){
      const za = k * BL - off, zb = za + BL; if (zb < -9) continue;
      const z1 = Math.max(za, -9), par = k % 2 === 0;
      poly(ctx, [[0, Y(z1)], [X(-1.62, z1), Y(z1)], [X(-1.62, zb), Y(zb)], [0, Y(zb)]], par ? '#6cc04a' : '#63b643');
      poly(ctx, [[W, Y(z1)], [X(1.62, z1), Y(z1)], [X(1.62, zb), Y(zb)], [W, Y(zb)]], par ? '#6cc04a' : '#63b643');
      poly(ctx, [[X(-1.5, z1), Y(z1)], [X(1.5, z1), Y(z1)], [X(1.5, zb), Y(zb)], [X(-1.5, zb), Y(zb)]], par ? '#646a86' : '#5a5f78');
      poly(ctx, [[X(-1.62, z1), Y(z1)], [X(-1.5, z1), Y(z1)], [X(-1.5, zb), Y(zb)], [X(-1.62, zb), Y(zb)]], par ? '#fff' : '#ff6b57');
      poly(ctx, [[X(1.5, z1), Y(z1)], [X(1.62, z1), Y(z1)], [X(1.62, zb), Y(zb)], [X(1.5, zb), Y(zb)]], par ? '#fff' : '#ff6b57');
      if (par) [-0.5, 0.5].forEach(l => poly(ctx, [[X(l - 0.03, z1), Y(z1)], [X(l + 0.03, z1), Y(z1)], [X(l + 0.03, zb), Y(zb)], [X(l - 0.03, zb), Y(zb)]], 'rgba(255,255,255,.75)'));
    }

    // world objects, far to near
    const items = [];
    this.bamboo.forEach(b => items.push({ t: 'b', z: b.z, b }));
    this.obs.forEach(o => items.push({ t: 'o', z: o.z, o }));
    if (this.gates) items.push({ t: 'g', z: this.gates.z });
    items.sort((a, b) => b.z - a.z);
    items.forEach(it => {
      if (it.z < -3) return;
      const s = sc(it.z), y = Y(it.z);
      if (it.t === 'b'){
        const b = it.b, x = X(b.side * (1.62 + b.off), it.z), h = H * 0.55 * s * b.h, w = Math.max(2, 12 * s);
        ctx.fillStyle = '#4fa040'; ctx.fillRect(x - w / 2, y - h, w, h);
        ctx.fillStyle = '#86d26a'; ctx.fillRect(x - w / 2, y - h, w * 0.35, h);
        ctx.fillStyle = '#2f7d34'; for (let j = 1; j < 4; j++) ctx.fillRect(x - w / 2 - 1, y - h * j / 4, w + 2, Math.max(1.5, 3 * s));
        ctx.fillStyle = '#5fbf4d'; ctx.beginPath(); ctx.ellipse(x + b.side * w * 2.4, y - h * 0.95, w * 3, w * 0.9, b.side * -0.5, 0, 7); ctx.fill();
      } else if (it.t === 'o'){
        const o = it.o, x = X(o.lane - 1, it.z), w = LW * s * 0.62, h = w * 0.75, lw = Math.max(1, 3 * s);
        ctx.lineWidth = lw; ctx.strokeStyle = '#1d1b26';
        if (o.type === 0){ ctx.fillStyle = '#c98543'; ctx.fillRect(x - w / 2, y - h, w, h); ctx.strokeRect(x - w / 2, y - h, w, h);
          ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x + w / 2, y); ctx.moveTo(x + w / 2, y - h); ctx.lineTo(x - w / 2, y); ctx.stroke(); }
        else if (o.type === 1){ ctx.fillStyle = '#9aa0b4'; ctx.beginPath(); ctx.ellipse(x, y - h * 0.5, w * 0.55, h * 0.6, 0, 0, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(x - w * 0.15, y - h * 0.7, w * 0.15, h * 0.12, 0, 0, 7); ctx.fill(); }
        else { rrect(ctx, x - w * 0.6, y - h * 0.6, w * 1.2, h * 0.6, h * 0.25); ctx.fillStyle = '#a5662f'; ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#e0a466'; ctx.beginPath(); ctx.ellipse(x + w * 0.6, y - h * 0.3, h * 0.12, h * 0.3, 0, 0, 7); ctx.fill(); ctx.stroke(); }
      } else {
        const gt = this.gates;
        for (let i = 0; i < 3; i++){
          const cx = X(i - 1, gt.z), pw = LW * s * 0.92, ph = H * 0.34 * s, lw = Math.max(1, 3 * s);
          let col = LANE_COL[i];
          if (gt.done){ if (i === this.ci) col = '#7ddc4f'; else if (i === gt.picked) col = '#ff5a4d'; }
          ctx.globalAlpha = 0.22; ctx.fillStyle = col; ctx.fillRect(cx - pw / 2, y - ph, pw, ph); ctx.globalAlpha = 1;
          ctx.fillStyle = '#1d1b26'; ctx.fillRect(cx - pw / 2 - 2 * s, y - ph, 6 * s + 2, ph); ctx.fillRect(cx + pw / 2 - 4 * s - 2, y - ph, 6 * s + 2, ph);
          rrect(ctx, cx - pw / 2, y - ph, pw, ph * 0.42, 10 * s); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = '#1d1b26'; ctx.stroke();
          ctx.fillStyle = i === 2 && col === LANE_COL[2] ? '#fff' : '#1d1b26'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (s > 0.34){
            const ft = fitText(ctx, this.opts[i], pw * 0.88, Math.max(10, 22 * s), 8);
            ctx.font = `700 ${ft.size}px ${FONT}`;
            ft.lines.forEach((ln, k) => ctx.fillText(ln, cx, y - ph + ph * 0.21 + (k - (ft.lines.length - 1) / 2) * (ft.size + 1)));
          } else { ctx.font = `700 ${Math.max(9, 34 * s)}px ${FONT}`; ctx.fillText('ABC'[i], cx, y - ph + ph * 0.21); }
        }
      }
    });

    // speed lines while sprinting
    if (this.dm > 1.3){
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++){
        const a = (i / 14) * Math.PI * 2 + 0.3, r1 = Math.min(W, H) * (0.35 + ((now / 90 + i * 7) % 10) / 40), r2 = r1 + 40;
        ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r1 * 1.4, H * 0.55 + Math.sin(a) * r1); ctx.lineTo(W / 2 + Math.cos(a) * r2 * 1.4, H * 0.55 + Math.sin(a) * r2); ctx.stroke();
      }
    }

    // panda
    const ph = H * 0.27, bob = Math.abs(Math.sin(this.dist * 0.55)) * ph * 0.06;
    const blink = this.invul > 0 && Math.floor(now / 80) % 2 === 0;
    if (!blink){
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(W / 2 + this.px * LW, yb + 3, ph * 0.3, ph * 0.06, 0, 0, 7); ctx.fill();
      drawPanda(ctx, W / 2 + this.px * LW, yb - bob, ph, (this.tl - 1 - this.px) * 0.22 + Math.sin(this.dist * 0.55) * 0.05);
    }
    if (this.flash > 0){ ctx.fillStyle = `rgba(255,70,50,${this.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
  },
  stop(){ this.state = 'idle'; this.dash = false; }
};

document.addEventListener('keydown', e => {
  const s = EPG.S;
  if (!s || s.over) return;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A'){ e.preventDefault(); if (!e.repeat) RUN.move(-1); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D'){ e.preventDefault(); if (!e.repeat) RUN.move(1); }
  else if (k === 'ArrowUp' || k === ' ' || k === 'Shift'){ e.preventDefault(); RUN.dash = true; }
});
document.addEventListener('keyup', e => { if (['ArrowUp', ' ', 'Shift'].includes(e.key)) RUN.dash = false; });

EPG.register('run', RUN);
EPG.start('run');
})();
