import { applyTenantTheme, detectTenant, redirectToDashboard } from './common.js';

const init = async (): Promise<void> => {
  applyTenantTheme();

  const form = document.getElementById('loginForm') as HTMLFormElement | null;
  const errorBox = document.getElementById('loginError');
  if (!form || !errorBox) return;

  try {
    const res = await fetch(`/api/v1/${detectTenant()}/auth/me`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const me: { user?: { role: string; tenant: string } } = await res.json();
      if (me?.user) {
        redirectToDashboard(me.user.role, me.user.tenant);
        return;
      }
    }
  } catch {}

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.textContent = '';
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const body = JSON.stringify({
      username: usernameInput.value.trim(),
      password: passwordInput.value,
    });
    try {
      const res = await fetch(`/api/v1/${document.body.dataset.tenant}/auth/login`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body,
      });
      const data: { user?: { role: string; tenant: string }; error?: string } = await res.json();
      if (!res.ok || !data.user) {
        errorBox.textContent = data.error ?? 'Login failed';
        return;
      }
      redirectToDashboard(data.user.role, data.user.tenant);
    } catch (err) {
      errorBox.textContent = err instanceof Error ? err.message : 'Login failed';
    }
  });
};

init();
