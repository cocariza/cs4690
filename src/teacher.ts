import { applyTenantTheme, apiFetch, getCurrentUser, logout, escapeHtml } from './common.js';

interface UserDto { id: string; username: string; role: string }
interface CourseDto { id: string; display: string; teacherId?: string; studentIds: string[] }
interface LogDto { courseId: string; uvuId: string; date: string; text: string }

const renderCourses = (courses: CourseDto[], mountId: string): void => {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  if (courses.length === 0) {
    mount.innerHTML = '<li class="list-group-item text-muted">No courses yet.</li>';
    return;
  }
  mount.innerHTML = courses
    .map(
      (c) =>
        `<li class="list-group-item d-flex justify-content-between"><span>${escapeHtml(c.display)}</span><span class="text-muted">${(c.studentIds ?? []).length} students</span></li>`
    )
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
  if (!me || me.role !== 'teacher') {
    location.href = `/${document.body.dataset.tenant}/login.html`;
    return;
  }
  const who = document.getElementById('whoami');
  if (who) who.textContent = `${me.username} (teacher)`;
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  const refreshAll = async (): Promise<void> => {
    const [courses, students] = await Promise.all([
      apiFetch<CourseDto[]>('/courses'),
      apiFetch<UserDto[]>('/users?role=student'),
    ]);
    renderCourses(courses, 'myCourses');
    populate('enrollCourse', courses.map((c) => ({ value: c.id, label: c.display })), false);
    populate('enrollStudent', students.map((s) => ({ value: s.id, label: s.username })), false);
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

  await refreshAll();

  document.getElementById('createCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = (document.getElementById('courseId') as HTMLInputElement).value.trim();
    const display = (document.getElementById('courseDisplay') as HTMLInputElement).value.trim();
    const msg = document.getElementById('createCourseMsg');
    try {
      await apiFetch('/courses', { method: 'POST', body: JSON.stringify({ id, display }) });
      if (msg) msg.textContent = `Created ${id}`;
      (e.target as HTMLFormElement).reset();
      await refreshAll();
    } catch (err) {
      if (msg) msg.textContent = err instanceof Error ? err.message : 'Create failed';
    }
  });

  document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('newUsername') as HTMLInputElement).value.trim();
    const password = (document.getElementById('newPassword') as HTMLInputElement).value;
    const role = (document.getElementById('newRole') as HTMLSelectElement).value;
    const msg = document.getElementById('createUserMsg');
    try {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify({ username, password, role }) });
      if (msg) msg.textContent = `Created ${role} '${username}'`;
      (e.target as HTMLFormElement).reset();
      await refreshAll();
    } catch (err) {
      if (msg) msg.textContent = err instanceof Error ? err.message : 'Create failed';
    }
  });

  document.getElementById('enrollForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const courseId = (document.getElementById('enrollCourse') as HTMLSelectElement).value;
    const studentId = (document.getElementById('enrollStudent') as HTMLSelectElement).value;
    const msg = document.getElementById('enrollMsg');
    if (!courseId || !studentId) {
      if (msg) msg.textContent = 'Choose a course and a student';
      return;
    }
    try {
      await apiFetch(`/courses/${encodeURIComponent(courseId)}/add-student`, {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      });
      if (msg) msg.textContent = 'Student added';
      await refreshAll();
    } catch (err) {
      if (msg) msg.textContent = err instanceof Error ? err.message : 'Enroll failed';
    }
  });

  document.getElementById('refreshLogs')?.addEventListener('click', (e) => {
    e.preventDefault();
    loadLogs();
  });
};

init();
