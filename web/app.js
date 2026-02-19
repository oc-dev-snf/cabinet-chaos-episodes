const owner = 'oc-dev-snf';
const repo = 'cabinet-chaos-episodes';

const episodesEl = document.getElementById('episodes');
const contentEl = document.getElementById('content');
const statusEl = document.getElementById('status');
const themeToggleEl = document.getElementById('theme-toggle');

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

async function openEpisode(file, btn) {
  document.querySelectorAll('.episode-btn').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  statusEl.textContent = `Loading ${prettifyEpisodeName(file.name)}…`;

  const bust = `${file.download_url}?t=${Date.now()}`;
  const res = await fetch(bust, { cache: 'no-store' });
  const md = await res.text();
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
