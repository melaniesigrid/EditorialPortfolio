/* ══════════════════════════════════════════════════════════════════════════
   WRITING — shared script for the essays

   Deliberately almost nothing. An essay page has no language switcher, no
   form and no state; the only behaviour it wants is the same staggered
   reveal the plates on the index use, and only when the reader has not
   asked for less motion.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function wireReveal() {
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || !('IntersectionObserver' in window)) return;

    // The head script armed the gate before first paint; tell it we are alive so
    // its failsafe does not disarm.
    window.__essayReveal = true;
    var nodes = document.querySelectorAll('.rise');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('on');
        io.unobserve(en.target);
      });
    }, { threshold: .06, rootMargin: '0px 0px -8% 0px' });

    for (var j = 0; j < nodes.length; j++) io.observe(nodes[j]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireReveal);
  } else {
    wireReveal();
  }
})();
