// ============================================================
// Student Logs App – Project 3
// TypeScript + jQuery + Bootstrap + Repository Pattern
// All AJAX via jQuery. All DOM manipulation via jQuery.
// ============================================================

// ============================================================
// INTERFACES / TYPES
// ============================================================

interface Course {
  id: string | number;
  display: string;
}

interface Log {
  id?: string | number;
  courseId: string | number;
  uvuId: string;
  date: string;
  text: string;
}

// ============================================================
// REPOSITORY PATTERN
// Abstracts all data-access (API calls) from UI logic.
// ============================================================

const LogRepository = {
  /**
   * Fetch all courses from the API.
   */
  getCourses(): JQuery.jqXHR<Course[]> {
    return $.get('/api/v1/courses');
  },

  /**
   * Fetch logs for a given course and UVU ID.
   */
  getLogs(courseId: string | number, uvuId: string): JQuery.jqXHR<Log[]> {
    return $.get('/api/v1/logs', { courseId, uvuId });
  },

  /**
   * Add a new log entry.
   */
  addLog(log: Log): JQuery.jqXHR<Log> {
    return $.ajax({
      url: '/api/v1/logs',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(log),
    });
  },
};

// ============================================================
// APP STATE
// ============================================================

let logsDisplayed = false;

// ============================================================
// DARK / LIGHT MODE
// Priority: 1) localStorage → 2) Browser/OS prefers-color-scheme → 3) Default light
// Bootstrap 5.3+ uses data-bs-theme on <html> for theming.
// ============================================================

function getUserPref(): string {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'unknown';
}

function getBrowserPref(): string {
  if (window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  }
  return 'unknown';
}

function getOSPref(): string {
  // OS preference is surfaced through the same matchMedia API in the browser
  if (window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  }
  return 'unknown';
}

function applyTheme(theme: string): void {
  // Bootstrap 5.3 data-bs-theme attr for native dark/light support
  $('html').attr('data-bs-theme', theme);

  if (theme === 'dark') {
    $('#themeIcon').text('🌙');
    $('#themeLabel').text('Dark');
  } else {
    $('#themeIcon').text('☀️');
    $('#themeLabel').text('Light');
  }
}

function initTheme(): void {
  const userPref    = getUserPref();
  const browserPref = getBrowserPref();
  const osPref      = getOSPref();

  console.log(`User Pref: ${userPref}`);
  console.log(`Browser Pref: ${browserPref}`);
  console.log(`OS Pref: ${osPref}`);

  let theme = 'light'; // default
  if (userPref !== 'unknown')         { theme = userPref; }
  else if (browserPref !== 'unknown') { theme = browserPref; }
  else if (osPref !== 'unknown')      { theme = osPref; }

  applyTheme(theme);
}

function toggleTheme(): void {
  const current = $('html').attr('data-bs-theme') ?? 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
}

// Listen for OS/browser dark-mode changes (extra credit)
if (window.matchMedia) {
  $(window.matchMedia('(prefers-color-scheme: dark)')).on('change', function (e: JQuery.TriggeredEvent) {
    if (getUserPref() === 'unknown') {
      const mediaEvent = e.originalEvent as MediaQueryListEvent;
      const newTheme = mediaEvent.matches ? 'dark' : 'light';
      applyTheme(newTheme);
      console.log(`Browser/OS preference changed to: ${newTheme}`);
    }
  });
}

// ============================================================
// HELPER: Show/hide help text
// ============================================================

function setHelp(msg: string): void {
  $('#help').text(msg);
}

// ============================================================
// HELPER: Update the Add Log button state
// ============================================================

function updateButtonState(): void {
  const text = ($('#logText').val() as string).trim();
  $('#addBtn').prop('disabled', !(logsDisplayed && text.length > 0));
}

// ============================================================
// AJAX: Load Courses (via Repository)
// ============================================================

function LoadCourses(): void {
  LogRepository.getCourses()
    .done((data: Course[]) => {
      console.log(data);
      let optionsHTML = "<option selected value=''>Choose Courses</option>";
      for (const item of data) {
        console.log(item);
        optionsHTML += `<option value="${item.id}">${item.display}</option>`;
      }
      console.log(optionsHTML);
      $('#course').html(optionsHTML);
    })
    .fail((err) => {
      console.error('Error loading courses:', err);
    });
}

// ============================================================
// AJAX: Load Logs (via Repository)
// ============================================================

function loadLogs(): void {
  const courseId = $('#course').val() as string;
  const uvuId    = $('#uvuId').val() as string;

  if (!courseId || uvuId.length !== 8) return;

  LogRepository.getLogs(courseId, uvuId)
    .done((logs: Log[]) => {
      $('#uvuIdDisplay').text(`Student Logs for ${uvuId}`);
      renderLogs(logs);
      logsDisplayed = true;
      updateButtonState();
      if (logs.length === 0) setHelp('No logs found for that student.');
    })
    .fail((err) => {
      console.error(err);
      setHelp('Could not load logs. Check course/UVU ID.');
    });
}

// ============================================================
// Render Logs into the list
// ============================================================

function renderLogs(logs: Log[]): void {
  const $ul = $('#logsList').empty();

  $.each(logs, (_i: number, log: Log) => {
    const $pre  = $('<pre>').addClass('mb-0 collapse show').append($('<p>').text(log.text));
    const $date = $('<small>').addClass('text-muted').text(log.date);
    const $li   = $('<li>')
      .addClass('list-group-item list-group-item-action d-flex flex-column gap-1')
      .append($date, $pre)
      .on('click', () => $pre.toggleClass('show'));

    $ul.append($li);
  });
}

// ============================================================
// Clear Logs
// ============================================================

function clearLogs(): void {
  logsDisplayed = false;
  $('#logsList').empty();
  $('#uvuIdDisplay').text('Student Logs');
  updateButtonState();
}

// ============================================================
// Event: Course dropdown changed
// ============================================================

function onCourseChange(): void {
  const courseId = $('#course').val() as string;
  clearLogs();
  setHelp('');

  if (!courseId) {
    $('#uvuIdContainer').addClass('d-none');
    $('#uvuId').val('');
    return;
  }

  $('#uvuIdContainer').removeClass('d-none');
  $('#uvuId').val('').trigger('focus');
}

// ============================================================
// Event: UVU ID input
// ============================================================

function onUvuInput(this: HTMLElement): void {
  // Digits only — use jQuery val() throughout
  const cleaned = ($(this).val() as string).replace(/\D/g, '');
  $(this).val(cleaned);

  clearLogs();
  setHelp('');

  if (cleaned.length === 8) {
    loadLogs();
  } else if (cleaned.length > 0) {
    setHelp('Enter exactly 8 digits.');
  }

  updateButtonState();
}

// ============================================================
// AJAX: Add Log (POST via Repository)
// ============================================================

function addLog(e: JQuery.SubmitEvent): void {
  e.preventDefault();

  const courseId  = $('#course').val() as string;
  const uvuId     = $('#uvuId').val() as string;
  const $textarea = $('#logText');
  const text      = ($textarea.val() as string).trim();

  if (!logsDisplayed) {
    setHelp('Load logs first (course + 8-digit UVU ID).');
    return;
  }

  if (!text) return;

  const newLog: Log = {
    courseId,
    uvuId,
    date: new Date().toLocaleString(),
    text,
  };

  LogRepository.addLog(newLog)
    .done(() => {
      $textarea.val('');
      updateButtonState();
      loadLogs(); // refresh list
    })
    .fail((err) => {
      console.error(err);
      setHelp('Network error while saving log.');
    });
}

// ============================================================
// jQuery Document Ready — replaces DOMContentLoaded
// ============================================================

$(function () {
  initTheme();

  $('#themeToggle').on('click', toggleTheme);

  LoadCourses();

  $('#course').on('change', onCourseChange);
  $('#uvuId').on('input', onUvuInput);
  $('#logText').on('input', updateButtonState);
  $('form').on('submit', addLog);
});
