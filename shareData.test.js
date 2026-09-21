const assert = require('node:assert/strict');
const { serializeSharedTasks, deserializeSharedTasks, buildShareUrl } = require('./shareData.js');

const tasks = [
  {
    id: '1',
    title: 'Fix login bug',
    description: 'Update the validation rules',
    priority: 'high',
    category: 'bug',
    dueDate: '2026-09-20',
    done: false,
  },
];

const encoded = serializeSharedTasks(tasks);
assert.equal(Array.isArray(deserializeSharedTasks(encoded)), true);
assert.deepEqual(deserializeSharedTasks(encoded), tasks);

const shareUrl = buildShareUrl(tasks, 'http://Programmer-Tasks-Manager');
assert.match(shareUrl, /^http:\/\/Programmer-Tasks-Manager\?/);
assert.equal(new URL(shareUrl).searchParams.get('share'), encoded);

console.log('share data tests passed');
