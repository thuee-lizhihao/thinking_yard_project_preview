/* Decorative iteration-gain field. Independent of the paper's measured charts. */
(() => {
  const canvas = document.getElementById('iterationField');
  const hero = canvas?.closest('.hero');
  const ctx = canvas?.getContext('2d');
  if (!ctx || !hero) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const ease = t => t * t * (3 - 2 * t);
  let width = 0, height = 0, lanes = [], raf = 0, last = 0, elapsed = 0;
  let visible = true, pointer = null, drift = {x: 0, y: 0};
  const blue = '76,110,194', purple = '120,104,171', neutral = '128,143,165';
  const duration = 7.3, retention = 24;

  function baseline(x, lane) {
    return height * (.19 + lane * .155 - .19 * x / width) + Math.sin(x / width * Math.PI * 2.6 + lane * .7) * Math.min(24, height * .025);
  }
  function probe(trial, t) {
    const x = trial.x + trial.span * t;
    return {x, y: baseline(x, trial.lane) + trial.offset + trial.direction * trial.lift * t * t};
  }
  function extension(trial, t) {
    const distance = trial.step * .9, x = trial.x + trial.span + distance * t;
    const outward = trial.lift + 2 * trial.lift * distance / (5 * trial.span) * (1 - Math.exp(-5 * t));
    return {x, y: baseline(x, trial.lane) + trial.offset + trial.direction * outward};
  }
  function advance(trial, t) {
    const x = trial.x + trial.step * t;
    return {x, y: baseline(x, trial.lane) + trial.offset};
  }
  function appendTrial(lane) {
    // A new particle only enters after the old one has travelled beyond the viewport.
    if (lane.x > width + 120) { lane.x = -120; lane.offset = 0; }
    const y = baseline(lane.x, lane.index) + lane.offset;
    const direction = y < 90 ? 1 : y > height - 80 ? -1 : (lane.index + lane.sequence) % 2 ? 1 : -1;
    const trial = {
      lane: lane.index, x: lane.x, offset: lane.offset, direction,
      step: width < 600 ? 152 : 276, span: width < 600 ? 72 : 124, lift: width < 600 ? 36 : 54,
      accepted: (lane.index * 3 + lane.sequence) % 5 < 3,
      start: lane.delay + lane.sequence * duration,
    };
    trial.finish = trial.start + duration;
    lane.trials.push(trial);
    const endpoint = trial.accepted ? extension(trial, 1) : advance(trial, 1);
    // Carry the exact endpoint into the next trial, including the accepted branch's displacement.
    lane.x = endpoint.x;
    lane.offset = endpoint.y - baseline(endpoint.x, lane.index);
    lane.sequence++;
  }
  function line(points, color, alpha, weight = 1, dashed = false) {
    if (points.length < 2) return;
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.strokeStyle = `rgba(${color},${alpha})`;
    ctx.lineWidth = weight;
    ctx.setLineDash(dashed ? [2, 6] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function samples(fn, from = 0, to = 1, count = 36) {
    return Array.from({length: count + 1}, (_, i) => fn(from + (to - from) * i / count));
  }
  function bead(p, color, alpha = .8, radius = 2.5) {
    const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 17);
    halo.addColorStop(0, `rgba(${color},${alpha * .20})`);
    halo.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.x, p.y, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${color},${alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
  }
  function ring(p, progress, color) {
    ctx.strokeStyle = `rgba(${color},${.32 * (1 - progress)})`;
    ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(p.x, p.y, 4 + progress * 17, 0, Math.PI * 2); ctx.stroke();
  }
  function resize() {
    const rect = hero.getBoundingClientRect();
    width = rect.width; height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lanes = Array.from({length: 7}, (_, index) => ({
      index, x: width * ((index * .27) % .88) - 40, offset: 0,
      delay: index * .55, sequence: 0, trials: [],
    }));
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    if (!width || !height) return;
    const target = pointer || {x: 0, y: 0};
    drift.x += (target.x - drift.x) * .045; drift.y += (target.y - drift.y) * .045;
    ctx.save(); ctx.translate(drift.x, drift.y);
    const clock = motion.matches ? 16 : elapsed;
    lanes.forEach(lane => {
      if (clock <= lane.delay) return;
      while (!lane.trials.length || lane.trials[lane.trials.length - 1].finish <= clock) appendTrial(lane);
      lane.trials = lane.trials.filter(trial => clock - trial.finish < retention);
      const color = lane.index % 3 === 0 ? purple : blue;
      for (const trial of lane.trials) {
        const t = clock - trial.start;
        if (t >= duration) {
          const age = t - duration;
          const memory = 1 - ease(Math.min(1, age / retention));
          const ink = (.4 + .6 * Math.exp(-age / 1.5)) * memory;
          if (trial.accepted) {
            line([...samples(u => probe(trial, u)), ...samples(u => extension(trial, u))], color, .54 * ink, 1.4);
          } else {
            line(samples(u => advance(trial, u)), color, .48 * ink, 1.3);
            line(samples(u => probe(trial, u)), neutral, .06 * memory, .85);
          }
          continue;
        }
        let head, headColor = purple;
        if (t < 2.2) {
          const progress = ease(t / 2.2);
          line(samples(u => probe(trial, u), 0, progress), purple, .54, 1.3);
          head = probe(trial, progress);
        } else if (t < 2.7) {
          line(samples(u => probe(trial, u)), purple, .54, 1.3);
          head = probe(trial, 1);
        } else if (trial.accepted) {
          const progress = ease((t - 2.7) / 4.6);
          line([...samples(u => probe(trial, u)), ...samples(u => extension(trial, u), 0, progress)], color, .54, 1.4);
          head = extension(trial, progress); headColor = color;
          if (t < 3.5) ring(probe(trial, 1), (t - 2.7) / .8, color);
        } else if (t < 4.5) {
          const progress = 1 - ease((t - 2.7) / 1.8);
          line(samples(u => probe(trial, u)), neutral, .06, .85);
          line(samples(u => probe(trial, u), 0, progress), purple, .46, 1.3);
          head = probe(trial, progress);
        } else {
          const progress = ease((t - 4.5) / 2.8);
          line(samples(u => probe(trial, u)), neutral, .06, .85);
          line(samples(u => advance(trial, u), 0, progress), color, .48, 1.3);
          head = advance(trial, progress); headColor = color;
          if (t < 5.2) ring(advance(trial, 0), (t - 4.5) / .7, neutral);
        }
        bead(head, headColor, .72);
      }
    });

    ctx.restore();
  }
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden || motion.matches) { last = 0; return; }
    if (!last) last = now;
    // 30 fps is enough for the soft background, and bounds work on high-refresh displays.
    if (now - last >= 32) { elapsed += Math.min((now - last) / 1000, .08); last = now; draw(); }
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(raf); raf = 0; last = 0;
    if (motion.matches) { pointer = null; drift = {x: 0, y: 0}; draw(); }
    else if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  hero.addEventListener('pointermove', event => {
    if (!finePointer.matches || motion.matches) return;
    const rect = hero.getBoundingClientRect();
    pointer = {x: (event.clientX - rect.left - width / 2) * .012, y: (event.clientY - rect.top - height / 2) * .012};
  }, {passive: true});
  hero.addEventListener('pointerleave', () => { pointer = null; });
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold: .01}).observe(hero);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', () => { resize(); sync(); });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); raf = 0; });
  window.addEventListener('pageshow', sync);
  resize(); sync();
})();
