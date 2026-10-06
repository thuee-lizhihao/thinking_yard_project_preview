(() => {
  const image = document.getElementById('core-animation');
  const button = document.getElementById('core-animation-toggle');
  const selector = document.querySelector('.akv-core-selector');
  if (!image || !button || !selector) return;
  const choices = [...selector.querySelectorAll('button')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const descriptions = {
    cache: "Cache engineering keeps messages A, B and C. A's cache fades while B's retained cache keeps the yellow information from A. Only C's new cache entries appear in order. Schematic timing.",
    context: "Context engineering removes message A. The old A and B caches fade, then new B cache entries appear in order, followed by C's cache. Schematic timing."
  };
  let approach = 'cache';
  let paused = motion.matches;
  function render() {
    image.src = `static/figures/${approach}-engineering-compact.${paused ? 'png' : 'gif'}`;
    image.alt = descriptions[approach];
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice.dataset.engineering === approach)));
    button.textContent = paused ? 'Play animation' : 'Pause animation';
    button.setAttribute('aria-pressed', String(paused));
  }
  selector.hidden = false;
  choices.forEach(choice => choice.addEventListener('click', () => {
    approach = choice.dataset.engineering;
    render();
  }));
  button.hidden = false;
  button.addEventListener('click', () => { paused = !paused; render(); });
  motion.addEventListener('change', () => { paused = motion.matches; render(); });
  render();
})();
