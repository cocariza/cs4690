import { applyTenantTheme, apiFetch, getCurrentUser, logout, escapeHtml } from './common.js';

interface CourseDto { id: string; display: string; studentIds: string[] }
interface LogDto { courseId: string; uvuId: string; date: string; text: string }

const renderCourses = (courses: CourseDto[]): void => {
  const mount = document.getElementById('myCourses');
  if (!mount) return;
  if (courses.length === 0) {
    mount.innerHTML = '<li class="list-group-item text-muted">You are not enrolled in any courses yet.</li>';
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
    list.innerHTML = '<li class="list-group-item text-muted">No logs for this course yet.</li>';
    return;
  }
  list.innerHTML = logs
    .map(
      (l) =>
        `<li class="list-group-item log-item"><div class="small text-muted">${escapeHtml(new Date(l.date).toLocaleString())}</div><div>${escapeHtml(l.text)}</div></li>`
    )
    .join('');
};

const populate = (id: string, opts: Array<{ value: string; label: string }>, keepFirst = false): void => {
  const sel = document.getElementById(id) as HTMLSelectElement | null;
  if (!sel) return;
  const first = keepFirst ? sel.querySelector('option')?.outerHTML ?? '' : '';
  sel.innerHTML = first + opts.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
};

const init = async (): Promise<void> => {
  applyTenantTheme();
  const me = await getCurrentUser();
  if (!me || me.role !== 'student') {
    location.href = `/${document.body.dataset.tenant}/login.html`;
    return;
  }
  const who = document.getElementById('whoami');
  if (who) who.textContent = `${me.username} (student)`;
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  const refresh = async (): Promise<void> => {
    const [myCourses, allCourses] = await Promise.all([
      apiFetch<CourseDto[]>('/courses'),
      apiFetch<CourseDto[]>('/courses/all'),
    ]);
    renderCourses(myCourses);
    const myIds = new Set(myCourses.map((c) => c.id));
    const notEnrolled = allCourses.filter((c) => !myIds.has(c.id));
    populate(
      'enrollCourse',
      notEnrolled.length > 0
        ? notEnrolled.map((c) => ({ value: c.id, label: c.display }))
        : [{ value: '', label: 'You are enrolled in all available courses' }]
    );
    populate('logCourse', myCourses.map((c) => ({ value: c.id, label: c.display })));
    await loadLogs();
  };

  const loadLogs = async (): Promise<void> => {
    const courseId = (document.getElementById('logCourse') as HTMLSelectElement).value;
    if (!courseId) {
      renderLogs([]);
      return;
    }
    const qs = new URLSearchParams({ courseId, uvuId: me.username });
    const logs = await apiFetch<LogDto[]>(`/logs?${qs.toString()}`);
    renderLogs(logs);
  };

  document.getElementById('logCourse')?.addEventListener('change', loadLogs);

  document.getElementById('enrollForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const courseId = (document.getElementById('enrollCourse') as HTMLSelectElement).value;
    const msg = document.getElementById('enrollMsg');
    if (!courseId) {
      if (msg) msg.textContent = 'Select a course';
      return;
    }
    try {
      await apiFetch(`/courses/${encodeURIComponent(courseId)}/enroll`, { method: 'POST', body: '{}' });
      if (msg) msg.textContent = `Enrolled in ${courseId}`;
      await refresh();
    } catch (err) {
      if (msg) msg.textContent = err instanceof Error ? err.message : 'Enroll failed';
    }
  });

  document.getElementById('addLogForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const courseId = (document.getElementById('logCourse') as HTMLSelectElement).value;
    const text = (document.getElementById('logText') as HTMLTextAreaElement).value.trim();
    const msg = document.getElementById('addLogMsg');
    if (!courseId || !text) {
      if (msg) msg.textContent = 'Choose a course and write a log';
      return;
    }
    try {
      await apiFetch('/logs', {
        method: 'POST',
        body: JSON.stringify({ courseId, uvuId: me.username, text }),
      });
      (document.getElementById('logText') as HTMLTextAreaElement).value = '';
      if (msg) msg.textContent = 'Log added';
      await loadLogs();
    } catch (err) {
      if (msg) msg.textContent = err instanceof Error ? err.message : 'Add failed';
    }
  });

  await refresh();
};

init();
