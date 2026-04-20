import { applyTenantTheme, apiFetch, getCurrentUser, logout, escapeHtml } from './common.js';

interface CourseDto { id: string; display: string; studentIds: string[] }
interface LogDto { courseId: string; uvuId: string; date: string; text: string }

const renderCourses = (courses: CourseDto[]): void => {
  const mount = document.getElementById('myCourses');
  if (!mount) return;
  if (courses.length === 0) {
    mount.innerHTML = '<li class="list-group-item text-muted">No courses assigned.</li>';
    return;
  }
  mount.innerHTML = courses
    .map((c) => `<li class="list-group-item">${escapeHtml(c.display)}</li>`)
    .join('');
};

const renderLogs = (logs: LogDto[]): void => {
  const list = document.getElementById('logsList');
  if (!list) return;
  if (logs.length === 0) {
    list.innerHTML = '<li class="list-group-item text-muted">No logs.</li>';
    return;
  }
  list.innerHTML = logs
    .map(
      (l) =>
        `<li class="list-group-item log-item"><div class="d-flex justify-content-between small text-muted"><span>${escapeHtml(l.courseId)} / ${escapeHtml(l.uvuId)}</span><span>${escapeHtml(new Date(l.date).toLocaleString())}</span></div><div>${escapeHtml(l.text)}</div></li>`
    )
    .join('');
};

const populate = (id: string, opts: Array<{ value: string; label: string }>, keepFirst = true): void => {
  const sel = document.getElementById(id) as HTMLSelectElement | null;
  if (!sel) return;
  const first = keepFirst ? sel.querySelector('option')?.outerHTML ?? '' : '';
  sel.innerHTML = first + opts.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
};

const init = async (): Promise<void> => {
  applyTenantTheme();
  const me = await getCurrentUser();
  if (!me || me.role !== 'ta') {
    location.href = `/${document.body.dataset.tenant}/login.html`;
    return;
  }
  const who = document.getElementById('whoami');
  if (who) who.textContent = `${me.username} (TA)`;
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  const refresh = async (): Promise<void> => {
    const courses = await apiFetch<CourseDto[]>('/courses');
    renderCourses(courses);
    populate('logCourseFilter', courses.map((c) => ({ value: c.id, label: c.display })));
    await loadLogs();
  };

  const loadLogs = async (): Promise<void> => {
    const courseId = (document.getElementById('logCourseFilter') as HTMLSelectElement).value;
    const qs = new URLSearchParams();
    if (courseId) qs.set('courseId', courseId);
    const logs = await apiFetch<LogDto[]>(`/logs?${qs.toString()}`);
    renderLogs(logs);
  };

  document.getElementById('createStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('newUsername') as HTMLInputElement).value.trim();
    const password = (document.getElementById('newPassword') as HTMLInputElement).value;
    const msg = document.getElementById('createStudentMsg');
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, role: 'student' }),
      });
      if (msg) msg.textContent = `Created student '${username}'`;
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      if (msg) msg.textContent = err instanceof Error ? err.message : 'Create failed';
    }
  });

  document.getElementById('refreshLogs')?.addEventListener('click', (e) => {
    e.preventDefault();
    loadLogs();
  });

  await refresh();
};

init();
