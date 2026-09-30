(() => {
'use strict';
const EPG = window.EPG;
const { $, $$, esc, buildOptions, sfx, later, startTimer, correct, wrong, timeUp, afterChallenge } = EPG;
// S always points at the current session held by core.js
const S = new Proxy({}, { get: (_, k) => EPG.S ? EPG.S[k] : undefined, set: (_, k, v) => { if (EPG.S) EPG.S[k] = v; return true; } });

/* =====================================================================
   GAME 1 — SURPRISE BALL
   ===================================================================== */
const SB = {
  phase: 'idle',
  init(){
    this.page = $('#page-surprise'); this.ballsEl = $('.box-balls', this.page); this.scene = $('.sb-scene', this.page);
    this.card = $('.sb-card', this.page); this.panda = $('.sb-panda', this.page); this.prompt = $('.sb-prompt', this.page);
  },
  begin(){
    const q = S.cur; this.opts = buildOptions(q, 4); this.ci = this.opts.indexOf(q.a); this.phase = 'pick';
    this.card.classList.add('hidden'); this.scene.classList.remove('hidden');
    this.prompt.textContent = 'Pick a ball!';
    const pos = [0, 20, 42.5, 65, 85];
    this.ballsEl.innerHTML = pos.map((l, i) =>
      `<button class="ball b${i}" style="left:${l}%;--hop:${((1.5 + i * 0.21) / S.speed).toFixed(2)}s;--del:${(-i * 0.37).toFixed(2)}s;--fly:${(0.6 / S.speed).toFixed(2)}s" aria-label="Surprise ball ${i + 1}"><span>?</span></button>`).join('');
    $$('.ball', this.ballsEl).forEach(b => b.addEventListener('click', () => this.pick(b)));
  },
  pick(b){
    if (this.phase !== 'pick') return;
    this.phase = 'picked'; sfx('pick');
    b.classList.add('picked');
    $$('.ball', this.ballsEl).forEach(x => { if (x !== b) x.classList.add('dim'); });
    this.panda.classList.remove('reach'); void this.panda.offsetWidth; this.panda.classList.add('reach');
    this.prompt.textContent = 'Surprise!';
    later(() => this.reveal(), 650 / S.speed);
  },
  reveal(){
    const q = S.cur;
    this.scene.classList.add('hidden'); this.card.classList.remove('hidden');
    this.card.classList.remove('pop'); void this.card.offsetWidth; this.card.classList.add('pop');
    $('.sb-q', this.card).textContent = q.q;
    const o = $('.sb-opts', this.card);
    o.innerHTML = this.opts.map((t, i) => `<button class="opt" data-i="${i}"><b>${'ABCD'[i]}</b><span>${esc(t)}</span></button>`).join('');
    $$('.opt', o).forEach(b => b.addEventListener('click', () => this.answer(+b.dataset.i)));
    this.phase = 'ask'; startTimer(1);
  },
  answer(i){
    if (this.phase !== 'ask') return;
    this.phase = 'done';
    const btns = $$('.opt', this.card); btns.forEach(b => b.disabled = true);
    if (i === this.ci){ btns[i].classList.add('good'); correct(); }
    else { btns[i].classList.add('bad'); btns[this.ci].classList.add('good'); wrong(); }
    afterChallenge();
  },
  onTimeout(){
    if (this.phase !== 'ask') return;
    this.phase = 'done';
    const btns = $$('.opt', this.card); btns.forEach(b => b.disabled = true); btns[this.ci].classList.add('good');
    timeUp(); afterChallenge();
  },
  update(){}, stop(){ this.phase = 'idle'; }
};

document.addEventListener('keydown', e => {
  const s = EPG.S;
  if (!s || s.over) return;
  if (SB.phase === 'ask' && /^[1-4]$/.test(e.key)) SB.answer(+e.key - 1);
});

EPG.register('surprise', SB);
EPG.start('surprise');
})();
