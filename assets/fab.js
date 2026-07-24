/**
 * NightSeals — Sticky Buy Bar (full-width)
 *
 * A full-width bar pinned to the bottom of the viewport (Hostage-Tape style)
 * that appears once the user scrolls past the first screen and hides near the
 * footer or whenever a real buy CTA is already on screen. It mirrors the offer
 * (discount label + price + per-night) from the on-page buy box, and runs the
 * express Buy-now flow via buy-now.js when a variant can be resolved —
 * otherwise the button's href scrolls to the buy box (#tiers / #buy).
 */
(function () {
  'use strict';

  function textOf(sel) {
    var el = document.querySelector(sel);
    return el ? (el.textContent || '').trim() : '';
  }

  function resolveVariantId() {
    var input = document.getElementById('ns-lshop-variant-input');
    if (input && input.value) return input.value;
    var tier = document.querySelector('.ns-pdp__tier--active[data-variant-id]');
    if (tier) return tier.getAttribute('data-variant-id');
    return '';
  }

  /* ------------------------------------------------------------------ */
  /*  Build the bar                                                      */
  /* ------------------------------------------------------------------ */

  function createBar() {
    var anchor = document.getElementById('tiers') || document.getElementById('buy');
    var href = anchor ? ('#' + anchor.id) : '/cart';

    var bar = document.createElement('div');
    bar.id = 'ns-fab';
    bar.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:60;' +
      'background:#10182B;border-top:1px solid rgba(242,244,247,.09);' +
      'box-shadow:0 -6px 26px rgba(16,24,43,.30);' +
      'transform:translateY(100%);opacity:0;pointer-events:none;' +
      'transition:transform .35s cubic-bezier(.4,0,.2,1),opacity .35s;' +
      'font-family:var(--font-primary,Archivo,system-ui,sans-serif);' +
      'padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));';

    bar.innerHTML =
      '<div style="max-width:1080px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px">' +
        '<div style="min-width:0;color:#F7F8FA;line-height:1.25">' +
          '<div id="ns-fab-title" style="font-weight:800;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>' +
          '<div id="ns-fab-sub" style="font-size:12.5px;color:#D9A04B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>' +
        '</div>' +
        '<a id="ns-fab-btn" href="' + href + '" role="button" aria-label="Buy now" ' +
          'style="flex:none;background:#D9A04B;color:#10182B;font-weight:800;font-size:15px;' +
          'padding:13px 26px;border-radius:999px;text-decoration:none;white-space:nowrap;' +
          'box-shadow:0 8px 22px rgba(217,160,75,.30)">Buy now &rarr;</a>' +
      '</div>';

    document.body.appendChild(bar);
    return bar;
  }

  /* ------------------------------------------------------------------ */
  /*  Fill copy + wire express checkout                                  */
  /* ------------------------------------------------------------------ */

  function updateBar(bar) {
    var titleEl = bar.querySelector('#ns-fab-title');
    var subEl = bar.querySelector('#ns-fab-sub');
    var btn = bar.querySelector('#ns-fab-btn');

    var anchor = document.getElementById('tiers') || document.getElementById('buy');
    var custom = anchor ? anchor.getAttribute('data-fab-label') : '';

    /* Price + per-night, mirrored from the on-page buy box when present. */
    var price = textOf('.ns-lshop__price');
    if (!price) {
      var tier = document.querySelector('.ns-pdp__tier--active');
      if (tier) price = tier.getAttribute('data-variant-price') || '';
    }
    var perNight = textOf('.ns-lshop__offer-sub');

    var title = custom || 'Limited-time offer';
    if (price) { title += ' · ' + price; }
    titleEl.textContent = title;

    subEl.textContent = perNight;
    subEl.style.display = perNight ? '' : 'none';

    /* Express checkout when a variant resolves; else the href scrolls to the
       buy box (buy-now.js only acts on elements carrying a variant id). */
    var vid = resolveVariantId();
    if (vid) {
      btn.setAttribute('data-ns-buy-now', '');
      btn.setAttribute('data-variant-id', vid);
    } else {
      btn.removeAttribute('data-ns-buy-now');
      btn.removeAttribute('data-variant-id');
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Visibility                                                         */
  /* ------------------------------------------------------------------ */

  function show(bar) { bar.style.transform = 'translateY(0)'; bar.style.opacity = '1'; bar.style.pointerEvents = ''; }
  function hide(bar) { bar.style.transform = 'translateY(100%)'; bar.style.opacity = '0'; bar.style.pointerEvents = 'none'; }

  function init() {
    var anchor = document.getElementById('tiers') || document.getElementById('buy');
    if (!anchor) return; /* No buy-box on this page — skip the bar */

    var footer = document.querySelector('footer, .ns-footer');
    var bar = createBar();

    updateBar(bar);
    document.addEventListener('ns:selection', function () { updateBar(bar); });

    var scrolledEnough = false;
    var footerVisible = false;
    var ctaVisible = false; /* a real buy CTA is on screen — the bar is redundant */

    function evaluate() {
      if (scrolledEnough && !footerVisible && !ctaVisible) { show(bar); }
      else { hide(bar); }
    }

    /* Appear once the user scrolls past ~60% of the first screen, not at the
       very top; hide again near the footer. */
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

    /* Hide whenever a real buy CTA is in view (the buy box, the closer, or the
       launch offer) so the bar never covers a button already on screen. */
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
