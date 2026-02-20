const owner = 'oc-dev-snf';
const repo = 'cabinet-chaos-episodes';

const episodesEl = document.getElementById('episodes');
const contentEl = document.getElementById('content');
const statusEl = document.getElementById('status');
const themeToggleEl = document.getElementById('theme-toggle');
const foiToggleEl = document.getElementById('foi-toggle');
const panicBriefingEl = document.getElementById('panic-briefing');
const panicLeakEl = document.getElementById('panic-leak');
const panicBannerEl = document.getElementById('panic-banner');

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

function triggerPanic(mode) {
  const messages = mode === 'briefing'
    ? [
        'PANIC MODE: Briefing lines conflict across 3 departments.',
        'PANIC MODE: Minister live in 2 mins. No agreed line.',
        'PANIC MODE: Statement v9 accidentally emailed to press.'
      ]
    : [
        'PANIC MODE: Internal memo leaked. Legal reviewing screenshots.',
        'PANIC MODE: Off-record quote now trending nationally.',
        'PANIC MODE: Comms war room escalated to amber+'
      ];

  const msg = messages[Math.floor(Math.random() * messages.length)];
  if (panicBannerEl) {
    panicBannerEl.textContent = msg;
    panicBannerEl.hidden = false;
    setTimeout(() => {
      panicBannerEl.hidden = true;
      panicBannerEl.textContent = '';
    }, 7000);
  }

  statusEl.textContent = msg;
  applyFoiMode(true);
  if (currentMarkdown) renderMarkdown(currentMarkdown);
}

panicBriefingEl?.addEventListener('click', () => triggerPanic('briefing'));
panicLeakEl?.addEventListener('click', () => triggerPanic('leak'));

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
