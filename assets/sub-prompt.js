/**
 * NightSeals — Subscription Prompt
 *
 * Shown once per session when the customer clicks "Add to cart" without
 * a subscription selected.  Compares one-time vs. subscribe pricing and
 * lets the customer choose.
 *
 * Markup: snippets/sub-prompt.liquid
 * Global: window.NsSubPrompt
 */
(function () {
  'use strict';

  var STORAGE_KEY   = 'ns_sub_prompted';
  var SUB_DISCOUNT  = 0.20;

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function fmt(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */

  var pending = null; /* { variantId, price, nights } */

  /* ------------------------------------------------------------------ */
  /*  Open / Close                                                       */
  /* ------------------------------------------------------------------ */

  function open() {
    var el = document.getElementById('ns-sub-prompt');
    if (!el) return;
    el.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function close() {
    var el = document.getElementById('ns-sub-prompt');
    if (!el) return;
    el.style.display = 'none';
    document.body.style.overflow = '';
    sessionStorage.setItem(STORAGE_KEY, '1');
  }

  /* ------------------------------------------------------------------ */
  /*  Show with context                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * @param {{ variantId: string, price: number, nights: number }} opts
   */
  function show(opts) {
    pending = opts;

    var savings   = Math.round(opts.price * SUB_DISCOUNT);
    var nightsEl  = document.getElementById('ns-sub-nights');
    var savingsEl = document.getElementById('ns-sub-savings');

    if (nightsEl) nightsEl.textContent = opts.nights || '';
    if (savingsEl) savingsEl.textContent = fmt(savings);

    open();
  }

  /* ------------------------------------------------------------------ */
  /*  Button handlers                                                    */
  /* ------------------------------------------------------------------ */

  document.addEventListener('click', function (e) {
    /* Close triggers (backdrop + close button) */
    if (e.target.hasAttribute('data-sub-close') ||
        e.target.closest('[data-sub-close]')) {
      close();
      return;
    }

    /* Subscribe & Save */
    if (e.target.id === 'ns-sub-subscribe-btn' || e.target.closest('#ns-sub-subscribe-btn')) {
      close();
      if (!pending) return;

      /* Activate subscription in product-form, then add to cart */
      if (window.NsProduct) {
        window.NsProduct.subscribe(true);
        /* Toggle the checkbox UI as well */
        var toggle = document.getElementById('ns-subscribe-toggle');
        if (toggle) toggle.checked = true;
      }
      if (window.NsCart) {
        window.NsCart.add(pending.variantId, 1);
      }
      pending = null;
      return;
    }

    /* Continue with one-time purchase */
    if (e.target.id === 'ns-sub-onetime-btn' || e.target.closest('#ns-sub-onetime-btn')) {
      close();
      if (!pending) return;

      if (window.NsCart) {
        window.NsCart.add(pending.variantId, 1);
      }
      pending = null;
      return;
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  window.NsSubPrompt = {
    show: show,
    close: close
  };
})();
