(() => {
'use strict';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

fetch('/api/ranking').then(r => r.json()).then(d => {
  const body = document.getElementById('rkBody');
  const me = d.me;
  if (!d.ranking.length){
    body.innerHTML = '<tr><td colspan="4">No players yet. Be the first!</td></tr>';
  } else {
    body.innerHTML = d.ranking.map(r =>
      `<tr class="${me && me.user_id === r.user_id ? 'me' : ''}">
        <td>${MEDAL[r.position] || r.position}</td>
        <td>${esc(r.username)}</td>
        <td>${r.xp}</td>
        <td>${r.games_played}</td>
      </tr>`).join('');
  }
  const meEl = document.getElementById('rkMe');
  if (me){
    meEl.textContent = 'You are #' + me.position + ' with ' + me.xp + ' XP';
    document.getElementById('rkLogin').style.display = 'none';
  } else {
    meEl.textContent = 'Log in to see your position.';
  }
}).catch(() => {
  document.getElementById('rkBody').innerHTML = '<tr><td colspan="4">Could not load the ranking.</td></tr>';
});
})();
