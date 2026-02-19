const owner = 'oc-dev-snf';
const repo = 'cabinet-chaos-episodes';

const episodesEl = document.getElementById('episodes');
const contentEl = document.getElementById('content');
const statusEl = document.getElementById('status');

async function fetchEpisodes() {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/episodes`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const files = await res.json();
  return files
    .filter((f) => f.type === 'file' && f.name.endsWith('.md'))
    .sort((a, b) => b.name.localeCompare(a.name));
}

async function openEpisode(file, btn) {
  document.querySelectorAll('.episode-btn').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  statusEl.textContent = `Loading ${file.name}…`;

  const res = await fetch(file.download_url);
  const md = await res.text();
  const html = marked.parse(md, { mangle: false, headerIds: false });
  contentEl.innerHTML = DOMPurify.sanitize(html);
  statusEl.textContent = file.name;
}

(async () => {
  try {
    const episodes = await fetchEpisodes();
    episodesEl.innerHTML = '';

    episodes.forEach((file, idx) => {
      const btn = document.createElement('button');
      btn.className = 'episode-btn';
      btn.textContent = file.name.replace('.md', '').replace(/-/g, ' ');
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
