const owner = 'oc-dev-snf';
const repo = 'cabinet-chaos-episodes';

const episodesEl = document.getElementById('episodes');
const contentEl = document.getElementById('content');
const statusEl = document.getElementById('status');
const themeToggleEl = document.getElementById('theme-toggle');
const foiToggleEl = document.getElementById('foi-toggle');
const quoteRouletteEl = document.getElementById('quote-roulette');
const panicTickerEl = document.getElementById('panic-ticker');
const panicTickerTextEl = document.getElementById('panic-ticker-text');

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

function getOutrageousLines(md) {
  return md
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (l.startsWith('#') || l.startsWith('---') || l.startsWith('**Episode:**') || l.startsWith('**Title:**') || l.startsWith('**Genre:**')) return false;
      if (l === 'TODO' || l === '**END**' || l === 'END') return false;
      return l.length > 28;
    });
}

async function copyRandomQuote() {
  if (!currentMarkdown) {
    statusEl.textContent = 'Load an episode first.';
    return;
  }

  const lines = getOutrageousLines(currentMarkdown);
  if (!lines.length) {
    statusEl.textContent = 'No suitable quote found.';
    return;
  }

  const quote = lines[Math.floor(Math.random() * lines.length)]
    .replace(/^\*\*(.+?)\*\*:?\s*/, '$1: ')
    .replace(/\*\*/g, '')
    .trim();

  try {
    await navigator.clipboard.writeText(quote);
    statusEl.textContent = `Copied quote: ${quote.slice(0, 90)}${quote.length > 90 ? '…' : ''}`;
  } catch {
    statusEl.textContent = 'Clipboard blocked. Copy manually from transcript.';
  }
}

quoteRouletteEl?.addEventListener('click', copyRandomQuote);

const panicTickerMessages = [
  'ALERT: Statement v12 superseded by v13, then accidentally published as v9.',
  'URGENT: Minister due live in 90 seconds with no approved line.',
  'NOTICE: Leak under legal review. Screenshots already trending.',
  'ESCALATION: Cross-department comms conflict detected (severity: theatrical).',
  'FLASH: Spokesperson denies quote that was broadcast in 4K.',
  'ACTION: War room at capacity. Ownership still technically unclear.',
  'WARNING: Draft press line includes phrase “citizen empathy optimisation stack”.',
  'UPDATE: Three departments claim ownership; none can find the document.',
  'INCIDENT: Minister asked if policy is live. Team answered “conceptually”.',
  'NOTICE: FAQ published before policy approved. FAQ now policy-adjacent.',
  'ESCALATION: Correction to correction requires fresh correction.',
  'ALERT: Producer asking for “one simple sentence” for 38 minutes.',
  'NOTICE: Internal memo marked CONFIDENTIAL, then posted to social scheduler.',
  'ACTION: Comms lead using legal pad labelled “DO NOT SAY THIS”.',
  'INCIDENT: Hashtag now outranking actual policy title.',
  'WARNING: Background brief leaked to foreground interview.',
  'UPDATE: Risk register updated from amber to “spiritually red”.',
  'ALERT: SpAd says line is “sticky”; lawyers say line is “actionable”.',
  'NOTICE: Dashboard says sentiment neutral; comments say otherwise.',
  'ACTION: New draft line approved pending “minor existential edits”.',
  'INCIDENT: Auto-caption changed “pilot” to “riot”.',
  'WARNING: Stakeholder call moved due to “unexpected national confusion”.',
  'UPDATE: One source says pause. Another says pivot. Third says pray.',
  'ALERT: Press office declared “controlled burn”. Fire is not controlled.',
  'NOTICE: Minister asking if we can “just unpublish the internet”.',
  'ESCALATION: Broadcast slot confirmed. Facts still in procurement.',
  'ACTION: Departmental WhatsApp renamed to “War Room 17 FINAL FINAL”.',
  'INCIDENT: Internal joke quote now in external Q&A pack.',
  'WARNING: Reply-all event detected. Damage estimate pending.',
  'UPDATE: Analytics calls it engagement. Treasury calls it volatility.',
  'ALERT: Terminology harmonisation meeting entered second fiscal quarter.',
  'NOTICE: New slogan focus-grouped at 2am by three interns and a dog.',
  'ACTION: Ministerial aide requesting “fewer verbs, more certainty”.',
  'INCIDENT: Policy launch deck includes slide titled “Don’t mention this slide”.',
  'WARNING: Interim holding line became permanent doctrine by lunch.',
  'UPDATE: Number Ten requests confidence. Department requests oxygen.',
  'ALERT: Civilians using FOI mode as fact-checking tool.',
  'NOTICE: Transcript now contains four conflicting versions of events.',
  'ACTION: “No comment” accidentally sent with full comment attached.',
  'INCIDENT: Backchannel became main channel without announcement.',
  'WARNING: Clarification interpreted as confession in under 3 minutes.',
  'UPDATE: PMQ prep notes include phrase “avoid orbital metaphors”.',
  'ALERT: Printer jam now designated critical national bottleneck.',
  'NOTICE: Official spokesperson currently in “strategic tea break”.',
  'ACTION: Comms matrix expanded from 2x2 to 9x9 to “reflect complexity”.',
  'INCIDENT: Emergency briefing starts with “what did we actually announce?”.',
  'WARNING: Third-party vendor asks if this is satire. Silence follows.',
  'UPDATE: Draft line now translated into plain English by cleaner.',
  'ALERT: One minister, two scripts, zero agreement.',
  'NOTICE: New action plan called “rapid calm initiative” caused panic.',
  'ACTION: Every sentence now ends with “subject to verification”.',
  'INCIDENT: “Off the record” interpreted as “on every record”.',
  'WARNING: Committee chair smiling. Historical outcome: bad.',
  'UPDATE: Stakeholder confidence reduced to decorative value.',
  'ALERT: Broadcast producer asks, “is this definitely not performance art?”.',
  'NOTICE: Public dashboard frozen at “situation normal” since 08:12.',
  'ACTION: Team attempting to merge six truths into one statement.',
  'INCIDENT: “Minor correction” now 14 pages and an annex.',
  'WARNING: Spin saturation nearing legal threshold.',
  'UPDATE: Emergency line approved, revoked, and approved again in one minute.',
  'ALERT: Policy explained using weather metaphors. It is now storming.',
  'NOTICE: Draft marked FINAL_v3_REAL_THIS_ONE.docx detected.',
  'ACTION: Minister asking if denial can be retroactive.',
  'INCIDENT: Press line includes accidental existentialism.',
  'WARNING: Team morale currently powered by biscuits and spite.',
  'UPDATE: Strategic ambiguity downgraded to tactical nonsense.',
  'ALERT: Civil service equivalent of “we’re so back / it’s so over” observed.',
  'NOTICE: Chief of Staff requests “less chaos, same momentum”.',
  'ACTION: Someone said “quick win.” Timeline immediately doubled.'
];

const panicTrumpStyleQuotes = [
  'QUOTE: “Nobody does crisis comms better than us, maybe ever.”',
  'QUOTE: “Many people are saying this press line is tremendous, really tremendous.”',
  'QUOTE: “We had the best briefing. People cried. Big strong producers.”',
  'QUOTE: “Fake news says confusion. Wrong. It was a very stable rollout.”',
  'QUOTE: “This panic ticker? Beautiful ticker. Top-tier ticker.”',
  'QUOTE: “We inherited a total mess, now it’s the greatest mess, believe me.”',
  'QUOTE: “I know words. I have the best words. Not these words, better words.”',
  'QUOTE: “If it’s in all caps, that means leadership.”',
  'QUOTE: “They said it couldn’t be done. We did it badly and quickly.”',
  'QUOTE: “The statement was perfect. Perfect statement. Read the statement.”'
];

function rotatePanicTicker() {
  if (!panicTickerEl || !panicTickerTextEl) return;
  const useTrumpStyle = Math.random() < 0.14;
  const pool = useTrumpStyle ? panicTrumpStyleQuotes : panicTickerMessages;
  const msg = `PANIC TICKER • ${pool[Math.floor(Math.random() * pool.length)]}`;

  panicTickerTextEl.textContent = msg;

  const duration = Math.min(26, Math.max(11, Math.ceil(msg.length / 6)));
  panicTickerEl.style.setProperty('--panic-duration', `${duration}s`);

  panicTickerTextEl.classList.remove('run');
  void panicTickerTextEl.offsetWidth;
  panicTickerTextEl.classList.add('run');
}

panicTickerTextEl?.addEventListener('animationend', rotatePanicTicker);
rotatePanicTicker();

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

// changelog removed

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

      if (idx === 0) {
        const badge = document.createElement('span');
        badge.className = 'new-badge';
        badge.textContent = 'NEW';
        btn.appendChild(badge);
      }

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
