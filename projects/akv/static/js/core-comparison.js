(() => {
  const images = [...document.querySelectorAll('.akv-core-animation')];
  const button = document.getElementById('core-animation-toggle');
  if (!images.length || !button) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stills = images.map(image => image.getAttribute('src'));
  let paused = motion.matches;
  function render() {
    images.forEach((image, index) => {
      image.src = paused ? stills[index] : image.dataset.animation;
    });
    button.textContent = paused ? 'Play animations' : 'Pause animations';
    button.setAttribute('aria-pressed', String(paused));
  }
  button.hidden = false;
  button.addEventListener('click', () => { paused = !paused; render(); });
  motion.addEventListener('change', () => { paused = motion.matches; render(); });
  render();
})();
