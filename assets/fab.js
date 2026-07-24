/**
 * NightSeals — Floating Action Button (FAB)
 *
 * A sticky "Buy now" pill that appears once the user scrolls past the
 * buy-box (#tiers or #buy) and hides near the footer.  Uses
 * IntersectionObserver for zero-jank visibility toggling.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Build FAB element                                                  */
  /* ------------------------------------------------------------------ */

  function createFab() {
    var fab = document.createElement('a');
    fab.id  = 'ns-fab';
    fab.setAttribute('role', 'button');
    fab.setAttribute('aria-label', 'Buy now');
    fab.style.cssText =
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);' +
      'z-index:60;display:flex;align-items:center;gap:8px;' +
      'background:#10182B;color:#F7F8FA;' +
      'padding:18px 38px;border-radius:999px;' +
      'font-family:var(--font-primary,Archivo,system-ui,sans-serif);' +
      'font-size:17.5px;font-weight:800;text-decoration:none;' +
      'box-shadow:0 8px 32px rgba(16,24,43,.35);' +
      'transition:transform .35s cubic-bezier(.4,0,.2,1),opacity .35s;' +
      'opacity:0;pointer-events:none;cursor:pointer;white-space:nowrap';

    fab.innerHTML =
      '<span id="ns-fab-label">Buy now</span>' +
      '<span id="ns-fab-sep" style="width:1px;height:16px;background:rgba(242,244,247,.3);margin:0 6px"></span>' +
      '<span id="ns-fab-price" style="color:#D9A04B"></span>';

    /* Determine target */
    var tiers = document.getElementById('tiers');
    var buy   = document.getElementById('buy');

    if (tiers) {
      fab.href = '#tiers';
    } else if (buy) {
      fab.href = '#buy';
    } else {
      fab.href = '/cart';
    }

    document.body.appendChild(fab);
    return fab;
  }

  /* ------------------------------------------------------------------ */
  /*  Label — mirror the PDP selection (price + nights, one-time/sub)    */
  /* ------------------------------------------------------------------ */

  function isSubscribeActive() {
    var sub = document.querySelector('.ns-pdp__purchase-option[data-purchase="subscribe"]');
    return !!(sub && sub.querySelector('.ns-pdp__purchase-radio--active'));
  }

  function updateFab(fab) {
    var labelEl = fab.querySelector('#ns-fab-label');
    var priceEl = fab.querySelector('#ns-fab-price');
    var sepEl   = fab.querySelector('#ns-fab-sep');
    var tier    = document.querySelector('.ns-pdp__tier--active');
    var sub     = isSubscribeActive();

    /* A page can override the FAB label via data-fab-label on #tiers / #buy
       (the landing offer uses "Save 40%"); the PDP falls back to Buy now. */
    var anchor  = document.getElementById('tiers') || document.getElementById('buy');
    var custom  = anchor ? anchor.getAttribute('data-fab-label') : '';
    if (labelEl) labelEl.textContent = custom ? custom : (sub ? 'Subscribe' : 'Buy now');

    var detail = '';
    if (tier) {
      var price = (sub && tier.getAttribute('data-sub-price'))
        ? tier.getAttribute('data-sub-price')
        : tier.getAttribute('data-variant-price');
      var nights = tier.getAttribute('data-nights');
      if (price) detail = price;
      if (nights && !custom) detail += (detail ? ' · ' : '') + nights + ' nights';
    }
    if (priceEl) priceEl.textContent = detail;
    if (sepEl) sepEl.style.display = detail ? '' : 'none';

    /* Landing offer (custom label): show the label only — no price — but keep
       the pill at the width it had with the price so it doesn't shrink. 268px
       (border-box) matches the "Save 40% · $29.90" width; min-width lets a
       longer label grow if needed. */
    if (custom) {
      if (priceEl) priceEl.textContent = '';
      if (sepEl) sepEl.style.display = 'none';
      fab.style.boxSizing = 'border-box';
      fab.style.minWidth = '268px';
      fab.style.justifyContent = 'center';
    }

    fab.setAttribute('aria-label', (sub ? 'Subscribe' : 'Buy now') + (detail ? ' ' + detail : ''));
  }

  /* ------------------------------------------------------------------ */
  /*  Visibility helpers                                                 */
  /* ------------------------------------------------------------------ */

  function showFab(fab) {
    fab.style.transform = 'translateX(-50%) translateY(0)';
    fab.style.opacity   = '1';
    fab.style.pointerEvents = '';
  }

  function hideFab(fab) {
    fab.style.transform = 'translateX(-50%) translateY(80px)';
    fab.style.opacity   = '0';
    fab.style.pointerEvents = 'none';
  }

  /* ------------------------------------------------------------------ */
  /*  Init                                                               */
  /* ------------------------------------------------------------------ */

  function init() {
    var anchor = document.getElementById('tiers') || document.getElementById('buy');
    if (!anchor) return; /* No buy-box on this page — skip FAB */

    var footer = document.querySelector('footer, .ns-footer');
    var fab    = createFab();

    updateFab(fab);
    document.addEventListener('ns:selection', function () { updateFab(fab); });

    var scrolledEnough = false; /* user has scrolled a bit past the top */
    var footerVisible  = false;
    var ctaVisible     = false; /* a real buy CTA is on screen — FAB is redundant */

    function evaluate() {
      if (scrolledEnough && !footerVisible && !ctaVisible) { showFab(fab); }
      else { hideFab(fab); }
    }

    /* Appear once the user scrolls a bit (past ~60% of the first screen) —
       not at the very top — and hide again near the footer. */
    function onScroll() {
      scrolledEnough = window.pageYOffset > (window.innerHeight * 0.6);
      evaluate();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (footer) {
      new IntersectionObserver(function (entries) {
        footerVisible = entries[0].isIntersecting;
        evaluate();
      }, { threshold: 0 }).observe(footer);
    }

    /* Hide the FAB whenever a real buy CTA is in view (the offer's Buy now,
       the closer, or the launch offer) — a floating button that just
       duplicates a button already on screen is noise. */
    var ctaEls = [].slice.call(document.querySelectorAll(
      '#ns-lshop-buy-now, .ns-lbuy__cta, .ns-launch__cta'
    ));
    if (ctaEls.length) {
      var ctaObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target._nsCtaVisible = e.isIntersecting; });
        ctaVisible = ctaEls.some(function (el) { return el._nsCtaVisible; });
        evaluate();
      }, { threshold: 0 });
      ctaEls.forEach(function (el) { ctaObserver.observe(el); });
    }
  }

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
