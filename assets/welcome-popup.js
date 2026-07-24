/**
 * NightSeals — Welcome Popup
 *
 * Shows a first-visit email-capture popup after a short delay.
 * On submission, reveals a promo code (SEAL10) with click-to-copy.
 * Uses sessionStorage so the popup only appears once per session.
 *
 * Markup: snippets/welcome-popup.liquid
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ns_welcome_seen';
  var DELAY_MS    = 3000;

  /* Skip entirely if already shown this session */
  if (sessionStorage.getItem(STORAGE_KEY)) return;

  /* ------------------------------------------------------------------ */
  /*  DOM references                                                     */
  /* ------------------------------------------------------------------ */

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var popup      = document.getElementById('ns-welcome-popup');
    var form       = document.getElementById('ns-welcome-form');
    var successEl  = document.getElementById('ns-welcome-success');
    var copyBtn    = document.getElementById('ns-welcome-copy-btn');
    var codeBox    = document.getElementById('ns-welcome-code-box');

    if (!popup || !form) return;

    /* -------------------------------------------------------------- */
    /*  Open after delay                                               */
    /* -------------------------------------------------------------- */

    setTimeout(function () {
      popup.style.display = 'block';
      document.body.style.overflow = 'hidden';
      /* Mark as seen the moment it opens, so it only appears on the first-entry
         page — navigating to another page this session won't show it again. */
      sessionStorage.setItem(STORAGE_KEY, '1');
    }, DELAY_MS);

    /* -------------------------------------------------------------- */
    /*  Close                                                          */
    /* -------------------------------------------------------------- */

    function close() {
      popup.style.display = 'none';
      document.body.style.overflow = '';
      sessionStorage.setItem(STORAGE_KEY, '1');
    }

    popup.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-welcome-close') ||
          e.target.closest('[data-welcome-close]')) {
        close();
      }
    });

    /* -------------------------------------------------------------- */
    /*  Form submit -> reveal code                                     */
    /* -------------------------------------------------------------- */

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('input[type="email"]');
      if (!email || !email.value) return;

      /* Optionally post to Shopify customer form or Klaviyo here */

      /* Pre-load the promo code onto the checkout so the shopper doesn't have
         to re-type it. Hitting /discount/CODE sets Shopify's discount cookie;
         the reduction is then applied automatically at checkout. Fire-and-
         forget — a failure here never blocks the code reveal. */
      var codeEl = successEl && successEl.querySelector('.ns-welcome__code');
      var code   = codeEl ? codeEl.textContent.trim() : '';
      if (code) {
        try {
          fetch('/discount/' + encodeURIComponent(code) + '?redirect=' +
                encodeURIComponent('/cart.js'), { credentials: 'same-origin' });
        } catch (err) { /* no-op */ }
      }

      form.style.display = 'none';
      if (successEl) successEl.style.display = '';

      sessionStorage.setItem(STORAGE_KEY, '1');
    });

    /* -------------------------------------------------------------- */
    /*  Click to copy                                                  */
    /* -------------------------------------------------------------- */

    if (copyBtn && codeBox) {
      function copyCode() {
        var code = codeBox.querySelector('.ns-welcome__code');
        var text = code ? code.textContent.trim() : '';
        if (!text) return;

        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = 'Copied!';
          setTimeout(function () {
            copyBtn.textContent = 'Click to copy';
          }, 2000);
        });
      }

      copyBtn.addEventListener('click', copyCode);
      codeBox.addEventListener('click', copyCode);
    }
  });
})();
