// ================= Particle background =================
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function makeParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height + canvas.height * 0.2,
      r: Math.random() * 1.6 + 0.4,
      speed: Math.random() * 0.35 + 0.08,
      drift: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.15,
      twinkle: Math.random() * 0.02 + 0.005
    };
  }

  const COUNT = 90;
  for (let i = 0; i < COUNT; i++) particles.push(makeParticle());

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.y -= p.speed;
      p.x += p.drift;
      p.alpha += (Math.random() - 0.5) * p.twinkle;
      if (p.alpha < 0.08) p.alpha = 0.08;
      if (p.alpha > 0.7) p.alpha = 0.7;

      if (p.y < -10) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      grad.addColorStop(0, `rgba(232,181,89,${p.alpha})`);
      grad.addColorStop(1, 'rgba(232,181,89,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,210,122,${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

// ================= Elements =================
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const heroSearchBtn = document.getElementById('heroSearchBtn');
const resultsList = document.getElementById('resultsList');
const searchHint = document.getElementById('searchHint');
const libraryList = document.getElementById('libraryList');
const libraryHint = document.getElementById('libraryHint');
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

const lyricsSongTitle = document.getElementById('lyricsSongTitle');
const lyricsBody = document.getElementById('lyricsBody');

const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const seekBar = document.getElementById('seekBar');
const curTime = document.getElementById('curTime');
const durTime = document.getElementById('durTime');
const nowTitle = document.getElementById('nowTitle');
const nowChannel = document.getElementById('nowChannel');
const nowThumb = document.getElementById('nowThumb');

let currentLibrary = [];

// ================= Tabs =================
function activateTab(tabName) {
  navItems.forEach((n) => n.classList.toggle('active', n.dataset.tab === tabName));
  views.forEach((v) => v.classList.remove('active'));
  document.getElementById(tabName + 'View').classList.add('active');
  if (tabName === 'library') loadLibrary();
}

navItems.forEach((item) => {
  item.addEventListener('click', () => activateTab(item.dataset.tab));
});

heroSearchBtn.addEventListener('click', () => {
  activateTab('search');
  searchInput.focus();
});

// ================= Search =================
searchBtn.addEventListener('click', runSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });

async function runSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  activateTab('search');
  searchHint.textContent = 'Searching...';
  resultsList.innerHTML = '';
  const results = await window.echoAPI.search(q);
  if (results && results.error) {
    searchHint.textContent = 'Error: ' + results.error;
    return;
  }
  if (!results.length) {
    searchHint.textContent = 'No results found.';
    return;
  }
  searchHint.textContent = '';
  results.forEach((song) => resultsList.appendChild(buildSongRow(song, false)));
}

// ================= Library =================
async function loadLibrary() {
  currentLibrary = await window.echoAPI.getLibrary();
  libraryList.innerHTML = '';
  if (!currentLibrary.length) {
    libraryHint.style.display = 'block';
    return;
  }
  libraryHint.style.display = 'none';
  currentLibrary.forEach((song) => libraryList.appendChild(buildSongRow(song, true)));
}

// ================= Song row builder =================
function buildSongRow(song, isLibrary) {
  const row = document.createElement('div');
  row.className = 'song-row';

  const img = document.createElement('img');
  img.src = song.thumbnail || '';
  row.appendChild(img);

  const meta = document.createElement('div');
  meta.className = 'song-meta';
  meta.innerHTML = `<div class="title">${escapeHtml(song.title)}</div><div class="sub">${escapeHtml(song.channel || '')}</div>`;
  row.appendChild(meta);

  if (!isLibrary) {
    const dur = document.createElement('div');
    dur.className = 'song-duration';
    dur.textContent = song.duration || '';
    row.appendChild(dur);
  }

  const actions = document.createElement('div');
  actions.className = 'song-actions';

  const playBtn = document.createElement('button');
  playBtn.textContent = 'Play';
  playBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (isLibrary) {
      playLocal(song);
      return;
    }
    playBtn.textContent = 'Loading...';
    playBtn.disabled = true;
    try {
      const res = await window.echoAPI.streamSong(song);
      if (res.success) {
        playBtn.textContent = 'Play';
        playLocal(res.song);
      } else {
        playBtn.textContent = 'Play';
        alert('Play nahi ho paya:\n' + res.error);
      }
    } catch (err) {
      playBtn.textContent = 'Play';
      alert('Error: ' + err.message);
    }
    playBtn.disabled = false;
  });
  actions.appendChild(playBtn);

  if (!isLibrary) {
    const dlBtn = document.createElement('button');
    dlBtn.textContent = 'Download';
    dlBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      dlBtn.textContent = '...';
      dlBtn.disabled = true;
      try {
        const res = await window.echoAPI.downloadSong(song);
        if (res.success) {
          dlBtn.textContent = res.alreadyExists ? 'Saved' : 'Done';
        } else {
          dlBtn.textContent = 'Download';
          alert('Download nahi ho paya:\n' + res.error);
        }
      } catch (err) {
        dlBtn.textContent = 'Download';
        alert('Error: ' + err.message);
      }
      dlBtn.disabled = false;
    });
    actions.appendChild(dlBtn);
  } else {
    const delBtn = document.createElement('button');
    delBtn.className = 'danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      currentLibrary = await window.echoAPI.deleteSong(song.id);
      loadLibrary();
    });
    actions.appendChild(delBtn);
  }

  row.appendChild(actions);
  return row;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ================= Player =================
function playLocal(song) {
  const filePath = song.filepath.replace(/\\/g, '/');
  audioPlayer.src = 'file:///' + filePath;
  audioPlayer.play();
  nowTitle.textContent = song.title;
  nowChannel.textContent = song.channel || '';
  nowThumb.src = song.thumbnail || '';
  playPauseBtn.textContent = '⏸';
  loadLyricsFor(song);
}

playPauseBtn.addEventListener('click', () => {
  if (audioPlayer.paused) {
    audioPlayer.play();
    playPauseBtn.textContent = '⏸';
  } else {
    audioPlayer.pause();
    playPauseBtn.textContent = '▶';
  }
});

audioPlayer.addEventListener('timeupdate', () => {
  if (!audioPlayer.duration) return;
  seekBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  curTime.textContent = formatTime(audioPlayer.currentTime);
  durTime.textContent = formatTime(audioPlayer.duration);
});

seekBar.addEventListener('input', () => {
  if (!audioPlayer.duration) return;
  audioPlayer.currentTime = (seekBar.value / 100) * audioPlayer.duration;
});

audioPlayer.addEventListener('ended', () => { playPauseBtn.textContent = '▶'; });

function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ================= Lyrics =================
async function loadLyricsFor(song) {
  lyricsSongTitle.textContent = song.title;
  lyricsBody.innerHTML = '<p class="hint">Lyrics load ho rahi hain...</p>';
  try {
    const res = await window.echoAPI.getLyrics({ title: song.title, channel: song.channel });
    if (res && res.lyrics) {
      lyricsBody.textContent = res.lyrics;
    } else {
      lyricsBody.innerHTML = `<p class="hint">${escapeHtml((res && res.error) || 'Lyrics nahi mili is gaane ki.')}</p>`;
    }
  } catch (err) {
    lyricsBody.innerHTML = `<p class="hint">Lyrics load nahi ho payi: ${escapeHtml(err.message)}</p>`;
  }
}

// Load library on startup
loadLibrary();
