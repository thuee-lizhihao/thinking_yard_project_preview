(() => {
  const image = document.getElementById('core-animation');
  const button = document.getElementById('core-animation-toggle');
  const selector = document.querySelector('.akv-core-selector');
  if (!image || !button || !selector) return;
  const choices = [...selector.querySelectorAll('button')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const descriptions = {
    cache: "Cache engineering keeps the messages and drops A's KV. B's retained KV still carries A's influence and is reused without re-prefill; only new Q needs prefill. Schematic timing.",
    context: "Context engineering removes message A, invalidating B's KV. B must be recomputed from the edited text before new Q is prefilled. Schematic timing."
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
