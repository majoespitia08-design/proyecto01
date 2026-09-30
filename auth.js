(() => {
'use strict';
const form = document.querySelector('form[data-auth]');
const msg = form.querySelector('.auth-msg');
const btn = form.querySelector('.auth-btn');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const mode = form.dataset.auth;
  const body = { username: form.username.value.trim(), password: form.password.value };
  msg.textContent = '';
  if (mode === 'register' && form.password2.value !== body.password){
    msg.textContent = 'Passwords do not match.'; return;
  }
  btn.disabled = true;
  try {
    const r = await fetch('/api/' + mode, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const d = await r.json();
    if (r.ok) window.location.href = '/';
    else msg.textContent = d.error || 'Something went wrong.';
  } catch (err) {
    msg.textContent = 'Could not reach the server.';
  }
  btn.disabled = false;
});
})();
