(function (global) {
  const SHARE_NAME = 'share';
  const DEFAULT_APP_URL = 'http://Programmer-Tasks-Manager';

  function toBase64Url(value) {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      return Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function fromBase64Url(value) {
    if (!value) {
      return '';
    }

    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      return Buffer.from(padded, 'base64').toString('utf8');
    }

    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function normalizeTask(task) {
    if (!task || typeof task !== 'object') {
      return null;
    }

    const title = String(task.title || '').trim();
    if (!title) {
      return null;
    }

    return {
      id: task.id || (global.crypto && typeof global.crypto.randomUUID === 'function' ? global.crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      title,
      description: String(task.description || ''),
      priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
      category: ['feature', 'bug', 'research', 'test', 'refactor'].includes(task.category) ? task.category : 'feature',
      dueDate: task.dueDate ? String(task.dueDate) : '',
      done: Boolean(task.done),
      createdAt: typeof task.createdAt === 'number' ? task.createdAt : Date.now(),
    };
  }

  function serializeSharedTasks(tasks) {
    if (!Array.isArray(tasks)) {
      return '';
    }

    const payload = tasks
      .map(normalizeTask)
      .filter(Boolean)
      .slice(0, 100);

    return toBase64Url(JSON.stringify(payload));
  }

  function deserializeSharedTasks(value) {
    if (!value || typeof value !== 'string') {
      return [];
    }

    try {
      const parsed = JSON.parse(fromBase64Url(value));
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map(normalizeTask).filter(Boolean).slice(0, 100);
    } catch {
      return [];
    }
  }

  function buildShareUrl(tasks, baseUrl) {
    const sourceUrl = baseUrl || (global.location ? global.location.href : DEFAULT_APP_URL);
    const url = new URL(sourceUrl, global.location ? global.location.href : DEFAULT_APP_URL);
    url.searchParams.set(SHARE_NAME, serializeSharedTasks(tasks));
    return url.toString();
  }

  global.ShareData = {
    SHARE_NAME,
    serializeSharedTasks,
    deserializeSharedTasks,
    buildShareUrl,
  };
})(typeof window !== 'undefined' ? window : globalThis);
