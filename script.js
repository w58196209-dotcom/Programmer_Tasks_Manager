const STORAGE_KEY = 'codeflow-tasks-v1';

const defaultTasks = [];

const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const searchInput = document.getElementById('searchInput');
const filterButtons = [...document.querySelectorAll('.filter-btn')];

const totalTasksEl = document.getElementById('totalTasks');
const doneTasksEl = document.getElementById('doneTasks');
const pendingTasksEl = document.getElementById('pendingTasks');
const progressValueEl = document.getElementById('progressValue');
const themeToggleBtn = document.getElementById('themeToggle');
const shareDataBtn = document.getElementById('shareDataBtn');
const clearDataBtn = document.getElementById('clearDataBtn');

let tasks = loadTasks();
let activeFilter = 'all';
let currentLanguage = window.I18N?.defaultLanguage || 'ar';

const translations = window.I18N || {};

function t(key) {
  const langPack = translations[currentLanguage] || translations.ar || {};
  return langPack[key] || (translations.ar && translations.ar[key]) || key;
}

function applyLanguage(language) {
  const langPack = translations[language] || translations.ar || {};
  currentLanguage = language;

  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (langPack[key]) {
      element.textContent = langPack[key];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (langPack[key]) {
      element.placeholder = langPack[key];
    }
  });

  document.querySelectorAll('select option[data-i18n]').forEach((option) => {
    const key = option.dataset.i18n;
    if (langPack[key]) {
      option.textContent = langPack[key];
    }
  });

  if (languageSelect) {
    languageSelect.value = language;
  }

  const filterLabels = {
    all: langPack.filterAll || 'الكل',
    pending: langPack.filterPending || 'قيد التنفيذ',
    done: langPack.filterDone || 'مكتملة',
    high: langPack.filterHigh || 'أولوية عالية',
  };

  document.querySelectorAll('.filter-btn').forEach((button) => {
    const filter = button.dataset.filter;
    if (filterLabels[filter]) {
      button.textContent = filterLabels[filter];
    }
  });

  if (typeof renderTasks === 'function') {
    renderTasks();
  }
}

languageSelect?.addEventListener('change', (event) => {
  applyLanguage(event.target.value);
});

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  themeToggleBtn?.setAttribute('aria-pressed', String(isDark));

  const toggleIcon = themeToggleBtn?.querySelector('.toggle-icon');
  if (toggleIcon) {
    toggleIcon.textContent = isDark ? '🌙' : '☀️';
  }

  localStorage.setItem('task-app-theme', theme);
}

themeToggleBtn?.addEventListener('click', () => {
  const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  applyTheme(nextTheme);
});

const savedTheme = localStorage.getItem('task-app-theme') || 'light';
applyTheme(savedTheme);
applyLanguage(currentLanguage);

function getRelativeDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved === null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTasks));
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getSharedTasksFromUrl() {
  if (!window.ShareData || typeof window.ShareData.deserializeSharedTasks !== 'function') {
    return [];
  }

  const params = new URLSearchParams(window.location.search);
  const shared = params.get(window.ShareData.SHARE_NAME);
  return shared ? window.ShareData.deserializeSharedTasks(shared) : [];
}

function clearSharedDataParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete(window.ShareData?.SHARE_NAME || 'share');
  window.history.replaceState({}, '', url.toString());
}

async function copyShareLink(link) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link);
      window.alert(t('shareLinkCopied'));
      return;
    }

    const helper = document.createElement('input');
    helper.value = link;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
    window.alert(t('shareLinkCopied'));
  } catch {
    window.prompt(t('shareLinkLabel'), link);
  }
}

function shareTasks() {
  if (!tasks.length) {
    window.alert(t('shareNoTasks'));
    return;
  }

  const shareUrl = window.ShareData.buildShareUrl(tasks, window.location.href);

  if (navigator.share) {
    navigator.share({
      title: document.title,
      text: t('shareDataBtn'),
      url: shareUrl,
    }).catch(() => copyShareLink(shareUrl));
    return;
  }

  copyShareLink(shareUrl);
}

function renderTasks() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm) ||
      task.description.toLowerCase().includes(searchTerm) ||
      task.category.toLowerCase().includes(searchTerm);

    const matchesFilter =
      activeFilter === 'all'
        ? true
        : activeFilter === 'pending'
          ? !task.done
          : activeFilter === 'done'
            ? task.done
            : task.priority === activeFilter;

    return matchesSearch && matchesFilter;
  });

  filteredTasks.sort((a, b) => Number(a.done) - Number(b.done) || new Date(a.dueDate || 0) - new Date(b.dueDate || 0));

  taskList.innerHTML = '';

  if (!filteredTasks.length) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div>
          <h3>${t('emptyStateTitle')}</h3>
          <p>${t('emptyStateText')}</p>
        </div>
      </div>
    `;
    updateStats();
    return;
  }

  filteredTasks.forEach((task) => {
    const item = document.createElement('article');
    item.className = `task-item ${task.done ? 'done' : ''}`;
    item.innerHTML = `
      <button class="check-box" type="button" data-action="toggle" data-id="${task.id}" aria-label="${t('toggleAria')}"></button>
      <div class="task-main">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-description">${escapeHtml(task.description || t('noDescription'))}</div>
        <div class="task-meta">
          <span class="badge ${task.priority}">${priorityLabel(task.priority)}</span>
          <span class="badge ${task.category}">${categoryLabel(task.category)}</span>
          <span class="task-date">${formatDate(task.dueDate)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn" type="button" data-action="toggle" data-id="${task.id}">${task.done ? t('reopenTask') : t('completeTask')}</button>
        <button class="action-btn delete" type="button" data-action="delete" data-id="${task.id}">${t('deleteTask')}</button>
      </div>
    `;

    taskList.appendChild(item);
  });

  updateStats();
}

function updateStats() {
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  const pending = total - done;
  const progress = total ? Math.round((done / total) * 100) : 0;

  totalTasksEl.textContent = total;
  doneTasksEl.textContent = done;
  pendingTasksEl.textContent = pending;
  progressValueEl.textContent = `${progress}%`;
}

function priorityLabel(priority) {
  const labels = {
    high: t('priorityHigh'),
    medium: t('priorityMedium'),
    low: t('priorityLow'),
  };
  return labels[priority] || t('priorityMedium');
}

function categoryLabel(category) {
  const labels = {
    feature: t('categoryFeature'),
    bug: t('categoryBug'),
    research: t('categoryResearch'),
    test: t('categoryTest'),
    refactor: t('categoryRefactor'),
  };
  return labels[category] || (currentLanguage === 'en' ? 'Other' : 'أخرى');
}

function formatDate(dateString) {
  if (!dateString) {
    return t('noDate');
  }

  const date = new Date(`${dateString}T00:00:00`);
  const localeMap = {
    ar: 'ar-EG',
    en: 'en-US',
    fr: 'fr-FR',
    de: 'de-DE',
    ko: 'ko-KR',
    ru: 'ru-RU',
    pt: 'pt-BR',
    es: 'es-ES',
    hi: 'hi-IN',
    tr: 'tr-TR',
    it: 'it-IT',
    ja: 'ja-JP',
    zh: 'zh-CN',
  };

  const locale = localeMap[currentLanguage] || 'ar-EG';
  return isNaN(date.getTime()) ? t('noDate') : date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function addTask(event) {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const title = (formData.get('title') || '').toString().trim();
  const description = (formData.get('description') || '').toString().trim();
  const priority = (formData.get('priority') || 'medium').toString();
  const category = (formData.get('category') || 'feature').toString();
  const dueDate = (formData.get('dueDate') || '').toString();

  if (!title) {
    return;
  }

  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    description,
    priority,
    category,
    dueDate,
    done: false,
    createdAt: Date.now(),
  });

  saveTasks();
  renderTasks();
  taskForm.reset();
  document.getElementById('priority').value = 'medium';
  document.getElementById('category').value = 'feature';
}

function toggleTask(taskId) {
  tasks = tasks.map((task) =>
    task.id === taskId ? { ...task, done: !task.done } : task,
  );
  saveTasks();
  renderTasks();
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderTasks();
}

function clearAllTasks() {
  const confirmed = window.confirm(t('clearDataConfirm'));
  if (!confirmed) {
    return;
  }

  tasks = [];
  saveTasks();
  renderTasks();
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    renderTasks();
  });
});

searchInput.addEventListener('input', renderTasks);
shareDataBtn?.addEventListener('click', shareTasks);
clearDataBtn?.addEventListener('click', clearAllTasks);

taskForm.addEventListener('submit', addTask);

const sharedTasks = getSharedTasksFromUrl();
if (sharedTasks.length) {
  tasks = sharedTasks;
  saveTasks();
  clearSharedDataParam();
}

if (window.ShareData && typeof window.ShareData.SHARE_NAME === 'string') {
  const params = new URLSearchParams(window.location.search);
  if (params.has(window.ShareData.SHARE_NAME)) {
    clearSharedDataParam();
  }
}

taskList.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const { action, id } = target.dataset;
  if (action === 'toggle') toggleTask(id);
  if (action === 'delete') deleteTask(id);
});

renderTasks();
