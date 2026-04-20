const detectTenant = (): 'uvu' | 'uofu' => {
  const first = location.pathname.split('/').filter(Boolean)[0];
  return first === 'uofu' ? 'uofu' : 'uvu';
};

const applyTenantTheme = (): void => {
  const tenant = detectTenant();
  document.body.dataset.tenant = tenant;
  document.title = `${tenant.toUpperCase()} ${document.title}`;
  const logo = document.querySelector<HTMLImageElement>('[data-tenant-logo]');
  if (logo) {
    logo.src =
      tenant === 'uvu'
        ? 'https://www.uvu.edu/_common/images/uvu-mono.svg'
        : 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Utah_Utes_-_U_logo.svg/1024px-Utah_Utes_-_U_logo.svg.png';
    logo.alt = tenant === 'uvu' ? 'Utah Valley University' : 'University of Utah';
  }
  const brandLabel = document.querySelector<HTMLElement>('[data-tenant-name]');
  if (brandLabel) {
    brandLabel.textContent = tenant === 'uvu' ? 'UVU' : 'UofU';
  }
};

const apiBase = (): string => `/api/v1/${detectTenant()}`;

const apiFetch = async <T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const res = await fetch(`${apiBase()}${path}`, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}));
    const redirect = (body as { redirect?: string }).redirect ?? `/${detectTenant()}/login.html`;
    location.href = redirect;
    throw new Error('Unauthorized');
  }
  const text = await res.text();
  const parsed: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (parsed as { error?: string })?.error ?? res.statusText;
    throw new Error(msg);
  }
  return parsed as T;
};

const getCurrentUser = async (): Promise<{
  userId: string;
  username: string;
  role: 'admin' | 'teacher' | 'ta' | 'student';
  tenant: 'uvu' | 'uofu';
} | null> => {
  try {
    const r = await apiFetch<{ user: { userId: string; username: string; role: 'admin' | 'teacher' | 'ta' | 'student'; tenant: 'uvu' | 'uofu' } }>('/auth/me');
    return r.user;
  } catch {
    return null;
  }
};

const logout = async (): Promise<void> => {
  await apiFetch('/auth/logout', { method: 'POST' });
  location.href = `/${detectTenant()}/login.html`;
};

const redirectToDashboard = (role: string, tenant: string): void => {
  const map: Record<string, string> = {
    admin: 'admin.html',
    teacher: 'teacher.html',
    ta: 'ta.html',
    student: 'student.html',
  };
  location.href = `/${tenant}/${map[role] ?? 'login.html'}`;
};

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[ch] ?? ch;
  });

export {
  detectTenant,
  applyTenantTheme,
  apiBase,
  apiFetch,
  getCurrentUser,
  logout,
  redirectToDashboard,
  escapeHtml,
};
