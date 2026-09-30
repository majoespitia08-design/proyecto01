(() => {
'use strict';

/* =====================================================================
   HELPERS
   ===================================================================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FONT = "Fredoka,'Trebuchet MS',system-ui,sans-serif";
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shuffle(a){ const r = a.slice(); for (let i = r.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

/* =====================================================================
   PANDA ART (one SVG used everywhere: DOM + canvas)
   ===================================================================== */
const PANDA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="230" viewBox="0 0 200 230">
<g stroke="#1d1b26" stroke-width="3.5" stroke-linejoin="round">
<ellipse cx="68" cy="205" rx="24" ry="20" fill="#1d1b26"/><ellipse cx="132" cy="205" rx="24" ry="20" fill="#1d1b26"/>
<ellipse cx="100" cy="150" rx="56" ry="60" fill="#fff"/>
<ellipse cx="46" cy="140" rx="17" ry="34" fill="#1d1b26" transform="rotate(18 46 140)"/>
<ellipse cx="154" cy="140" rx="17" ry="34" fill="#1d1b26" transform="rotate(-18 154 140)"/>
<circle cx="58" cy="42" r="19" fill="#1d1b26"/><circle cx="142" cy="42" r="19" fill="#1d1b26"/>
<ellipse cx="100" cy="122" rx="42" ry="11" fill="#ff6b57"/>
<ellipse cx="100" cy="78" rx="54" ry="48" fill="#fff"/>
</g>
<ellipse cx="74" cy="76" rx="15" ry="19" fill="#1d1b26" transform="rotate(22 74 76)"/>
<ellipse cx="126" cy="76" rx="15" ry="19" fill="#1d1b26" transform="rotate(-22 126 76)"/>
<circle cx="76" cy="74" r="6.5" fill="#fff"/><circle cx="124" cy="74" r="6.5" fill="#fff"/>
<circle cx="77.5" cy="75" r="3.2" fill="#1d1b26"/><circle cx="122.5" cy="75" r="3.2" fill="#1d1b26"/>
<ellipse cx="100" cy="94" rx="9" ry="6.5" fill="#1d1b26"/>
<path d="M100 100v5M100 105q-8 8-16 2M100 105q8 8 16 2" stroke="#1d1b26" stroke-width="3" fill="none" stroke-linecap="round"/>
<circle cx="58" cy="98" r="7" fill="#ff9bb0" opacity=".55"/><circle cx="142" cy="98" r="7" fill="#ff9bb0" opacity=".55"/>
</svg>`;
const pandaImg = new Image();
pandaImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(PANDA_SVG);
function drawPanda(ctx, x, yBottom, h, rot = 0, sx = 1){
  if (!pandaImg.complete || !pandaImg.naturalWidth) return;
  const w = h * 200 / 230;
  ctx.save(); ctx.translate(x, yBottom); ctx.rotate(rot); ctx.scale(sx, 1 / sx);
  ctx.drawImage(pandaImg, -w / 2, -h, w, h); ctx.restore();
}

/* =====================================================================
   QUESTION BANK  [question, correct answer, [5 wrong answers]]
   14 per level -> 10 are drawn per game, shuffled, never repeated.
   ===================================================================== */
const BANK = {
A1: [
 ["She ___ a student.", "is", ["are","am","be","do","were"]],
 ["I ___ from Colombia.", "am", ["is","are","be","do","has"]],
 ["What is the opposite of “hot”?", "cold", ["warm","big","fast","hard","small"]],
 ["Which one is a fruit?", "apple", ["chair","dog","table","book","shoe"]],
 ["What ___ your name?", "is", ["are","am","do","be","has"]],
 ["Monday, Tuesday, ___ ?", "Wednesday", ["Friday","Sunday","Saturday","Thursday","January"]],
 ["She has two ___.", "brothers", ["brother","brothes","a brother","brotheres","brotherses"]],
 ["They ___ playing football.", "are", ["is","am","be","does","has"]],
 ["Which word is a color?", "blue", ["run","eat","drink","jump","sleep"]],
 ["I ___ breakfast at 7 o'clock.", "have", ["am","is","does","be","has"]],
 ["___ do you live? — In Bogotá.", "Where", ["Who","When","Why","How","Which"]],
 ["Plural of “cat”", "cats", ["cates","cat's","cati","catz","caties"]],
 ["He ___ TV every night.", "watches", ["watch","watching","watchs","to watch","is watch"]],
 ["Where do you sleep?", "In my bed", ["Yes, I do","At six o'clock","Very well","Because I'm tired","Blue and red"]]
],
A2: [
 ["Yesterday I ___ to the cinema.", "went", ["go","goes","going","gone","am going"]],
 ["She is ___ than her sister.", "taller", ["tall","tallest","more tall","most tall","tallier"]],
 ["Look! It ___ right now.", "is raining", ["rains","rained","rain","has rain","raining"]],
 ["There isn't ___ milk in the fridge.", "any", ["some","a","an","many","few"]],
 ["How ___ apples do you want?", "many", ["much","long","few","little","lot"]],
 ["I'm going to ___ my grandparents tomorrow.", "visit", ["visits","visited","visiting","to visit","visitor"]],
 ["Which word is a job?", "teacher", ["teach","school","blackboard","classroom","homework"]],
 ["You ___ wear a helmet. It's the law.", "must", ["mustn't","don't have","may not","can't","won't"]],
 ["This is the ___ movie I've ever seen.", "best", ["good","better","most good","goodest","more good"]],
 ["She ___ her homework yet.", "hasn't finished", ["doesn't finish","isn't finish","not finished","haven't finished","hasn't finish"]],
 ["If it rains, we ___ at home.", "will stay", ["stayed","would stayed","have stayed","staying","to stay"]],
 ["I usually ___ up at 6:30.", "get", ["gets","getting","got","am get","to get"]],
 ["Opposite of “expensive”", "cheap", ["rich","poor","costly","heavy","new"]],
 ["She's afraid ___ spiders.", "of", ["on","at","in","to","with"]]
],
B1: [
 ["If I ___ more money, I would travel the world.", "had", ["have","will have","would have","having","has"]],
 ["The report ___ by the manager yesterday.", "was written", ["wrote","is written","has wrote","was writing","written"]],
 ["I've lived here ___ 2019.", "since", ["for","from","during","at","ago"]],
 ["You ___ smoke here. It's forbidden.", "mustn't", ["don't have to","needn't","might","don't must","aren't"]],
 ["By the time we arrived, the movie ___.", "had started", ["has started","was starting","starts","is starting","have started"]],
 ["She's used ___ up early.", "to getting", ["to get","get","getting","to gets","for getting"]],
 ["Choose the synonym of “huge”.", "enormous", ["tiny","average","narrow","quiet","ancient"]],
 ["I wish I ___ speak French.", "could", ["can","will","must","shall","may"]],
 ["He's the man ___ car was stolen.", "whose", ["who","which","that","whom","what"]],
 ["Neither Anna ___ Tom came to the party.", "nor", ["or","and","but","either","than"]],
 ["We ___ to the beach every summer when I was a child.", "used to go", ["use to go","used to going","are used to go","was used to go","get used to go"]],
 ["I'm looking forward ___ you.", "to seeing", ["to see","seeing","for see","to saw","at seeing"]],
 ["The meeting was ___ because of the storm.", "called off", ["called up","called in","called out","called for","called on"]],
 ["Despite ___ hard, he failed the exam.", "studying", ["to study","he studied","studied","study","of studying"]]
],
B2: [
 ["Had I known about the traffic, I ___ earlier.", "would have left", ["would leave","will leave","had left","left","would had left"]],
 ["She insisted ___ paying for dinner.", "on", ["in","at","to","for","of"]],
 ["The new policy is expected ___ costs by 15%.", "to reduce", ["reducing","reduce","to reducing","on reducing","reduced"]],
 ["Choose the closest meaning to “reluctant”.", "unwilling", ["eager","generous","curious","exhausted","reliable"]],
 ["No sooner ___ home than it started to rain.", "had she arrived", ["she arrived","she had arrived","did she arrive","has she arrived","she has arrived"]],
 ["I'd rather you ___ smoke in here.", "didn't", ["don't","won't","not","shouldn't","aren't"]],
 ["The company has been under ___ for its environmental record.", "scrutiny", ["scrutinize","scrutinously","scrutinized","scrutinizing","scrutinal"]],
 ["He denied ___ the money.", "taking", ["to take","take","took","to taking","of taking"]],
 ["By this time next year, I ___ my degree.", "will have completed", ["complete","have completed","am completing","would complete","had completed"]],
 ["The idiom “break the ice” means to ___.", "ease social tension", ["destroy frozen water","end a friendship","tell a lie","lose your temper","save money"]],
 ["It's high time we ___ the problem.", "solved", ["solve","will solve","have solving","solving","to solve"]],
 ["Not only ___ late, but he also forgot the documents.", "was he", ["he was","he is","did he","he had","were he"]],
 ["The word “ubiquitous” means…", "found everywhere", ["very rare","extremely old","easily broken","deeply hidden","widely disliked"]],
 ["She ___ a lot of stress lately.", "has been under", ["is under","was under","have been under","being under","would be under"]]
]};
const LEVELS = ['A1','A2','B1','B2'];

/* =====================================================================
   PLAYER (XP + level, saved when storage is available)
   ===================================================================== */
const player = { xp: 0, level: 'A1' };
const lastQ = {};
try {
  const d = JSON.parse(localStorage.getItem('epg_player') || '{}');
  if (Number.isFinite(d.xp)) player.xp = d.xp;
  if (LEVELS.includes(d.level)) player.level = d.level;
} catch (e) {}
function savePlayer(){ try { localStorage.setItem('epg_player', JSON.stringify(player)); } catch (e) {} }

const RANKS = [
  { n:'Panda Cub', xp:0 }, { n:'Bamboo Scout', xp:150 }, { n:'Bamboo Runner', xp:400 },
  { n:'Panda Hero', xp:800 }, { n:'Panda Master', xp:1400 }, { n:'Panda Legend', xp:2200 }
];

/* =====================================================================
   GAME CONFIG
   ===================================================================== */
const TOTAL = 10;
const LEVEL_TIME = { A1: 14, A2: 12.5, B1: 11, B2: 10 };   // base seconds per challenge
const WRONG_PENALTY = { surprise: 0, run: 0.1, shot: 0.1 }; // speed lost after a wrong answer
// time tiers: [max fraction of the time used, XP, label]
const TIERS = [[0.30, 15, 'VERY FAST'], [0.55, 12, 'FAST'], [0.80, 10, 'NORMAL'], [1.01, 5, 'SLOW']];
const GAME_INFO = { surprise: '🎁 SURPRISE BALL', run: '🏃 RUN & CHOOSE', shot: '🎯 PANDA SHOT' };

/* =====================================================================
   QUESTIONS: level based, shuffled, no repeats, none twice in a row
   ===================================================================== */
function pickQuestions(level, n){
  let pool = shuffle(BANK[level].map((x, i) => ({ id: level + i, q: x[0], a: x[1], w: x[2] })));
  pool = pool.slice(0, n);
  if (lastQ[level] && pool[0].id === lastQ[level] && pool.length > 1){ [pool[0], pool[1]] = [pool[1], pool[0]]; }
  lastQ[level] = pool[pool.length - 1].id;
  return pool;
}
function buildOptions(q, count){ return shuffle([q.a, ...shuffle(q.w).slice(0, count - 1)]); }

/* =====================================================================
   SOUND (tiny, optional)
   ===================================================================== */
let AC = null, muted = false;
function sfx(kind){
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const seq = { ok:[[660,.08],[880,.14]], bad:[[220,.2]], time:[[320,.12],[220,.22]], pick:[[520,.06],[700,.06]],
                  throw:[[420,.05],[620,.05]], end:[[523,.1],[659,.1],[784,.18]] }[kind];
    let t = AC.currentTime;
    seq.forEach(([f, d]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(.1, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d); t += d * .9;
    });
  } catch (e) {}
}

/* =====================================================================
   SESSION (shared engine: timer, speed, XP, streak, results)
   ===================================================================== */
let S = null;          // current session
let lastGame = 'surprise';
const ENGINES = {};    // each game file registers its engine here

function newSession(game){
  S = { game, level: player.level, idx: -1, done: 0, score: 0, xp: 0, correct: 0, wrong: 0,
        streak: 0, best: 0, speed: 1, maxSpeed: 1, times: [], questions: pickQuestions(player.level, TOTAL),
        limit: 1, tStart: 0, timing: false, lastEl: 0, cur: null, epoch: 0, over: false, finished: false, pausedAt: 0 };
}
const fmtSpeed = () => S.speed.toFixed(1) + 'x';
function later(fn, ms){ const s = S, ep = S.epoch; setTimeout(() => { if (S === s && S.epoch === ep) fn(); }, ms); }

function timeLimit(mult = 1){ return LEVEL_TIME[S.level] * mult / (1 + (S.speed - 1) * 0.5); } // less time as speed grows
function startTimer(mult = 1){ S.limit = timeLimit(mult); S.tStart = performance.now(); S.timing = true; setTime(S.limit); }
const elapsed = () => (performance.now() - S.tStart) / 1000;
function stopTimer(){ S.lastEl = Math.min(elapsed(), S.limit); S.timing = false; return S.lastEl; }

/* ---------- HUD ---------- */
function barHTML(key){
  return `<div class="gb-top">
    <button class="btn-back" data-act="home">← Home</button>
    <div class="gb-title">${GAME_INFO[key]}</div>
    <span class="chip-level" data-hud="level">A1</span>
    <span class="gb-count" data-hud="count">1/${TOTAL}</span>
    <button class="btn-mute" data-act="mute" aria-label="Sound on or off">🔊</button>
  </div>
  <div class="hud ${key === 'run' ? 'six' : ''}">
    <div><span>SCORE</span><b data-hud="score">0</b></div>
    <div><span>XP</span><b data-hud="xp">0</b></div>
    <div><span>STREAK</span><b data-hud="streak">x0</b></div>
    <div><span>SPEED</span><b data-hud="speed">1.0x</b></div>
    <div><span>TIME</span><b data-hud="time">--</b></div>
    ${key === 'run' ? '<div class="lives"><span>LIVES</span><b data-hud="lives">❤️❤️❤️</b></div>' : ''}
  </div>
  <div class="timerbar"><i data-hud="bar"></i></div>`;
}
function hud(k, v){ if (!S) return; const el = $(`[data-hud="${k}"]`, $('#page-' + S.game)); if (el) el.textContent = v; }
function updateHUD(){
  if (!S) return;
  hud('level', S.level);
  hud('count', Math.min(S.idx + 1, TOTAL) + '/' + TOTAL);
  hud('score', S.score); hud('xp', player.xp); hud('streak', 'x' + S.streak); hud('speed', fmtSpeed());
}
function setTime(rem){
  if (!S) return;
  const page = $('#page-' + S.game);
  hud('time', rem === null ? '--' : Math.max(0, rem).toFixed(1).padStart(4, '0') + 's');
  const bar = $('[data-hud="bar"]', page);
  const pct = rem === null ? 100 : clamp(rem / S.limit * 100, 0, 100);
  bar.style.width = pct + '%'; bar.classList.toggle('low', pct < 25);
}

/* ---------- feedback banner ---------- */
function fx(title, kind, lines = [], combo = ''){
  const el = $('#fx');
  el.className = ''; void el.offsetWidth;
  $('.fx-title', el).textContent = title;
  $('.fx-lines', el).innerHTML = lines.map(l => `<span>${esc(l)}</span>`).join('');
  $('.fx-combo', el).textContent = combo;
  el.className = 'show ' + kind;
}

/* ---------- outcomes ---------- */
function correct(){
  const el = S.timing ? stopTimer() : S.lastEl;
  const ratio = el / S.limit;
  const tier = TIERS.find(t => ratio < t[0]) || TIERS[3];
  S.streak++; S.best = Math.max(S.best, S.streak);
  const bonus = S.streak >= 10 ? 6 : S.streak >= 5 ? 4 : S.streak >= 3 ? 2 : 0;   // streak raises XP, speed still matters
  const gain = tier[1] + bonus;
  S.xp += gain; player.xp += gain; savePlayer();
  S.score += Math.round(gain * S.speed);
  S.correct++; S.done++; S.times.push(el);
  S.speed = Math.min(3, Math.round((S.speed + 0.1) * 10) / 10);          // +0.1x per point
  S.maxSpeed = Math.max(S.maxSpeed, S.speed);
  const combo = S.streak >= 10 ? 'AMAZING!' : S.streak >= 3 ? 'COMBO x' + S.streak + '!' : '';
  sfx('ok');
  fx('CORRECT!', 'good', ['+' + gain + ' XP', tier[2] + ' ANSWER', 'SPEED UP! ' + fmtSpeed()], combo);
  updateHUD();
}
function wrong(){
  const el = S.timing ? stopTimer() : S.lastEl;
  S.streak = 0; S.wrong++; S.done++; S.times.push(el);
  S.speed = Math.max(1, Math.round((S.speed - WRONG_PENALTY[S.game]) * 10) / 10);
  sfx('bad');
  fx('WRONG!', 'bad', ['Answer: ' + S.cur.a, '0 XP']);
  updateHUD();
}
function timeUp(){
  S.timing = false; setTime(0);
  S.streak = 0; S.wrong++; S.done++;
  sfx('time');
  fx("TIME'S UP!", 'time', ['Answer: ' + S.cur.a, '0 XP']);
  updateHUD();
}
function afterChallenge(){ if (S.over) return; later(nextChallenge, 1500 / Math.sqrt(S.speed)); }   // next challenge arrives sooner as speed grows

function nextChallenge(){
  if (!S || S.over) return;
  if (S.done >= TOTAL) return finish();
  S.idx++; S.cur = S.questions[S.idx];
  updateHUD(); setTime(null);
  ENGINES[S.game].begin();
}

// sends the XP of the finished game to the server (only counts when logged in)
function saveScore(payload){
  fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (d && d.position){ const n = $('#resNote'); if (n) n.textContent += ' · Ranking #' + d.position; } })
    .catch(() => {});
}

function finish(){
  if (!S || S.finished) return;
  S.finished = true; S.over = true; S.timing = false; lastGame = S.game; sfx('end');
  const avg = S.times.length ? (S.times.reduce((a, b) => a + b, 0) / S.times.length).toFixed(1) + 's' : '--';
  $('#resNote').textContent = S.crashed ? 'The panda ran out of lives.' : GAME_INFO[S.game].replace(/^\S+\s/, '') + ' · Level ' + S.level;
  $('#resGrid').innerHTML = [
    ['SCORE', S.score], ['XP EARNED', '+' + S.xp], ['CORRECT', S.correct + '/' + TOTAL], ['WRONG', S.wrong],
    ['BEST STREAK', 'x' + S.best], ['MAX SPEED', S.maxSpeed.toFixed(1) + 'x'], ['AVERAGE TIME', avg]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('') +
    `<div class="wide"><dt>TOTAL XP</dt><dd>⭐ ${player.xp}</dd></div>`;
  $('#resMain').classList.remove('hidden'); $('#resPick').classList.add('hidden');
  $('#results').classList.remove('hidden');
  const b = $('#resMain .primary'); if (b) b.focus();
  saveScore({ xp: S.xp, game: S.game, level: S.level });
}

/* =====================================================================
   START / STOP  (each game lives on its own HTML page)
   ===================================================================== */
function stopGame(){ if (S){ S.epoch++; S.over = true; S.timing = false; const e = ENGINES[S.game]; if (e && e.stop) e.stop(); } S = null; const f = $('#fx'); if (f) f.className = ''; }
function startGame(key){
  stopGame(); const r = $('#results'); if (r) r.classList.add('hidden');
  newSession(key);
  ENGINES[key].init(); updateHUD(); setTime(null);
  nextChallenge();
}
function register(key, engine){ ENGINES[key] = engine; }
const homeUrl = () => document.body.dataset.home || '/';

/* =====================================================================
   FRAME LOOP + SHARED EVENTS
   ===================================================================== */
let lastT = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (!S) return;
  if (S.timing && !S.pausedAt){
    const rem = S.limit - elapsed();
    setTime(rem);
    if (rem <= 0){ S.timing = false; ENGINES[S.game].onTimeout(); }
  }
  const eng = ENGINES[S.game]; if (eng && eng.update) eng.update(dt, now);
}

document.addEventListener('visibilitychange', () => {       // pause the clock while the tab is hidden
  if (!S) return;
  if (document.hidden) S.pausedAt = performance.now();
  else if (S.pausedAt){ S.tStart += performance.now() - S.pausedAt; S.pausedAt = 0; }
});

document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  if (!act) return;
  switch (act.dataset.act){
    case 'home': window.location.href = homeUrl(); break;
    case 'again': startGame(lastGame); break;
    case 'change': $('#resMain').classList.add('hidden'); $('#resPick').classList.remove('hidden'); break;
    case 'back-results': $('#resPick').classList.add('hidden'); $('#resMain').classList.remove('hidden'); break;
    case 'mute': muted = !muted; $$('.btn-mute').forEach(b => b.textContent = muted ? '🔇' : '🔊'); break;
  }
});

/* ---------- boot ---------- */
$$('[data-panda]').forEach(el => { el.innerHTML = PANDA_SVG; });
$$('[data-bar]').forEach(el => { el.innerHTML = barHTML(el.dataset.bar); });
requestAnimationFrame(loop);

/* ---------- what the other files can use ---------- */
window.EPG = {
  $, $$, esc, FONT, lerp, clamp, shuffle, drawPanda, buildOptions, sfx,
  player, savePlayer, RANKS, LEVELS,
  later, startTimer, stopTimer, hud, updateHUD, fx, correct, wrong, timeUp, afterChallenge, finish,
  fitCanvas, fitText, rrect, poly,
  register, start: startGame,
  get S(){ return S; }
};

/* =====================================================================
   CANVAS UTILITIES
   ===================================================================== */
function fitCanvas(cv){
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.max(1, r.width), H = Math.max(1, r.height);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W, H };
}
function fitText(ctx, text, maxW, max = 16, min = 10, weight = 600){
  for (let s = max; s >= min; s--){ ctx.font = `${weight} ${s}px ${FONT}`; if (ctx.measureText(text).width <= maxW) return { lines: [text], size: s }; }
  const words = text.split(' ');
  for (let s = Math.min(max, 14); s >= min; s--){
    ctx.font = `${weight} ${s}px ${FONT}`;
    const lines = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (!cur || ctx.measureText(t).width <= maxW) cur = t; else { lines.push(cur); cur = w; } });
    lines.push(cur);
    if (lines.length <= 2 && lines.every(l => ctx.measureText(l).width <= maxW)) return { lines, size: s };
  }
  return { lines: [text], size: min };
}
function rrect(ctx, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function poly(ctx, pts, color){ ctx.fillStyle = color; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); }
})();
