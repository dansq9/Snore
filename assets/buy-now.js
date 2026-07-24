/**
 * NightSeals — Buy Now (shared)
 *
 * Any element tagged with [data-ns-buy-now] and a [data-variant-id] starts a
 * single-item express checkout: clear whatever is in the cart, add just this
 * variant, then go straight to /checkout. Uses event delegation so it also
 * covers CTAs rendered by any section (launch offer, closer, etc.).
 *
 * The element keeps its href as a no-JS fallback (usually #tiers), so if this
 * script fails to load the CTA still does something sensible.
 */
(function () {
  'use strict';

  function itemFor(el) {
    var id = el.getAttribute('data-variant-id');
    if (!id) return null;
    var n = parseInt(id, 10);
    if (!n) return null;
    return { id: n, quantity: 1 };
  }

  function buyNow(el) {
    var item = itemFor(el);
    if (!item) return false; /* let the href fallback handle it */
    if (el.dataset.nsBusy) return true;
    el.dataset.nsBusy = '1';

    function release() { delete el.dataset.nsBusy; }
    function fail(err) {
      console.error('[NightSeals] Buy now could not start checkout:', err);
      release();
    }

    function addAndCheckout() {
      return fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: [item] })
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) { throw new Error((data && (data.description || data.message)) || 'Add to cart failed'); }
            return data;
          });
        })
        .then(function () { window.location.href = '/checkout'; });
    }

    /* Only clear when there's actually something to clear */
    fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        if (cart && cart.item_count > 0) {
          return fetch('/cart/clear.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).then(function () { return addAndCheckout(); });
        }
        return addAndCheckout();
      })
      .catch(fail);

    return true;
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-ns-buy-now]') : null;
    if (!el) return;
    if (buyNow(el)) { e.preventDefault(); }
  });
})();
