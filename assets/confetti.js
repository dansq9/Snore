/**
 * NightSeals — Confetti burst
 *
 * Fires a brief confetti animation on first add-to-cart.
 * Uses the Web Animations API for smooth, GPU-accelerated motion.
 * Auto-cleans up after the animation completes.
 *
 * Global: window.fireConfetti
 */
(function () {
  'use strict';

  var COLORS   = ['#D9A04B', '#10182B', '#4E8A5F', '#E5B267', '#C2564E'];
  var COUNT    = 60;
  var DURATION = 2600; /* ms */

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function fireConfetti() {
    /* Container overlay — covers viewport, pointer-events disabled */
    var container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(container);

    for (var i = 0; i < COUNT; i++) {
      var piece = document.createElement('div');
      var size  = rand(6, 12);
      var color = COLORS[Math.floor(Math.random() * COLORS.length)];
      var isCircle = Math.random() > 0.5;

      piece.style.cssText =
        'position:absolute;width:' + size + 'px;height:' + (isCircle ? size : size * 0.5) + 'px;' +
        'background:' + color + ';' +
        'border-radius:' + (isCircle ? '50%' : '2px') + ';' +
        'top:0;left:' + rand(10, 90) + '%;' +
        'opacity:1';

      container.appendChild(piece);

      var xDrift   = rand(-120, 120);
      var yEnd     = rand(60, 110); /* vh */
      var spin     = rand(-720, 720);
      var delay    = rand(0, 300);

      piece.animate([
        {
          transform: 'translate(0, -10vh) rotate(0deg) scale(1)',
          opacity: 1
        },
        {
          transform: 'translate(' + xDrift + 'px, ' + yEnd + 'vh) rotate(' + spin + 'deg) scale(0.4)',
          opacity: 0
        }
      ], {
        duration: DURATION,
        delay: delay,
        easing: 'cubic-bezier(.25,.46,.45,.94)',
        fill: 'forwards'
      });
    }

    /* Clean up after animation completes */
    setTimeout(function () {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, DURATION + 400);
  }

  window.fireConfetti = fireConfetti;
})();
