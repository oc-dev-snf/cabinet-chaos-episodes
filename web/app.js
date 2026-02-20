const owner = 'oc-dev-snf';
const repo = 'cabinet-chaos-episodes';

const episodesEl = document.getElementById('episodes');
const contentEl = document.getElementById('content');
const statusEl = document.getElementById('status');
const themeToggleEl = document.getElementById('theme-toggle');
const foiToggleEl = document.getElementById('foi-toggle');
const panicTickerEl = document.getElementById('panic-ticker');

let currentMarkdown = '';
let foiModeEnabled = (localStorage.getItem('cabinetChaos.foiMode') || 'off') === 'on';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cabinetChaos.theme', theme);
  if (themeToggleEl) {
    themeToggleEl.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  }
}

const savedTheme = localStorage.getItem('cabinetChaos.theme') || 'dark';
applyTheme(savedTheme);

themeToggleEl?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

function applyFoiMode(enabled) {
  foiModeEnabled = enabled;
  localStorage.setItem('cabinetChaos.foiMode', enabled ? 'on' : 'off');
  if (foiToggleEl) {
    foiToggleEl.textContent = `FOI mode: ${enabled ? 'On' : 'Off'}`;
  }
}

applyFoiMode(foiModeEnabled);

foiToggleEl?.addEventListener('click', () => {
  applyFoiMode(!foiModeEnabled);
  if (currentMarkdown) renderMarkdown(currentMarkdown);
});

const panicTickerMessages = [
  'ALERT: Statement v12 superseded by v13, then accidentally published as v9.',
  'URGENT: Minister due live in 90 seconds with no approved line.',
  'NOTICE: Leak under legal review. Screenshots already trending.',
  'ESCALATION: Cross-department comms conflict detected (severity: theatrical).',
  'FLASH: Spokesperson denies quote that was broadcast in 4K.',
  'ACTION: War room at capacity. Ownership still technically unclear.'
];

function rotatePanicTicker() {
  if (!panicTickerEl) return;
  const msg = panicTickerMessages[Math.floor(Math.random() * panicTickerMessages.length)];
  panicTickerEl.textContent = `PANIC TICKER • ${msg}`;
}

rotatePanicTicker();
setInterval(rotatePanicTicker, 9000);

function addFoiRedactions() {
  if (!foiModeEnabled) return;

  const targets = contentEl.querySelectorAll('p.line .dialogue, p:not(.line), li');
  targets.forEach((el) => {
    if (el.querySelector('code, pre, a')) return;

    const text = (el.textContent || '').trim();
    if (!text || text.length < 40) return;

    const words = text.split(/\s+/);
    if (words.length < 10) return;

    const redactions = Math.max(1, Math.floor(words.length / 18));
    for (let i = 0; i < redactions; i++) {
      const start = 1 + Math.floor(Math.random() * Math.max(1, words.length - 6));
      const spanLen = 2 + Math.floor(Math.random() * 4);
      for (let j = start; j < Math.min(words.length, start + spanLen); j++) {
        words[j] = `<span class="foi-redacted" title="Hover to reveal">${words[j]}</span>`;
      }
    }

    el.innerHTML = words.join(' ');
  });
}

function addDeniedStamps() {
  const candidates = Array.from(contentEl.querySelectorAll('.markdown p, .markdown li'))
    .filter((el) => {
      if (el.querySelector('h1, h2, h3, code, pre')) return false;
      const text = (el.textContent || '').trim();
      return text.length > 90;
    });

  if (!candidates.length) return;

  const stampCount = Math.max(1, Math.floor(candidates.length / 10));
  const labels = ['Denied by Spokesperson', 'Officially Disputed', 'Under Review'];

  for (let i = 0; i < stampCount; i++) {
    const idx = Math.floor(Math.random() * candidates.length);
    const el = candidates.splice(idx, 1)[0];
    if (!el) continue;

    const stamp = document.createElement('span');
    stamp.className = 'denied-stamp';
    stamp.textContent = labels[Math.floor(Math.random() * labels.length)];
    el.appendChild(stamp);
  }
}

function prettifyEpisodeName(filename) {
  const raw = filename.replace(/\.md$/, '');
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})-episode-(\d+)-(.*)$/i);
  if (!m) return raw.replace(/-/g, ' ');

  const [, y, mo, d, ep, slug] = m;
  const date = `${d}/${mo}/${y}`;
  const title = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return `Episode ${ep.padStart(3, '0')} — ${title} (${date})`;
}

async function fetchEpisodes() {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/episodes`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const files = await res.json();
  return files
    .filter((f) => f.type === 'file' && f.name.endsWith('.md'))
    .sort((a, b) => {
      const getEpisodeNumber = (name) => {
        const m = name.match(/^\d{4}-\d{2}-\d{2}-episode-(\d+)-/i);
        return m ? Number.parseInt(m[1], 10) : -1;
      };

      const epDiff = getEpisodeNumber(b.name) - getEpisodeNumber(a.name);
      if (epDiff !== 0) return epDiff;

      return b.name.localeCompare(a.name);
    });
}

function renderMarkdown(md) {
  const html = marked.parse(md, { mangle: false, headerIds: false });
  contentEl.innerHTML = DOMPurify.sanitize(html);

  // add readable transcript styling hooks for speaker/dialogue lines
  contentEl.querySelectorAll('p').forEach((p) => {
    const strong = p.querySelector('strong');
    if (!strong) return;
    const txt = (strong.textContent || '').trim();
    if (!txt.endsWith(':')) return;
    p.classList.add('line');

    const dialogue = document.createElement('span');
    dialogue.className = 'dialogue';

    let node = strong.nextSibling;
    while (node) {
      const next = node.nextSibling;
      dialogue.appendChild(node);
      node = next;
    }
    p.appendChild(dialogue);
  });

  addFoiRedactions();
  addDeniedStamps();
}

async function openEpisode(file, btn) {
  document.querySelectorAll('.episode-btn').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  statusEl.textContent = `Loading ${prettifyEpisodeName(file.name)}…`;

  const bust = `${file.download_url}?t=${Date.now()}`;
  const res = await fetch(bust, { cache: 'no-store' });
  currentMarkdown = await res.text();
  renderMarkdown(currentMarkdown);

  statusEl.textContent = prettifyEpisodeName(file.name);
}

(async () => {
  try {
    const episodes = await fetchEpisodes();
    episodesEl.innerHTML = '';

    episodes.forEach((file, idx) => {
      const btn = document.createElement('button');
      btn.className = 'episode-btn';
      btn.textContent = prettifyEpisodeName(file.name);
      btn.addEventListener('click', () => openEpisode(file, btn));
      episodesEl.appendChild(btn);
      if (idx === 0) openEpisode(file, btn);
    });

    if (!episodes.length) {
      statusEl.textContent = 'No episodes yet.';
    }
  } catch (err) {
    statusEl.textContent = `Failed to load episodes: ${err.message}`;
  }
})();
