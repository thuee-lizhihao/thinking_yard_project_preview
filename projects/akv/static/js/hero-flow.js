(() => {
  const hero = document.querySelector('.akv-hero');
  const canvas = document.getElementById('akv-hero-canvas');
  const ctx = canvas?.getContext('2d');
  if (!hero || !ctx) return;

  const status = document.getElementById('hero-flow-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cycleLength = 12000;
  const colors = ['130, 113, 169', '106, 142, 183', '113, 156, 150', '152, 132, 189'];
  // A moving window over a growing logical history. Only KV entries are dropped.
  let active = Array.from({ length: 8 }, (_, i) => i);
  let nextId = 8, elapsed = 0, runningTime = 0, previous = null, frame = null;
  let width = 0, height = 0, visible = false, lastPhase = '', lastClick = -Infinity;
  let hitAreas = [], hovered = null;
  const dropped = new Map();
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const progress = (t, start, length) => ease((t - start) / length);

  function phaseAt(t) {
    return t < 3000 ? 'append' : t < 5600 ? 'drop' : t < 8000 ? 'repos' : 'continue';
  }
  function advance() {
    // Keep identities and their internal pattern across cycles, including the oldest anchor.
    active = active.filter((_, i) => ![1, 2, 4, 5].includes(i)).concat(nextId, nextId + 1, nextId + 2, nextId + 3);
    nextId += 4;
    for (const [key, entry] of dropped) if (!active.includes(entry.id)) dropped.delete(key);
  }
  function setPhase(t) {
    const phase = reduced.matches ? 'static' : runningTime - lastClick < 950 ? 'drop' : phaseAt(t);
    if (phase === lastPhase) return;
    lastPhase = phase;
    hero.dataset.flowPhase = phase;
  }
  function rect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  }
  function block(x, y, id, opacity, isKV, position, scale, lane = -1) {
    if (opacity <= 0 || x < -70 || x > width + 70) return;
    const w = 36 * scale, h = 27 * scale;
    const color = colors[id % colors.length];
    if (isKV) {
      const removal = dropped.get(`${lane}:${id}`);
      const fade = removal ? reduced.matches ? 1 : ease((runningTime - removal.at) / 700) : 0;
      opacity *= 1 - fade;
      if (opacity > .18 && x + w > 0 && x < width) hitAreas.push({ x, y, w, h, id, lane });
      if (hovered?.lane === lane && Math.abs(hovered.x - x) < 52 * scale) opacity = Math.min(1, opacity * 1.5);
      if (removal && fade < 1 && !reduced.matches) {
        ctx.save();
        ctx.globalAlpha = .38 * (1 - fade);
        ctx.strokeStyle = '#9678c4';
        ctx.lineWidth = 1;
        rect(x - 7 * fade, y - 7 * fade, w + 14 * fade, h + 14 * fade, 6 * scale + 3 * fade);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    rect(x, y, w, h, 6 * scale);
    ctx.fillStyle = `rgba(${color},${isKV ? '.13' : '.035'})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${color},${isKV ? '.48' : '.25'})`;
    ctx.lineWidth = .8;
    ctx.stroke();
    if (isKV) {
      // A stable pattern identifies retained states; compaction never regenerates it.
      ctx.fillStyle = `rgba(${color},.34)`;
      for (let j = 0; j < 3; j++) {
        const bar = (9 + ((id * 7 + j * 5) % 13)) * scale;
        ctx.fillRect(x + 7 * scale, y + (7 + j * 5) * scale, bar, 2 * scale);
      }
      ctx.fillStyle = `rgba(${color},.65)`;
      ctx.font = `${8 * scale}px ui-monospace, SFMono-Regular, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(String(position), x + w / 2, y + h + 11 * scale);
    } else {
      ctx.strokeStyle = `rgba(${color},.24)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 8 * scale, y + 10 * scale);
      ctx.lineTo(x + 27 * scale, y + 10 * scale);
      ctx.moveTo(x + 8 * scale, y + 16 * scale);
      ctx.lineTo(x + (16 + id % 8) * scale, y + 16 * scale);
      ctx.stroke();
    }
    ctx.restore();
  }
  function stream(origin, y, scale, t, weight, lane) {
    const pitch = 47 * scale, gap = 44 * scale;
    const append = [progress(t, 350, 900), progress(t, 1550, 900)];
    const drop = progress(t, 3250, 1400);
    const repos = progress(t, 5800, 1700);
    const more = [progress(t, 8250, 850), progress(t, 9350, 850)];
    // The viewport advances only after generation. History leaves the screen, not the history.
    const travel = 4 * progress(t, 10600, 1400);
    const base = origin - travel * pitch;
    const entering = [...append, ...more];
    const historyStart = nextId - 8;

    ctx.save();
    ctx.globalAlpha = weight;
    ctx.strokeStyle = 'rgba(130,113,169,.08)';
    ctx.lineWidth = 1;
    for (const offset of [13.5 * scale, gap + 13.5 * scale]) {
      ctx.beginPath(); ctx.moveTo(origin - pitch, y + offset); ctx.lineTo(origin + 12 * pitch, y + offset); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(106,100,124,.48)';
    ctx.font = `${9 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'left';
    const labelX = origin < width / 2 ? 16 : Math.max(origin, width - 148 * scale);
    ctx.fillText('MESSAGE HISTORY', labelX, y - 13 * scale);
    ctx.fillText('ACTIVE KV', labelX, y + gap + 53 * scale);
    ctx.restore();

    // A complete, unedited sequence in the upper row, clipped only by the viewport.
    for (let i = 0; i < 12; i++) {
      const alpha = i < 8 ? 1 : entering[i - 8];
      block(base + i * pitch, y, historyStart + i, weight * alpha, false, 0, scale);
    }
    const beforeDrop = [...active, nextId, nextId + 1];
    let retainedIndex = 0;
    beforeDrop.forEach((id, i) => {
      const removed = [1, 2, 4, 5].includes(i);
      const appeared = i < 8 ? 1 : append[i - 8];
      const target = retainedIndex;
      if (!removed) retainedIndex++;
      const slot = removed ? i : i + (target - i) * repos;
      const opacity = appeared * (removed ? 1 - drop : 1);
      block(origin + slot * pitch, y + gap, id, weight * opacity, true, repos > .5 && !removed ? target : i, scale, lane);
      if (removed && drop > 0 && repos < 1) {
        ctx.save(); ctx.globalAlpha = weight * drop * (1 - repos) * .26;
        ctx.strokeStyle = '#b3a8c6'; ctx.setLineDash([2, 4]);
        rect(origin + i * pitch, y + gap, 36 * scale, 27 * scale, 6 * scale); ctx.stroke(); ctx.restore();
      }
    });
    for (let i = 0; i < 2; i++) block(origin + (6 + i) * pitch, y + gap, nextId + 2 + i, weight * more[i], true, 6 + i, scale, lane);
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    hitAreas = [];
    const t = reduced.matches ? 7900 : elapsed;
    setPhase(t);
    // Independent windows of the same cache trajectory, away from the central reading area.
    const scale = width < 600 ? .82 : 1;
    const left = width < 600 ? -180 : -105;
    const right = width < 600 ? width - 190 : width - 350;
    const lanes = width < 600 ? [.18, .80] : [.23, .49, .77];
    for (let i = 0; i < lanes.length; i++) {
      stream(left - i * 24, height * lanes[i], scale, t, .84, i * 2);
      stream(right + i * 17, height * lanes[i] - 45, scale, t, .84, i * 2 + 1);
    }
  }
  function resize() {
    const bounds = hero.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function stop() { cancelAnimationFrame(frame); frame = null; previous = null; }
  function tick(now) {
    frame = null;
    if (reduced.matches || !visible || document.hidden) { previous = null; return; }
    if (previous !== null) {
      const delta = now - previous;
      if (delta < 1000 / 30) { frame = requestAnimationFrame(tick); return; }
      const step = Math.min(delta, 120);
      elapsed += step; runningTime += step;
      if (elapsed >= cycleLength) { elapsed %= cycleLength; advance(); }
    }
    previous = now; draw(); frame = requestAnimationFrame(tick);
  }
  function play() {
    if (frame === null && !reduced.matches && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function hitAt(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    // Protect the central reading area. Only the visible background is interactive.
    if (x > width * .3 && x < width * .7) return null;
    let nearest = null, best = 50;
    for (const item of hitAreas) {
      const distance = Math.hypot(x - item.x - item.w / 2, y - item.y - item.h / 2);
      if (distance < best) { nearest = item; best = distance; }
    }
    return nearest;
  }
  canvas.addEventListener('pointermove', event => {
    hovered = hitAt(event);
    canvas.style.cursor = hovered ? 'pointer' : 'default';
    if (reduced.matches) draw();
  });
  canvas.addEventListener('pointerleave', () => {
    hovered = null; canvas.style.cursor = 'default';
    if (reduced.matches) draw();
  });
  canvas.addEventListener('click', event => {
    const hit = hitAt(event);
    if (!hit) return;
    const segment = hitAreas.filter(item => item.lane === hit.lane && Math.abs(item.x - hit.x) < 52);
    for (const item of segment) dropped.set(`${item.lane}:${item.id}`, { id:item.id, at:runningTime });
    lastClick = runningTime;
    hovered = null;
    status.textContent = `Dropped ${segment.length} KV ${segment.length === 1 ? 'state' : 'states'}. Message history is unchanged.`;
    draw();
  });
  reduced.addEventListener('change', () => { stop(); draw(); play(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else play(); });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) play(); else stop();
  }, { threshold: .05 }).observe(hero);
  new ResizeObserver(resize).observe(hero);
  resize();
})();
