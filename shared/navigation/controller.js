// The approved C2C interaction, shared by every page.
(() => {
    const nav = document.getElementById('navGlobal');
    const toggle = document.getElementById('globalMenuToggle');
    const menu = document.getElementById('globalProjectMenu');
    const backdrop = document.getElementById('globalMenuBackdrop');
    const localNav = document.getElementById('navLocal');
    const contentsToggle = document.getElementById('mobileMenuToggle');
    const contents = document.getElementById('navLinks');
    const categoryToggles = [...nav.querySelectorAll('.sp-category')];
    const projectTriggers = [toggle, ...categoryToggles];
    const groups = [...menu.querySelectorAll('.sp-group')];
    const desktop = window.matchMedia('(min-width: 900px)');
    const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');
    let activeTrigger = toggle;
    let closeTimer;
    let openedByHover = false;
    const cancelHoverClose = () => window.clearTimeout(closeTimer);

    const closeContents = (restoreFocus = false) => {
      contents.classList.remove('mobile-open');
      contentsToggle.setAttribute('aria-expanded', 'false');
      if (restoreFocus) contentsToggle.focus();
    };
    const closeProjects = (restoreFocus = false) => {
      cancelHoverClose();
      openedByHover = false;
      nav.classList.remove('menu-open');
      menu.hidden = true;
      backdrop.hidden = true;
      projectTriggers.forEach(button => button.setAttribute('aria-expanded', 'false'));
      localNav.inert = !localNav.classList.contains('nav-visible');
      nav.inert = nav.classList.contains('hidden');
      document.body.classList.remove('global-menu-open');
      if (restoreFocus) activeTrigger.focus({ preventScroll: true });
    };

    const openProjects = (trigger, focusMenu = true) => {
      cancelHoverClose();
      openedByHover = !focusMenu;
      closeContents();
      activeTrigger = trigger;
      const category = trigger.dataset.category;
      groups.forEach(group => {
        group.hidden = !!category && group.getAttribute('aria-labelledby') !== `global-category-${category}`;
      });
      projectTriggers.forEach(button => button.setAttribute('aria-expanded', String(button === trigger)));
      menu.hidden = false;
      backdrop.hidden = false;
      nav.classList.add('menu-open');
      nav.inert = false;
      localNav.inert = true;
      document.body.classList.toggle('global-menu-open', !desktop.matches);
      if (focusMenu) menu.querySelector('section:not([hidden]) a')?.focus({ preventScroll: true });
    };
    projectTriggers.forEach(trigger => trigger.addEventListener('click', () => {
      if (nav.classList.contains('menu-open') && activeTrigger === trigger && !openedByHover) {
        closeProjects(true);
      } else {
        openProjects(trigger);
      }
    }));
    const scheduleHoverClose = event => {
      if (!desktop.matches || !hoverCapable.matches || event.pointerType !== 'mouse') return;
      cancelHoverClose();
      closeTimer = window.setTimeout(() => {
        closeProjects(menu.contains(document.activeElement));
      }, 180);
    };
    categoryToggles.forEach(trigger => {
      trigger.addEventListener('pointerenter', event => {
        if (!desktop.matches || !hoverCapable.matches || event.pointerType !== 'mouse') return;
        cancelHoverClose();
        if (activeTrigger !== trigger || !nav.classList.contains('menu-open')) openProjects(trigger, false);
      });
      trigger.addEventListener('pointerleave', scheduleHoverClose);
      trigger.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          openProjects(trigger);
        }
      });
    });
    menu.addEventListener('pointerenter', cancelHoverClose);
    menu.addEventListener('pointerleave', scheduleHoverClose);
    contentsToggle.addEventListener('click', () => {
      const open = !contents.classList.contains('mobile-open');
      closeProjects();
      contents.classList.toggle('mobile-open', open);
      contentsToggle.setAttribute('aria-expanded', String(open));
      if (open) contents.querySelector('a')?.focus({ preventScroll: true });
    });
    backdrop.addEventListener('click', () => closeProjects(true));
    menu.addEventListener('click', event => {
      if (event.target.closest('a')) closeProjects();
    });
    contents.addEventListener('click', event => {
      if (event.target.closest('a')) closeContents();
    });
    document.addEventListener('click', event => {
      if (!localNav.contains(event.target)) closeContents();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (nav.classList.contains('menu-open')) closeProjects(true);
        if (contents.classList.contains('mobile-open')) closeContents(true);
      }
      if (event.key === 'Tab' && nav.classList.contains('menu-open')) {
        const first = nav.querySelector('.sp-home');
        const links = menu.querySelectorAll('section:not([hidden]) a');
        const last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    localNav.addEventListener('focusout', event => {
      if (!localNav.contains(event.relatedTarget)) closeContents();
    });
    const updateNavigation = () => {
      const scrolled = window.scrollY > 8;
      if (scrolled && desktop.matches && nav.classList.contains('menu-open')) closeProjects();
      nav.classList.toggle('hidden', scrolled);
      localNav.classList.toggle('nav-visible', scrolled);
      nav.inert = scrolled && !nav.classList.contains('menu-open');
      localNav.inert = !scrolled || nav.classList.contains('menu-open');
      if (!scrolled) closeContents();
      document.getElementById('scrollTop')?.classList.toggle('visible', window.scrollY > 500);
    };
    window.addEventListener('scroll', updateNavigation, { passive: true });
    window.addEventListener('resize', () => { closeContents(); updateNavigation(); });
    updateNavigation();
    desktop.addEventListener('change', () => closeProjects());
  })();
