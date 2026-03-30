

const NASA_API_KEY = 'UmZJzazwbpEK5wCFgwaDalufWbUhxReBlFFqTHgH'; // Works for demos; students can get free key at api.nasa.gov


const state = {
  banned: new Set(),
  history: [],
  loading: false,
  current: null,
};


// Pull from multiple NASA endpoints for variety
const SOURCES = ['apod', 'mars', 'neo'];

async function fetchAPOD() {
    // Astronomy Picture of the Day — random date
    const start = new Date('1995-06-16').getTime();
    const end   = new Date().getTime();
    const randDate = new Date(start + Math.random() * (end - start));
    const d = randDate.toISOString().split('T')[0];
  
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&date=${d}`);
    if (!res.ok) throw new Error('APOD fetch failed');
    const data = await res.json();
  
    // Video handling
    if (data.media_type === 'video') {
      return {
        source: 'APOD',
        title: data.title,
        video: data.url,  
        date: data.date,
        desc: data.explanation,
        attrs: [
          { label: 'TYPE', value: 'Astronomy Video', bannableKey: 'TYPE:Astronomy Video' },
          { label: 'DATE', value: data.date, bannableKey: `DATE:${data.date.slice(0,7)}` },
          { label: 'SOURCE', value: data.copyright ? cleanCopyright(data.copyright) : 'Public Domain', bannableKey: `CREDIT:${data.copyright ? cleanCopyright(data.copyright) : 'Public Domain'}` },
        ]
      };
    }
  
    
    if (data.media_type !== 'image') return null;
  
    return {
      source: 'APOD',
      title: data.title,
      image: data.url,
      hdimage: data.hdurl,
      date: data.date,
      desc: data.explanation,
      attrs: [
        { label: 'TYPE',     value: 'Astronomy Pic of the Day', bannableKey: 'TYPE:Astronomy Pic of the Day' },
        { label: 'DATE',     value: data.date,                  bannableKey: `DATE:${data.date.slice(0,7)}` },
        { label: 'SOURCE',   value: data.copyright ? cleanCopyright(data.copyright) : 'Public Domain', bannableKey: `CREDIT:${data.copyright ? cleanCopyright(data.copyright) : 'Public Domain'}` },
      ]
    };
  }
  

function cleanCopyright(str) {
  return str.replace(/\n/g, ' ').trim().slice(0, 40);
}

async function fetchMars() {
  // Mars Rover Photos — Curiosity, random sol
  const maxSol = 3800;
  const sol = Math.floor(Math.random() * maxSol) + 1;
  const rovers = ['curiosity', 'opportunity', 'spirit'];
  const rover = rovers[Math.floor(Math.random() * rovers.length)];

  const res = await fetch(
    `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos?sol=${sol}&api_key=${NASA_API_KEY}`
  );
  if (!res.ok) throw new Error('Mars fetch failed');
  const data = await res.json();

  if (!data.photos || data.photos.length === 0) return null;
  // pick a random photo from the result set
  const photo = data.photos[Math.floor(Math.random() * Math.min(data.photos.length, 10))];

  return {
    source: 'MARS',
    title: `${photo.rover.name} · Sol ${photo.sol}`,
    image: photo.img_src,
    date: photo.earth_date,
    desc: `Captured by the ${photo.rover.name} rover on Martian Sol ${photo.sol} (Earth date: ${photo.earth_date}) using the ${photo.camera.full_name}. Mission status: ${photo.rover.status}.`,
    attrs: [
      { label: 'ROVER',    value: photo.rover.name,          bannableKey: `ROVER:${photo.rover.name}` },
      { label: 'CAMERA',   value: photo.camera.name,         bannableKey: `CAMERA:${photo.camera.name}` },
      { label: 'STATUS',   value: photo.rover.status,        bannableKey: `STATUS:${photo.rover.status}` },
    ]
  };
}

async function fetchNEO() {
  // Near-Earth Object — asteroids
  const today = new Date();
  const end   = today.toISOString().split('T')[0];
  const start7 = new Date(today - 7*24*60*60*1000).toISOString().split('T')[0];

  const res = await fetch(
    `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start7}&end_date=${end}&api_key=${NASA_API_KEY}`
  );
  if (!res.ok) throw new Error('NEO fetch failed');
  const data = await res.json();

  const allNeos = Object.values(data.near_earth_objects).flat();
  if (!allNeos.length) return null;
  const neo = allNeos[Math.floor(Math.random() * allNeos.length)];

  const dia = neo.estimated_diameter.kilometers;
  const diaStr = `${dia.estimated_diameter_min.toFixed(2)}–${dia.estimated_diameter_max.toFixed(2)} km`;
  const approach = neo.close_approach_data[0];
  const hazard = neo.is_potentially_hazardous_asteroid;

  // NEOs don't have images — use a NASA asteroid illustration
  const asteroidImgs = [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Eros_-_PIA02923_%28color%29.jpg/800px-Eros_-_PIA02923_%28color%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Bennu_mosaic_OSIRIS-REx.png/800px-Bennu_mosaic_OSIRIS-REx.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Itokawa8_hayabusa.jpg/800px-Itokawa8_hayabusa.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Ryugu_asteroid.jpg/800px-Ryugu_asteroid.jpg',
  ];
  const img = asteroidImgs[Math.floor(Math.random() * asteroidImgs.length)];

  return {
    source: 'NEO',
    title: neo.name,
    image: img,
    date: approach?.close_approach_date ?? 'Unknown',
    desc: `Near-Earth Object detected at ~${Number(approach?.miss_distance?.kilometers || 0).toLocaleString(undefined,{maximumFractionDigits:0})} km from Earth. Estimated diameter: ${diaStr}. Relative velocity: ${Number(approach?.relative_velocity?.kilometers_per_hour || 0).toLocaleString(undefined,{maximumFractionDigits:0})} km/h.`,
    attrs: [
      { label: 'HAZARDOUS', value: hazard ? 'YES ⚠️' : 'NO',   bannableKey: `HAZARDOUS:${hazard ? 'YES' : 'NO'}` },
      { label: 'DIAMETER',  value: diaStr,                      bannableKey: `SIZE:${dia.estimated_diameter_max < 0.1 ? 'Small' : dia.estimated_diameter_max < 1 ? 'Medium' : 'Large'}` },
      { label: 'TYPE',      value: 'Near-Earth Object',         bannableKey: 'TYPE:Near-Earth Object' },
    ]
  };
}


async function discover() {
  if (state.loading) return;

  const btn = document.getElementById('discoverBtn');
  const status = document.getElementById('statusText');

  state.loading = true;
  btn.disabled = true;
  status.textContent = 'SCANNING COSMOS...';
  status.className = 'status-text loading';

  let result = null;
  let attempts = 0;
  const maxAttempts = 8;

  while (!result && attempts < maxAttempts) {
    attempts++;
    try {
      // Pick random source
      const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
      let data = null;
      if (source === 'apod') data = await fetchAPOD();
      else if (source === 'mars') data = await fetchMars();
      else if (source === 'neo') data = await fetchNEO();

      if (!data) continue;

      // Check ban list
      const isBanned = data.attrs.some(a => state.banned.has(a.bannableKey));
      if (isBanned) {
        showToast('Skipped banned content, retrying...', 'skipped');
        continue;
      }

      result = data;
    } catch (e) {
      console.error('Fetch error:', e);
    }
  }

  state.loading = false;
  btn.disabled = false;

  if (!result) {
    status.textContent = 'NO RESULTS — CHECK BAN LIST';
    status.className = 'status-text error';
    return;
  }

  state.current = result;
  status.textContent = `SOURCE: ${result.source} · LOADED`;
  status.className = 'status-text';

  renderCard(result);
  addToHistory(result);
}

function renderCard(data) {
  const card = document.getElementById('card');
  const emptyState = document.getElementById('emptyState');
  const cardImg = document.getElementById('cardImg');
  const imgPlaceholder = document.getElementById('imgPlaceholder');

  // Show card
  emptyState.style.display = 'none';
  card.classList.add('visible');

  // Image
  if (data.image) {
    cardImg.src = data.image;
    cardImg.alt = data.title;
    cardImg.style.display = 'block';
    imgPlaceholder.style.display = 'none';
    cardImg.onerror = () => {
      cardImg.style.display = 'none';
      imgPlaceholder.style.display = 'flex';
    };
  } else {
    cardImg.style.display = 'none';
    imgPlaceholder.style.display = 'flex';
  }

  document.getElementById('cardTitle').textContent = data.title;
  document.getElementById('cardDate').textContent = `📅 ${data.date} · ${data.source}`;
  document.getElementById('cardDesc').textContent = data.desc;

  // Attributes
  const attrsEl = document.getElementById('attrs');
  attrsEl.innerHTML = '';
  data.attrs.forEach(attr => {
    const chip = document.createElement('div');
    chip.className = 'attr-chip' + (state.banned.has(attr.bannableKey) ? ' banned' : '');
    chip.innerHTML = `<div class="label">${attr.label}</div><div>${attr.value}</div>`;
    chip.title = 'Click to ban/unban this attribute';
    chip.onclick = () => toggleBan(attr.bannableKey, attr.value);
    attrsEl.appendChild(chip);
  });
}

function toggleBan(key, value) {
  if (state.banned.has(key)) {
    state.banned.delete(key);
    showToast(`Unbanned: ${value}`, 'unbanned');
  } else {
    state.banned.add(key);
    showToast(`Banned: ${value}`, 'banned');
  }
  renderBanList();
  // Re-render current card chips to reflect ban state
  if (state.current) renderCard(state.current);
}

function renderBanList() {
  const banList = document.getElementById('banList');
  const banCount = document.getElementById('banCount');
  banCount.textContent = state.banned.size;

  if (state.banned.size === 0) {
    banList.innerHTML = '<div class="ban-empty">No bans — click any attribute to exclude it</div>';
    return;
  }

  banList.innerHTML = '';
  state.banned.forEach(key => {
    const [label, ...rest] = key.split(':');
    const value = rest.join(':');
    const item = document.createElement('div');
    item.className = 'ban-item';
    item.innerHTML = `<span style="color:var(--text-muted);font-size:0.55rem">${label}</span>&nbsp;${value}<span class="remove-x">✕</span>`;
    item.title = 'Click to remove ban';
    item.onclick = () => toggleBan(key, value);
    banList.appendChild(item);
  });
}

function addToHistory(data) {
  state.history.unshift(data);
  if (state.history.length > 50) state.history.pop();
  renderHistory();
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  const histCount = document.getElementById('histCount');
  histCount.textContent = state.history.length;

  if (state.history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">Your discoveries will appear here</div>';
    return;
  }

  historyList.innerHTML = '';
  state.history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';

    const thumb = item.image
      ? `<img class="history-thumb" src="${item.image}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholder = `<div class="history-thumb-placeholder" style="${item.image ? 'display:none' : ''}">🌌</div>`;

    el.innerHTML = `
      ${thumb}
      ${placeholder}
      <div class="history-info">
        <div class="history-title">${item.title}</div>
        <div class="history-sub">${item.source} · ${item.date}</div>
      </div>
    `;
    historyList.appendChild(el);
  });
}


let toastTimer;
function showToast(msg, type='') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = `toast ${type}`; }, 2500);
}


document.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    discover();
  }
});
