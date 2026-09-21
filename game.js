const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const world = {
  width: 2000,
  height: 1200,
};

const keys = {};
const obstacles = [];
const herbs = [];

const state = {
  player: {
    x: 180,
    y: 180,
    radius: 16,
    speed: 180,
  },
  camera: { x: 0, y: 0 },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function addObstacle(x, y, w, h, color) {
  obstacles.push({ x, y, w, h, color });
}

function addHerb(x, y) {
  herbs.push({ x, y, radius: 10, collected: false });
}

function buildWorld() {
  addObstacle(250, 180, 260, 120, '#3d6b2f');
  addObstacle(720, 320, 300, 180, '#3d6b2f');
  addObstacle(1180, 160, 240, 160, '#3d6b2f');
  addObstacle(850, 760, 320, 140, '#3d6b2f');

  for (let i = 0; i < 12; i += 1) {
    addHerb(120 + i * 130, 220 + (i % 3) * 140);
  }
}

function isBlocked(x, y, radius) {
  return obstacles.some((wall) => {
    const closestX = clamp(x, wall.x, wall.x + wall.w);
    const closestY = clamp(y, wall.y, wall.y + wall.h);
    const dx = x - closestX;
    const dy = y - closestY;
    return Math.hypot(dx, dy) < radius + 6;
  });
}

function updatePlayer() {
  const player = state.player;
  let dx = 0;
  let dy = 0;

  if (keys['w'] || keys['ArrowUp']) dy -= 1;
  if (keys['s'] || keys['ArrowDown']) dy += 1;
  if (keys['a'] || keys['ArrowLeft']) dx -= 1;
  if (keys['d'] || keys['ArrowRight']) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy) || 1;
    dx = (dx / len) * player.speed;
    dy = (dy / len) * player.speed;
  }

  const nextX = player.x + dx * (1 / 60);
  const nextY = player.y + dy * (1 / 60);

  if (!isBlocked(nextX, player.y, player.radius)) {
    player.x = clamp(nextX, player.radius, world.width - player.radius);
  }

  if (!isBlocked(player.x, nextY, player.radius)) {
    player.y = clamp(nextY, player.radius, world.height - player.radius);
  }

  state.camera.x = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  state.camera.y = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
}

function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#5e9c4b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);

  ctx.fillStyle = '#84bf63';
  ctx.fillRect(0, 0, world.width, world.height);

  for (const wall of obstacles) {
    ctx.fillStyle = wall.color;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }

  for (const herb of herbs) {
    if (herb.collected) continue;
    ctx.fillStyle = '#90ee90';
    ctx.beginPath();
    ctx.arc(herb.x, herb.y, herb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c5e2c';
    ctx.fillRect(herb.x - 2, herb.y + 8, 4, 14);
  }

  const player = state.player;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function collectHerbs() {
  for (const herb of herbs) {
    if (herb.collected) continue;
    if (distance(state.player, herb) < state.player.radius + herb.radius + 5) {
      herb.collected = true;
    }
  }
}

function update() {
  updatePlayer();
  collectHerbs();
  drawWorld();
  requestAnimationFrame(update);
}

window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

buildWorld();
update();
