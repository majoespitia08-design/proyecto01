(() => {
'use strict';
const EPG = window.EPG;
const { $, lerp, buildOptions, sfx, startTimer, stopTimer, correct, wrong, timeUp, afterChallenge,
        fitCanvas, fitText, rrect, drawPanda, FONT } = EPG;
// S always points at the current session held by core.js
const S = new Proxy({}, { get: (_, k) => EPG.S ? EPG.S[k] : undefined, set: (_, k, v) => { if (EPG.S) EPG.S[k] = v; return true; } });

/* =====================================================================
   GAME 3 — PANDA SHOT  (6 floating 3D targets)
   ===================================================================== */
const SHOT = {
  state: 'idle', bound: false, ptr: null, throwAnim: 0,
  init(){
    this.cv = $('#shotCv'); this.page = $('#page-shot');
    this.fit(); this.targets = []; this.ball = null; this.state = 'idle'; this.throwAnim = 0; this.ptr = null;
    if (!this.bound){
      this.bound = true;
      window.addEventListener('resize', () => { if (EPG.S && EPG.S.game === 'shot') this.fit(); });
      const pos = e => { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      this.cv.addEventListener('pointermove', e => { this.ptr = pos(e); });
      this.cv.addEventListener('pointerleave', () => { this.ptr = null; });
      this.cv.addEventListener('pointerdown', e => { this.ptr = pos(e); this.click(this.ptr.x, this.ptr.y); });
    }
  },
  fit(){ const f = fitCanvas(this.cv); this.ctx = f.ctx; this.W = f.W; this.H = f.H; },
  begin(){
    const q = S.cur; this.opts = buildOptions(q, 6); this.ci = this.opts.indexOf(q.a);
    this.targets = this.opts.map((text, i) => ({ text, i, row: i < 3 ? 0 : 1, col: i % 3, st: 'idle', ph: Math.random() * 6.28 }));
    $('.shot-q', this.page).textContent = q.q;
    this.ball = null; this.state = 'aim'; startTimer(1);
  },
  geo(t, now){
    const W = this.W, H = this.H, T = now / 1000;
    const amp = (Math.min(W * 0.045, 20) * (S.speed - 1) * 1.6 + 3), fr = 1.1 * S.speed;   // targets sway more/faster as speed grows
    const baseR = Math.min(W * 0.1, H * 0.105), r = baseR * (t.row ? 1 : 0.84);
    const x = W * [0.2, 0.5, 0.8][t.col] + Math.sin(T * fr + t.ph) * amp * (t.row ? 1 : 0.8);
    const y = H * [0.25, 0.52][t.row] + Math.sin(T * fr * 1.3 + t.ph * 1.7) * amp * 0.35;
    return { x, y, r };
  },
  layout(now){
    const ctx = this.ctx;
    this.targets.forEach(t => {
      const g = this.geo(t, now);
      const bw = Math.min(g.r * 2.4, this.W * 0.3);
      const ft = fitText(ctx, t.text, bw - 12, Math.min(16, g.r * 0.36), 10);
      const bh = ft.lines.length * (ft.size + 2) + 10;
      t.g = { ...g, bw, bh, bx: g.x - bw / 2, by: g.y + g.r * 1.05, ft };
    });
  },
  hit(px, py){
    let best = null;
    this.targets.forEach(t => {
      if (!t.g) return; const g = t.g;
      const inRing = Math.hypot(px - g.x, py - g.y) <= g.r * 1.12;
      const inBan = px >= g.bx && px <= g.bx + g.bw && py >= g.by && py <= g.by + g.bh;
      if (inRing || inBan) best = t;
    });
    return best;
  },
  handPos(){ const ph = this.H * 0.27; return { x: this.W / 2 + ph * 0.28, y: this.H - ph * 0.5 }; },
  click(x, y){
    if (!EPG.S || this.state !== 'aim') return;
    const t = this.hit(x, y); if (!t) return;
    stopTimer();                                                   // response time = moment of the throw
    this.state = 'fly'; this.throwAnim = 1; sfx('throw');
    this.ball = { to: t, p: 0, dur: 0.55 / (1 + (S.speed - 1) * 0.9), from: this.handPos() };  // panda throws faster each point
  },
  onTimeout(){
    if (this.state !== 'aim') return;
    this.state = 'fx'; this.targets[this.ci].st = 'reveal';
    timeUp(); afterChallenge();
  },
  land(){
    const t = this.ball.to; this.ball = null; this.state = 'fx';
    if (t.i === this.ci){ t.st = 'good'; correct(); }
    else { t.st = 'bad'; this.targets[this.ci].st = 'reveal'; wrong(); }
    afterChallenge();
  },
  update(dt, now){
    if (!this.ctx) return;
    this.layout(now);
    this.throwAnim = Math.max(0, this.throwAnim - dt * 2.5);
    if (this.ball){
      this.ball.p = Math.min(1, this.ball.p + dt / this.ball.dur);
      if (this.ball.p >= 1) this.land();
    }
    this.draw(now);
  },
  draw(now){
    const ctx = this.ctx, W = this.W, H = this.H, hy = H * 0.42;
    // arena wall
    let g = ctx.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, '#ffe29a'); g.addColorStop(1, '#ffb68c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy);
    ctx.fillStyle = 'rgba(255,255,255,.14)'; for (let x = 0; x < W; x += 46) ctx.fillRect(x, 0, 22, hy);
    // floor with perspective grid
    g = ctx.createLinearGradient(0, hy, 0, H); g.addColorStop(0, '#c98a55'); g.addColorStop(1, '#9a5f30');
    ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
    ctx.strokeStyle = 'rgba(29,27,38,.16)'; ctx.lineWidth = 2;
    for (let i = -8; i <= 8; i++){ ctx.beginPath(); ctx.moveTo(W / 2 + i * 6, hy); ctx.lineTo(W / 2 + i * W * 0.2, H); ctx.stroke(); }
    for (let k = 1; k <= 7; k++){ const t = k / 7, y = hy + (H - hy) * t * t; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = '#1d1b26'; ctx.fillRect(0, hy - 3, W, 6);

    // hovered target
    const hov = (this.state === 'aim' && this.ptr) ? this.hit(this.ptr.x, this.ptr.y) : null;

    // targets (far row first)
    [...this.targets].sort((a, b) => a.row - b.row).forEach(t => {
      const gm = t.g; if (!gm) return;
      const { x, y, r } = gm;
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y + r * 1.9 + gm.bh * 0.4, r * 0.9, r * 0.2, 0, 0, 7); ctx.fill();
      const pal = t.st === 'good' ? ['#3fbf5a', '#eaffd6', '#3fbf5a', '#eaffd6', '#ffc83d']
                : t.st === 'bad' ? ['#6b6b78', '#e2e2e8', '#6b6b78', '#e2e2e8', '#ffc83d']
                : t.st === 'reveal' ? ['#3fbf5a', '#eaffd6', '#3fbf5a', '#eaffd6', '#ffc83d']
                : ['#ff5a4d', '#ffffff', '#ff5a4d', '#ffffff', '#ffc83d'];
      ctx.fillStyle = '#1d1b26'; ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 1.06, 0, 7); ctx.fill();       // thickness / outline
      [1, 0.8, 0.6, 0.4, 0.2].forEach((f, k) => { ctx.fillStyle = pal[k]; ctx.beginPath(); ctx.arc(x, y, r * f, 0, 7); ctx.fill(); });
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * 0.9, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();   // shine
      if (t === hov){ ctx.strokeStyle = '#7a5cff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r * 1.14, 0, 7); ctx.stroke(); }
      if (t.st === 'bad'){ ctx.strokeStyle = '#ff3b2f'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - r * 0.45); ctx.lineTo(x + r * 0.45, y + r * 0.45); ctx.moveTo(x + r * 0.45, y - r * 0.45); ctx.lineTo(x - r * 0.45, y + r * 0.45); ctx.stroke(); ctx.lineCap = 'butt'; }
      // answer banner
      rrect(ctx, gm.bx, gm.by, gm.bw, gm.bh, 10);
      ctx.fillStyle = t.st === 'good' || t.st === 'reveal' ? '#b8f07a' : t.st === 'bad' ? '#ffb4a8' : '#fffdf4'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#1d1b26'; ctx.stroke();
      ctx.fillStyle = '#1d1b26'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 ${gm.ft.size}px ${FONT}`;
      gm.ft.lines.forEach((ln, k) => ctx.fillText(ln, x, gm.by + gm.bh / 2 + (k - (gm.ft.lines.length - 1) / 2) * (gm.ft.size + 2)));
    });

    // panda (throws faster/harder with the game speed)
    const ph = H * 0.27, ta = this.throwAnim;
    drawPanda(ctx, W / 2, H - 2, ph * (1 + 0.07 * ta), -0.28 * ta + 0.04 * Math.sin(now / 400), 1);
    const hp = this.handPos();
    if (this.state === 'aim' && EPG.S){
      if (this.ptr){                                        // aim guide
        ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(29,27,38,.45)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(hp.x, hp.y); ctx.lineTo(this.ptr.x, this.ptr.y); ctx.stroke(); ctx.setLineDash([]);
      }
      this.drawBall(hp.x, hp.y, H * 0.036);
    }
    if (this.ball){
      const b = this.ball, e = 1 - Math.pow(1 - b.p, 2), gm = b.to.g;
      const x = lerp(b.from.x, gm.x, e), y = lerp(b.from.y, gm.y, e) - Math.sin(Math.PI * e) * H * 0.12;
      const rad = H * 0.036 * lerp(1, gm.r / (H * 0.09), e);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, lerp(b.from.y, gm.y, e) + H * 0.06, rad * 0.8, rad * 0.25, 0, 0, 7); ctx.fill();
      this.drawBall(x, y, Math.max(6, rad));
    }
    if (this.ptr && this.state === 'aim'){                  // crosshair
      const p = this.ptr; ctx.strokeStyle = '#1d1b26'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, 7); ctx.moveTo(p.x - 22, p.y); ctx.lineTo(p.x - 6, p.y); ctx.moveTo(p.x + 6, p.y); ctx.lineTo(p.x + 22, p.y);
      ctx.moveTo(p.x, p.y - 22); ctx.lineTo(p.x, p.y - 6); ctx.moveTo(p.x, p.y + 6); ctx.lineTo(p.x, p.y + 22); ctx.stroke();
    }
  },
  drawBall(x, y, r){
    const ctx = this.ctx, g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffd0c8'); g.addColorStop(0.35, '#ff6b57'); g.addColorStop(1, '#c9321f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1d1b26'; ctx.stroke();
  },
  stop(){ this.state = 'idle'; this.ball = null; }
};

EPG.register('shot', SHOT);
EPG.start('shot');
})();
