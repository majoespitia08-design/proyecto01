(() => {
'use strict';
const { $, $$, esc, player, RANKS, savePlayer } = window.EPG;

function renderHome(){
  $('#homeXP').textContent = player.xp;
  let i = 0; RANKS.forEach((r, k) => { if (player.xp >= r.xp) i = k; });
  const cur = RANKS[i], next = RANKS[i + 1];
  const pct = next ? (player.xp - cur.xp) / (next.xp - cur.xp) * 100 : 100;
  $('#rankName').textContent = cur.n;
  $('#rankNext').textContent = next ? (next.xp - player.xp) + ' XP to ' + next.n : 'Top rank!';
  $('#rankFill').style.width = pct + '%';
  $('#rankBar').setAttribute('aria-valuenow', Math.round(pct));
  $$('.lvl').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === player.level)));
}

document.addEventListener('click', e => {
  const lvl = e.target.closest('[data-level]');
  if (!lvl) return;
  player.level = lvl.dataset.level; savePlayer(); renderHome();
});

// If the player is logged in, the server total is the one that counts
async function loadUser(){
  try {
    const d = await (await fetch('/api/me')).json();
    if (!d.logged_in) return;
    player.xp = d.xp; savePlayer(); renderHome();
    $('#authBar').innerHTML =
      `<span class="user-chip">👤 ${esc(d.username)} · #${d.position}</span>` +
      `<a class="pill" href="/ranking">🏆 Ranking</a>` +
      `<button class="pill" id="logoutBtn" type="button">Log out</button>`;
    $('#logoutBtn').addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' }); window.location.reload();
    });
  } catch (err) {}
}

renderHome();
loadUser();
})();
