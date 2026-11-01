// FRESH: the logo's photo tiles scatter, then every tile flips into place to build the cover.
(() => {
  'use strict';
  const F = window.FRESH, $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = 12, LOGO_W = 1750, LOGO_H = 500;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  // seeded random so the scatter looks the same on every visit
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  scrollTo(0, 0); if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // ---------- tiles ----------
  const world = $('#world'), stage = $('#stage');
  const shadow = document.createElement('div'); shadow.className = 'shadow'; stage.insertBefore(shadow, world);
  const eyes = [[4.2, 5.9], [7.8, 5.9]];
  const tiles = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const el = document.createElement('div'); el.className = 'tile';
    el.innerHTML = '<i class="f"></i><i class="b card"></i>';
    el.querySelector('.f').style.cssText = `background-size:${N * 100}% ${N * 100}%;background-position:${c / (N - 1) * 100}% ${r / (N - 1) * 100}%`;
    const d = Math.min(...eyes.map(([x, y]) => Math.hypot(c - x, r - y)));
    tiles.push({ el, c, r, logo: null, d,
      sx: (rnd() - .5) * 1.15, sy: (rnd() - .5) * .86, sz: -520 + rnd() * 780,
      rx: (rnd() - .5) * 120, rz: (rnd() - .5) * 90, wob: (rnd() - .5) * 140, ss: .55 + rnd() * .95, j: rnd() });
    world.appendChild(el);
  }
  // build order: far from the eyes first, the eyes land last
  const maxD = Math.max(...tiles.map(t => t.d));
  tiles.forEach(t => t.order = clamp(1 - t.d / maxD + (t.j - .5) * .22));

  // each logo cell goes to the nearest free cover tile, so the motion reads as one picture becoming another
  const free = new Set(tiles.map((_, i) => i));
  F.logoCells.map(([x, y, w, h]) => ({ x, y, w, h, u: (x + w / 2) / LOGO_W, v: (y + h / 2) / LOGO_H }))
    .sort((a, b) => a.u - b.u)
    .forEach(cell => {
      const tc = cell.u * (N - 1), tr = 1.5 + cell.v * (N - 4);
      let best = -1, bd = 1e9;
      free.forEach(i => { const d = Math.hypot(tiles[i].c - tc, tiles[i].r - tr); if (d < bd) { bd = d; best = i; } });
      free.delete(best);
      const t = tiles[best]; t.logo = cell;
      const b = t.el.querySelector('.b'); b.className = 'b logo';
      b.style.backgroundSize = `${LOGO_W / cell.w * 100}% ${LOGO_H / cell.h * 100}%`;
      b.style.backgroundPosition = `${cell.x / (LOGO_W - cell.w) * 100}% ${cell.y / (LOGO_H - cell.h) * 100}%`;
    });

  // ---------- layout ----------
  let W, H, S, T, LW, k;
  function measure() {
    W = innerWidth; H = innerHeight;
    S = Math.min(H * (W < 760 ? .6 : .7), W * (W < 760 ? .92 : .86), 760);
    T = S / N;
    LW = Math.min(W * (W < 760 ? .94 : .78), 1100); k = LW / LOGO_W;
    tiles.forEach(t => { t.el.style.width = t.el.style.height = T + 'px'; });
    shadow.style.width = shadow.style.height = S + 'px';
    last = -1;
  }

  // ---------- scroll ----------
  const hero = $('.hero'), cue = $('#cue'), cap = $('#caption');
  let cur = 0, last = -1, mx = 0, my = 0, pmx = 0, pmy = 0;
  addEventListener('pointermove', e => { mx = e.clientX / W - .5; my = e.clientY / H - .5; }, { passive: true });
  const target = () => clamp((scrollY - hero.offsetTop) / (hero.offsetHeight - innerHeight));

  function frame() {
    const tgt = target();
    cur = reduce ? tgt : cur + (tgt - cur) * .12;
    if (Math.abs(tgt - cur) < 1e-4) cur = tgt;
    pmx += (mx - pmx) * .06; pmy += (my - pmy) * .06;
    const p = cur;
    if (Math.abs(p - last) > 1e-5 || Math.abs(mx - pmx) > 1e-3 || Math.abs(my - pmy) > 1e-3) {
      last = p; render(p);
    }
    requestAnimationFrame(frame);
  }

  function render(p) {
    const done = clamp((p - .9) / .06);
    world.style.transform = `rotateX(${-pmy * 8 * (1 - done)}deg) rotateY(${pmx * 10 * (1 - done)}deg)`;
    for (const t of tiles) {
      // scatter target
      const sx = t.sx * W, sy = t.sy * H, sz = t.sz;
      let x, y, z, ry, rx, rz, sc, sch, op = 1;
      if (t.logo) {
        const L = t.logo;
        const lx = (L.x + L.w / 2) * k - LW / 2, ly = (L.y + L.h / 2) * k - LOGO_H * k / 2;
        const u = ease(clamp((p - .05 - t.logo.u * .05) / .26));
        x = lerp(lx, sx, u); y = lerp(ly, sy, u); z = lerp(0, sz, u);
        ry = 180 + t.wob * Math.sin(u * Math.PI) * .6 + (t.wob > 0 ? 60 : -60) * u;
        rx = t.rx * u; rz = t.rz * u;
        sc = lerp(L.w * k / T, t.ss, u); sch = lerp(L.h * k / T, t.ss, u);
      } else {
        const u = easeOut(clamp((p - .1 - t.j * .1) / .2));
        x = sx * lerp(2.4, 1, u); y = sy * lerp(2.4, 1, u); z = lerp(-1800, sz, u);
        ry = 180 + (t.wob > 0 ? 60 : -60) + t.wob * (1 - u); rx = t.rx; rz = t.rz * lerp(2, 1, u);
        sc = sch = t.ss; op = u;
      }
      // assemble: fly home and flip over to show the cover piece
      const a = .38 + t.order * .4, v = ease(clamp((p - a) / .14));
      if (v > 0) {
        const gx = (t.c - (N - 1) / 2) * T, gy = (t.r - (N - 1) / 2) * T;
        x = lerp(x, gx, v); y = lerp(y, gy, v); z = lerp(z, 0, v) + Math.sin(v * Math.PI) * 160;
        const endRy = ry > 180 ? 360 : 0;
        ry = lerp(ry, endRy, v); rx = lerp(rx, 0, v); rz = lerp(rz, 0, v);
        sc = lerp(sc, 1, v); sch = lerp(sch, 1, v); op = Math.max(op, v);
      }
      t.el.style.transform = `translate3d(${x - T / 2}px,${y - T / 2}px,${z}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${sc},${sch})`;
      t.el.style.opacity = op;
      const air = v < 1 && (t.logo ? p > .06 : op > 0);
      if (air !== t.air) { t.air = air; t.el.classList.toggle('air', air); }
    }
    shadow.style.opacity = done;
    cue.style.opacity = p < .03 ? 1 : 0;
    cap.style.opacity = done;
  }

  addEventListener('resize', measure);
  measure(); requestAnimationFrame(frame);

  // ---------- countdown made of cover tiles ----------
  const clock = $('#clock'), rel = new Date(F.release).getTime();
  const units = [['days', 2], ['hrs', 2], ['mins', 2], ['secs', 2]];
  clock.innerHTML = units.map(([n, d]) => `<div class="unit"><div class="digits">${'<div class="dg"><b><span>0</span></b></div>'.repeat(d)}</div><small>${n}</small></div>`).join('');
  const dgs = [...clock.querySelectorAll('.dg')];
  dgs.forEach(d => { const c = 1 + Math.floor(rnd() * 10), r = 1 + Math.floor(rnd() * 10); d.querySelector('b').style.background = `#1a1612 url(img/cover.jpg) ${c / 11 * 100}% ${r / 11 * 100}%/1200% 1200%`; });
  function tick() {
    let s = Math.max(0, Math.floor((rel - Date.now()) / 1000));
    if (s === 0) { $('#countTitle').textContent = 'Fresh is out now'; $('#countSub').textContent = 'Stream it everywhere.'; }
    const vals = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
    const str = vals.map(v => String(Math.min(v, 99)).padStart(2, '0')).join('');
    dgs.forEach((d, i) => { const sp = d.querySelector('span'); if (sp.textContent !== str[i]) { sp.textContent = str[i]; d.classList.remove('flip'); void d.offsetWidth; d.classList.add('flip'); } });
  }
  tick(); setInterval(tick, 1000);

  // ---------- the tracklist hidden in the face ----------
  const board = $('#board'), list = $('#tracks');
  const spots = new Map();
  const pool = [...Array(N * N).keys()].filter(i => { const c = i % N, r = Math.floor(i / N); return Math.min(...eyes.map(([x, y]) => Math.hypot(c - x, r - y))) > 1.2; });
  while (spots.size < F.tracks.length) { const i = pool[Math.floor(rnd() * pool.length)]; if (![...spots.keys()].some(j => Math.abs(j % N - i % N) + Math.abs(Math.floor(j / N) - Math.floor(i / N)) < 2)) spots.set(i, spots.size); }
  board.innerHTML = [...Array(N * N)].map((_, i) => {
    const c = i % N, r = Math.floor(i / N), tr = spots.get(i);
    const back = tr === undefined ? '' : `<em>${tr + 1}</em>${F.tracks[tr].split(' feat.')[0]}`;
    return `<button class="bt" data-i="${i}" aria-label="Photo ${i + 1}"><i class="f" style="background-position:${c / 11 * 100}% ${r / 11 * 100}%"></i><i class="b">${back}</i></button>`;
  }).join('');
  list.innerHTML = F.tracks.map((t, i) => `<li><span>${i + 1}.</span>${t}</li>`).join('');
  const lis = [...list.children]; let found = 0;
  // shrink each track title until it fits inside its square
  function fitTitles() {
    board.querySelectorAll('.b').forEach(b => {
      if (!b.textContent) return;
      let s = b.clientWidth * .2; b.style.fontSize = s + 'px';
      while (s > 3 && (b.scrollHeight > b.clientHeight || b.scrollWidth > b.clientWidth)) { s -= .25; b.style.fontSize = s + 'px'; }
    });
  }
  fitTitles(); addEventListener('resize', fitTitles); document.fonts && document.fonts.ready.then(fitTitles);
  function reveal(btn) {
    const tr = spots.get(+btn.dataset.i); if (tr === undefined || btn.classList.contains('open')) return false;
    btn.classList.add('open'); btn.setAttribute('aria-label', `Track ${tr + 1}: ${F.tracks[tr]}`);
    lis[tr].classList.add('on'); $('#foundN').textContent = ++found; return true;
  }
  board.addEventListener('click', e => {
    const b = e.target.closest('.bt'); if (!b) return;
    if (!reveal(b) && !b.classList.contains('open')) { b.classList.remove('miss'); void b.offsetWidth; b.classList.add('miss'); }
  });
  $('#revealAll').addEventListener('click', () => [...board.children].forEach((b, n) => setTimeout(() => reveal(b), n * 6)));

  // ---------- pre-order shelf ----------
  // vinyl stays drawn (sleeve + record that slides out); CDs and apparel use the store's own photos
  const pic = (f, cls = '') => `<img class="${cls}" src="img/merch/${f}" alt="" loading="lazy">`;
  $('#shelf').innerHTML = F.products.map(pr => {
    let art;
    if (pr.kind === 'vinyl') art = `<div class="sleeve"></div><div class="disc"></div>${pr.signed ? '<span class="sig">Lil Baby</span>' : ''}`;
    else if (pr.img.length > 1) art = `<div class="turn"><div class="turn-in">${pic(pr.img[0], 'fr')}${pic(pr.img[1], 'bk')}</div></div>`;
    else art = pic(pr.img[0], 'solo');
    return `<a class="prod ${pr.kind}" href="${pr.url}" target="_blank" rel="noopener"><div class="art">${art}</div><h3>${pr.name}</h3><p>${pr.price}</p>${pr.signed ? '<span class="signed">SIGNED</span>' : ''}</a>`;
  }).join('');
})();
