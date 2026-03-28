const owner = 'oc-dev-snf';
const repo = 'cabinet-chaos-episodes';

const KNOWN_EPISODES = [
  '2026-03-19-episode-007-the-cobra-meeting-in-space.md',
  '2026-03-05-episode-006-ai-chatbot-policy-announcement-backfires.md',
  '2026-02-26-episode-005-minister-pedal-power-green-transport-gaffe.md',
  '2026-03-12-episode-004-the-briefing-that-ate-itself.md',
  '2026-03-05-episode-003-minutes-to-midnight-briefing.md',
  '2026-02-26-episode-002-quiet-part-loud.md',
  '2026-02-19-episode-001-optics-volcano.md',
].map((name) => ({
  type: 'file',
  name,
  download_url: `https://raw.githubusercontent.com/${owner}/${repo}/main/episodes/${name}`,
}));

const episodesEl = document.getElementById('episodes');
const contentEl = document.getElementById('content');
const statusEl = document.getElementById('status');
const themeToggleEl = document.getElementById('theme-toggle');
const foiToggleEl = document.getElementById('foi-toggle');
const quoteRouletteEl = document.getElementById('quote-roulette');
const shareCardEl = document.getElementById('share-card');
const chaosDialEl = document.getElementById('chaos-dial');
const chaosValueEl = document.getElementById('chaos-value');
const ambientToggleEl = document.getElementById('ambient-toggle');
const panicTickerEl = document.getElementById('panic-ticker');
const panicTickerTextEl = document.getElementById('panic-ticker-text');
const lockdownBannerEl = document.getElementById('lockdown-banner');
const pressToastEl = document.getElementById('press-toast');
const troubleMeterFillEl = document.getElementById('trouble-meter-fill');
const audioWrapEl = document.getElementById('audio-wrap');
const episodeAudioEl = document.getElementById('episode-audio');
const audioStatusEl = document.getElementById('audio-status');
const audioGenerateEl = document.getElementById('audio-generate');

let currentMarkdown = '';
let currentEpisodeTitle = '';
let currentEpisodePath = '';
let chaosLevel = Number.parseInt(localStorage.getItem('cabinetChaos.chaos') || '6', 10);
let ambientPanicEnabled = (localStorage.getItem('cabinetChaos.ambient') || 'off') === 'on';
let foiModeEnabled = (localStorage.getItem('cabinetChaos.foiMode') || 'off') === 'on';
let ttsReady = false;
let ttsInitStarted = false;
let currentSpeechId = null;

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

chaosLevel = Number.isFinite(chaosLevel) ? Math.max(0, Math.min(11, chaosLevel)) : 6;
if (chaosDialEl) chaosDialEl.value = String(chaosLevel);
if (chaosValueEl) chaosValueEl.textContent = String(chaosLevel);

function applyAmbientMode(enabled) {
  ambientPanicEnabled = enabled;
  localStorage.setItem('cabinetChaos.ambient', enabled ? 'on' : 'off');
  document.body.classList.toggle('ambient-panic', enabled);
  if (ambientToggleEl) ambientToggleEl.textContent = `Ambient: ${enabled ? 'On' : 'Off'}`;
}

applyAmbientMode(ambientPanicEnabled);
applyFoiMode(foiModeEnabled);
if (lockdownBannerEl) lockdownBannerEl.hidden = chaosLevel < 11;
panicTickerEl?.classList.toggle('chaos11', chaosLevel >= 11);

foiToggleEl?.addEventListener('click', () => {
  applyFoiMode(!foiModeEnabled);
  if (currentMarkdown) renderMarkdown(currentMarkdown);
});

chaosDialEl?.addEventListener('input', () => {
  chaosLevel = Number.parseInt(chaosDialEl.value, 10);
  localStorage.setItem('cabinetChaos.chaos', String(chaosLevel));
  if (chaosValueEl) chaosValueEl.textContent = String(chaosLevel);
  if (lockdownBannerEl) lockdownBannerEl.hidden = chaosLevel < 11;
  panicTickerEl?.classList.toggle('chaos11', chaosLevel >= 11);
  rotatePanicTicker();
  if (currentMarkdown) renderMarkdown(currentMarkdown);
});

ambientToggleEl?.addEventListener('click', () => {
  applyAmbientMode(!ambientPanicEnabled);
});

audioGenerateEl?.addEventListener('click', () => {
  generateEpisodeAudio();
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

async function copyShareCard() {
  if (!currentMarkdown || !currentEpisodeTitle) {
    statusEl.textContent = 'Load an episode first.';
    return;
  }

  const lines = getOutrageousLines(currentMarkdown);
  const quote = (lines[Math.floor(Math.random() * lines.length)] || 'Strategic confusion ongoing.')
    .replace(/^\*\*(.+?)\*\*:?\s*/, '$1: ')
    .replace(/\*\*/g, '')
    .trim();

  const url = `https://oc-dev-snf.github.io/cabinet-chaos-episodes/?ep=${encodeURIComponent(currentEpisodePath)}`;
  const text = `${currentEpisodeTitle}\n\n"${quote}"\n\n${url}`;

  try {
    await navigator.clipboard.writeText(text);
    statusEl.textContent = 'Copied share card text.';
  } catch {
    statusEl.textContent = 'Clipboard blocked. Copy manually from page.';
  }
}

shareCardEl?.addEventListener('click', copyShareCard);

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

  const baseDuration = Math.min(26, Math.max(11, Math.ceil(msg.length / 6)));
  const chaosSpeedFactor = chaosLevel >= 11 ? 2 : (1 + (chaosLevel / 11) * 0.85);
  const duration = Math.max(5, Math.round((baseDuration / chaosSpeedFactor) * 10) / 10);
  panicTickerEl.style.setProperty('--panic-duration', `${duration}s`);

  panicTickerTextEl.classList.remove('run');
  void panicTickerTextEl.offsetWidth;
  panicTickerTextEl.classList.add('run');
}

panicTickerTextEl?.addEventListener('animationend', rotatePanicTicker);
rotatePanicTicker();

const pressToastMessages = [
  'PRESS ROOM: Correction issued. Previous correction withdrawn.',
  'PRESS ROOM: Line superseded by line replacing superseded line.',
  'PRESS ROOM: Producer requests “one sentence”. Team sends twelve.',
  'PRESS ROOM: Minister asks if “off the record” is a setting.',
  'PRESS ROOM: Background brief has reached foreground conditions.',
  'PRESS ROOM: Legal has entered chat with highlighted adjectives.',
  'PRESS ROOM: Spokesperson confirms confidence in ongoing clarification.',
  'PRESS ROOM: Statement delayed due to statement about delay.',
  'PRESS ROOM: New phrase “strategic calm posture” causing alarm.',
  'PRESS ROOM: Fact-check pending, vibes-check failed.'
];

function showPressToast() {
  if (!pressToastEl) return;
  const msg = pressToastMessages[Math.floor(Math.random() * pressToastMessages.length)];
  pressToastEl.textContent = msg;
  pressToastEl.hidden = false;
  setTimeout(() => {
    if (pressToastEl) pressToastEl.hidden = true;
  }, 5200);
}

function schedulePressToast() {
  const delay = 20000 + Math.floor(Math.random() * 20001);
  setTimeout(() => {
    showPressToast();
    schedulePressToast();
  }, delay);
}

schedulePressToast();

function addFoiRedactions() {
  if (!foiModeEnabled) return;

  const wrapWord = (word) => `<span class="foi-redacted" title="Hover to reveal">${word}</span>`;
  const targets = contentEl.querySelectorAll('p.line .dialogue, p:not(.line), li');

  targets.forEach((el) => {
    if (el.querySelector('code, pre, a, br, strong')) return;

    const text = (el.textContent || '').trim();
    if (!text) return;

    const words = text.split(/\s+/);
    if (!words.length) return;

    if (chaosLevel >= 11) {
      el.innerHTML = words.map(wrapWord).join(' ');
      return;
    }

    if (words.length < 8) return;

    const densityDivisor = Math.max(7, 18 - chaosLevel);
    const redactions = Math.max(1, Math.floor(words.length / densityDivisor));

    for (let i = 0; i < redactions; i++) {
      const start = Math.floor(Math.random() * Math.max(1, words.length - 4));
      const spanLen = 2 + Math.floor(Math.random() * 4);
      for (let j = start; j < Math.min(words.length, start + spanLen); j++) {
        words[j] = wrapWord(words[j]);
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

function sortEpisodes(files) {
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

async function initFossTts() {
  if (ttsReady || ttsInitStarted) return;
  ttsInitStarted = true;

  try {
    if (!window.meSpeak) throw new Error('meSpeak library missing');
    await window.meSpeak.loadConfig('https://cdn.jsdelivr.net/npm/mespeak/mespeak_config.json');
    await window.meSpeak.loadVoice('https://cdn.jsdelivr.net/npm/mespeak/voices/en/en-rp.json');
    ttsReady = true;
    if (audioStatusEl) audioStatusEl.textContent = 'Ready. Click “Generate audio”.';
  } catch (err) {
    if (audioStatusEl) audioStatusEl.textContent = `Audio init failed: ${err.message}`;
  }
}

function markdownToSpeechText(md) {
  return md
    .split('\n')
    .map((raw) => raw.trim())
    .filter((line) => line && !line.startsWith('# ') && line !== '---')
    .map((line) => line
      .replace(/^##\s+/, '')
      .replace(/^###\s+/, '')
      .replace(/\*\*/g, '')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/^\((.*?)\)$/, 'Scene note. $1'))
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function markdownToSpeechSegments(md) {
  return md
    .split('\n')
    .map((raw) => raw.trim())
    .filter((line) => line && !line.startsWith('# ') && line !== '---')
    .map((line) => line.replace(/\*\*/g, '').replace(/\[(.*?)\]\((.*?)\)/g, '$1'))
    .map((line) => {
      const speakerMatch = line.match(/^([A-Z][A-Z\s\-']{1,40}):\s*(.*)$/);
      if (speakerMatch) {
        return {
          type: 'dialogue',
          speaker: speakerMatch[1],
          text: speakerMatch[2] || '',
        };
      }
      const sceneMatch = line.match(/^\((.*?)\)$/);
      if (sceneMatch) {
        return { type: 'scene', text: sceneMatch[1] };
      }
      return { type: 'narration', text: line.replace(/^##\s+/, '').replace(/^###\s+/, '') };
    })
    .filter((seg) => seg.text && seg.text.trim());
}

function pickBestVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const scored = voices
    .filter((v) => /en-GB|en_GB|en-US|en_US|English/i.test(`${v.lang} ${v.name}`))
    .map((v) => {
      const n = `${v.name} ${v.lang}`.toLowerCase();
      let score = 0;
      if (n.includes('en-gb') || n.includes('en_gb') || n.includes('british') || n.includes('uk')) score += 8;
      if (n.includes('male')) score += 4;
      if (n.includes('natural') || n.includes('neural') || n.includes('premium') || n.includes('enhanced')) score += 3;
      if (n.includes('google') || n.includes('microsoft')) score += 2;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score);

  return (scored[0] && scored[0].v) || voices[0];
}

function speakWithWebSpeechNatural(md) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    return false;
  }

  const segments = markdownToSpeechSegments(md);
  if (!segments.length) return false;

  window.speechSynthesis.cancel();
  const voice = pickBestVoice();

  let i = 0;
  const speakNext = () => {
    if (i >= segments.length) {
      if (audioStatusEl) audioStatusEl.textContent = 'Playback finished.';
      return;
    }

    const seg = segments[i++];
    const utterance = new SpeechSynthesisUtterance(seg.text);
    if (voice) utterance.voice = voice;

    if (seg.type === 'dialogue') {
      utterance.rate = 1.03;
      utterance.pitch = 0.82;
    } else if (seg.type === 'scene') {
      utterance.rate = 0.92;
      utterance.pitch = 0.72;
      utterance.volume = 0.92;
    } else {
      utterance.rate = 0.98;
      utterance.pitch = 0.78;
    }

    utterance.onend = () => {
      setTimeout(speakNext, seg.type === 'scene' ? 180 : 70);
    };
    utterance.onerror = () => {
      if (audioStatusEl) audioStatusEl.textContent = 'Audio playback error on this client voice engine.';
    };

    window.speechSynthesis.speak(utterance);
  };

  if (audioStatusEl) {
    const vName = voice ? `${voice.name} (${voice.lang})` : 'system default voice';
    audioStatusEl.textContent = `Playing natural voice narration (${vName}).`;
  }

  speakNext();
  return true;
}

async function generateEpisodeAudio() {
  if (!audioWrapEl || !episodeAudioEl || !audioStatusEl) return;
  if (!currentMarkdown) {
    audioStatusEl.textContent = 'Load an episode first.';
    return;
  }

  audioStatusEl.textContent = 'Generating audio…';

  // Preferred path: more natural browser voices with per-line prosody.
  if (speakWithWebSpeechNatural(currentMarkdown)) {
    return;
  }

  await initFossTts();

  const text = markdownToSpeechText(currentMarkdown);
  if (!text) {
    audioStatusEl.textContent = 'Nothing to speak for this episode.';
    return;
  }

  if (!ttsReady) {
    audioStatusEl.textContent = 'No local voice engine available on this client.';
    return;
  }

  try {
    if (currentSpeechId !== null) {
      window.meSpeak.stop(currentSpeechId);
      currentSpeechId = null;
    }

    currentSpeechId = window.meSpeak.speak(text, {
      voice: 'en-rp',
      variant: 'm3',
      speed: 165,
      pitch: 34,
      amplitude: 120,
    }, (success) => {
      if (success) {
        audioStatusEl.textContent = 'Playback finished.';
      }
      currentSpeechId = null;
    });

    audioStatusEl.textContent = 'Playing generated audio (FOSS engine).';
  } catch (err) {
    audioStatusEl.textContent = `Audio generation failed: ${err.message}`;
  }
}

function updateEpisodeAudio() {
  if (!audioWrapEl || !episodeAudioEl || !audioStatusEl) return;
  audioWrapEl.hidden = false;
  episodeAudioEl.hidden = true;
  episodeAudioEl.removeAttribute('src');
  episodeAudioEl.load();
  if (currentSpeechId !== null && window.meSpeak) {
    window.meSpeak.stop(currentSpeechId);
    currentSpeechId = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  audioStatusEl.textContent = ttsReady ? 'Ready. Click “Generate audio”.' : 'Preparing FOSS voice engine…';
  initFossTts();
}

async function fetchEpisodes() {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/episodes`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const files = await res.json();
    return sortEpisodes(files);
  } catch {
    statusEl.textContent = 'GitHub API throttled — using fallback episode feed.';
    return sortEpisodes(KNOWN_EPISODES);
  }
}

// changelog removed

function updateTroubleMeter() {
  if (!troubleMeterFillEl || !contentEl) return;

  const rect = contentEl.getBoundingClientRect();
  const viewport = window.innerHeight || 1;
  const total = rect.height + viewport;
  const progressed = Math.min(total, Math.max(0, viewport - rect.top));
  const pct = Math.max(0, Math.min(100, (progressed / total) * 100));

  troubleMeterFillEl.style.width = `${pct}%`;
}

window.addEventListener('scroll', updateTroubleMeter, { passive: true });
window.addEventListener('resize', updateTroubleMeter);

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
  updateTroubleMeter();
}

async function openEpisode(file, btn) {
  try {
    document.querySelectorAll('.episode-btn').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    currentEpisodeTitle = prettifyEpisodeName(file.name);
    currentEpisodePath = file.name;
    updateEpisodeAudio();
    statusEl.textContent = `Loading ${currentEpisodeTitle}…`;
    history.replaceState(null, '', `?ep=${encodeURIComponent(file.name)}`);

    const bust = `${file.download_url}?t=${Date.now()}`;
    let res = await fetch(bust, { cache: 'no-store' });

    if (!res.ok) {
      const rawFallback = `https://raw.githubusercontent.com/${owner}/${repo}/main/episodes/${file.name}`;
      res = await fetch(`${rawFallback}?t=${Date.now()}`, { cache: 'no-store' });
    }

    if (!res.ok) {
      throw new Error(`Failed to load episode (${res.status})`);
    }

    currentMarkdown = await res.text();
    renderMarkdown(currentMarkdown);

    statusEl.textContent = prettifyEpisodeName(file.name);
  } catch (err) {
    statusEl.textContent = `Episode load failed: ${err.message}`;
  }
}

(async () => {
  try {
    const episodes = await fetchEpisodes();

    episodesEl.innerHTML = '';

    const requested = new URLSearchParams(window.location.search).get('ep');
    let opened = false;

    episodes.forEach((file, idx) => {
      const row = document.createElement('div');
      row.className = 'episode-item';

      const btn = document.createElement('button');
      btn.className = 'episode-btn';
      btn.textContent = prettifyEpisodeName(file.name);

      const linkBtn = document.createElement('button');
      linkBtn.className = 'episode-link-btn';
      linkBtn.setAttribute('aria-label', 'Copy episode permalink');
      linkBtn.title = 'Copy episode permalink';
      linkBtn.textContent = '🔗';
      linkBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const permalink = `https://oc-dev-snf.github.io/cabinet-chaos-episodes/?ep=${encodeURIComponent(file.name)}`;
        try {
          await navigator.clipboard.writeText(permalink);
          statusEl.textContent = 'Copied episode permalink.';
        } catch {
          statusEl.textContent = 'Clipboard blocked. Copy link manually.';
        }
      });

      if (idx === 0) {
        const badge = document.createElement('span');
        badge.className = 'new-badge';
        badge.textContent = 'NEW';
        btn.appendChild(badge);
      }

      btn.addEventListener('click', () => openEpisode(file, btn));
      row.appendChild(btn);
      row.appendChild(linkBtn);
      episodesEl.appendChild(row);

      if (!opened && requested && file.name === requested) {
        openEpisode(file, btn);
        opened = true;
      } else if (!opened && !requested && idx === 0) {
        openEpisode(file, btn);
        opened = true;
      }
    });

    if (!opened && episodes.length) {
      const firstBtn = episodesEl.querySelector('.episode-btn');
      openEpisode(episodes[0], firstBtn);
    }

    if (!episodes.length) {
      statusEl.textContent = 'No episodes yet.';
    }
  } catch (err) {
    statusEl.textContent = `Failed to load episodes: ${err.message}`;
  }
})();
