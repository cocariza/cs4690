import { applyTenantTheme, redirectToDashboard } from './common.js';

const init = (): void => {
  applyTenantTheme();
  const form = document.getElementById('signupForm') as HTMLFormElement | null;
  const errorBox = document.getElementById('signupError');
  if (!form || !errorBox) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.textContent = '';
    const username = (document.getElementById('username') as HTMLInputElement).value.trim();
    const password = (document.getElementById('password') as HTMLInputElement).value;
    const tenant = document.body.dataset.tenant ?? 'uvu';
    try {
      const res = await fetch(`/api/v1/${tenant}/auth/signup`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username, password, role: 'student' }),
      });
      const data: { user?: { role: string; tenant: string }; error?: string } = await res.json();
      if (!res.ok || !data.user) {
        errorBox.textContent = data.error ?? 'Signup failed';
        return;
      }
      redirectToDashboard(data.user.role, data.user.tenant);
    } catch (err) {
      errorBox.textContent = err instanceof Error ? err.message : 'Signup failed';
    }
  });
};

init();
