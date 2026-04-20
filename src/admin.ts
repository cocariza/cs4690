import { applyTenantTheme, apiFetch, getCurrentUser, logout, escapeHtml } from './common.js';

interface UserDto { id: string; username: string; role: string; tenant: string }
interface CourseDto { id: string; display: string; teacherId?: string; studentIds: string[] }
interface LogDto { courseId: string; uvuId: string; date: string; text: string }

const renderUsers = (users: UserDto[]): void => {
  const tbody = document.getElementById('usersTable');
  if (!tbody) return;
  tbody.innerHTML = users
    .map((u) => `<tr><td>${escapeHtml(u.username)}</td><td><span class="badge badge-tenant">${escapeHtml(u.role)}</span></td></tr>`)
    .join('');
};

const renderCourses = (courses: CourseDto[]): void => {
  const list = document.getElementById('coursesList');
  if (!list) return;
  list.innerHTML = courses
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
    list.innerHTML = '<li class="list-group-item text-muted">No logs match.</li>';
    return;
  }
  list.innerHTML = logs
    .map(
      (l) =>
        `<li class="list-group-item log-item"><div class="d-flex justify-content-between small text-muted"><span>${escapeHtml(l.courseId)} / ${escapeHtml(l.uvuId)}</span><span>${escapeHtml(new Date(l.date).toLocaleString())}</span></div><div>${escapeHtml(l.text)}</div></li>`
    )
    .join('');
};

const populateSelect = (id: string, items: Array<{ value: string; label: string }>, keepFirst = true): void => {
  const sel = document.getElementById(id) as HTMLSelectElement | null;
  if (!sel) return;
  const first = keepFirst ? sel.querySelector('option')?.outerHTML ?? '' : '';
  sel.innerHTML = first + items.map((i) => `<option value="${escapeHtml(i.value)}">${escapeHtml(i.label)}</option>`).join('');
};

const loadUsers = async (): Promise<UserDto[]> => {
  const users = await apiFetch<UserDto[]>('/users');
  renderUsers(users);
  const teachers = users.filter((u) => u.role === 'teacher');
  populateSelect(
    'courseTeacher',
    teachers.map((t) => ({ value: t.id, label: `${t.username}` }))
  );
  return users;
};

const loadCourses = async (): Promise<CourseDto[]> => {
  const courses = await apiFetch<CourseDto[]>('/courses/all');
  renderCourses(courses);
  populateSelect(
    'logCourseFilter',
    courses.map((c) => ({ value: c.id, label: c.display }))
  );
  return courses;
};

const loadLogs = async (): Promise<void> => {
  const courseId = (document.getElementById('logCourseFilter') as HTMLSelectElement).value;
  const uvuId = (document.getElementById('logUvuFilter') as HTMLInputElement).value.trim();
  const qs = new URLSearchParams();
  if (courseId) qs.set('courseId', courseId);
  if (uvuId) qs.set('uvuId', uvuId);
  const logs = await apiFetch<LogDto[]>(`/logs?${qs.toString()}`);
  renderLogs(logs);
};

const wireTabs = (): void => {
  document.querySelectorAll<HTMLAnchorElement>('#adminTabs [data-tab]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('#adminTabs .nav-link').forEach((a) => a.classList.remove('active'));
      link.classList.add('active');
      ['users', 'courses', 'logs'].forEach((t) => {
        const sec = document.getElementById(`tab-${t}`);
        if (sec) sec.hidden = t !== tab;
      });
    });
  });
};

const init = async (): Promise<void> => {
  applyTenantTheme();
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') {
    location.href = `/${document.body.dataset.tenant}/login.html`;
    return;
  }
  const who = document.getElementById('whoami');
  if (who) who.textContent = `${me.username} (${me.role})`;
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  wireTabs();

  await loadUsers();
  await loadCourses();
  await loadLogs();

  const userForm = document.getElementById('createUserForm') as HTMLFormElement;
  const userMsg = document.getElementById('createUserMsg');
  userForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('newUsername') as HTMLInputElement).value.trim();
    const password = (document.getElementById('newPassword') as HTMLInputElement).value;
    const role = (document.getElementById('newRole') as HTMLSelectElement).value;
    try {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify({ username, password, role }) });
      if (userMsg) userMsg.textContent = `Created ${role} '${username}'`;
      userForm.reset();
      await loadUsers();
    } catch (err) {
      if (userMsg) userMsg.textContent = err instanceof Error ? err.message : 'Create failed';
    }
  });

  const courseForm = document.getElementById('createCourseForm') as HTMLFormElement;
  const courseMsg = document.getElementById('createCourseMsg');
  courseForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = (document.getElementById('courseId') as HTMLInputElement).value.trim();
    const display = (document.getElementById('courseDisplay') as HTMLInputElement).value.trim();
    const teacherId = (document.getElementById('courseTeacher') as HTMLSelectElement).value || undefined;
    try {
      await apiFetch('/courses', { method: 'POST', body: JSON.stringify({ id, display, teacherId }) });
      if (courseMsg) courseMsg.textContent = `Created course ${id}`;
      courseForm.reset();
      await loadCourses();
    } catch (err) {
      if (courseMsg) courseMsg.textContent = err instanceof Error ? err.message : 'Create failed';
    }
  });

  document.getElementById('applyFilters')?.addEventListener('click', (e) => {
    e.preventDefault();
    loadLogs();
  });
};

init();
