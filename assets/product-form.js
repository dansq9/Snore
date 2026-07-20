/**
 * NightSeals — Product Form
 *
 * Handles variant selection, subscription toggle, price updates,
 * and "Add to cart" / "Buy now" actions on the PDP.
 *
 * Expected DOM contracts (set via Liquid in the product section):
 *   [data-variant-btn]         — variant selector buttons (data-variant-id)
 *   #ns-product-price          — current price display
 *   #ns-product-compare-price  — compare-at / strikethrough price
 *   #ns-product-per-night      — per-night cost
 *   #ns-product-badge          — savings badge text
 *   #ns-variant-id             — hidden <input> carrying the variant id
 *   #ns-subscribe-toggle       — subscription checkbox / toggle
 *   [data-add-to-cart]         — Add to cart button(s)
 *   [data-buy-now]             — Buy now button(s)
 *   #ns-fab-price              — FAB price label (see fab.js)
 */
(function () {
  'use strict';

  var SUB_DISCOUNT = 0.20; /* 20 % off for subscribers */

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */

  var state = {
    variantId:    null,
    price:        0,      /* cents */
    comparePrice: 0,      /* cents */
    nights:       0,
    isSubscribe:  false
  };

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function fmt(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function qs(sel)  { return document.querySelector(sel); }
  function qsa(sel) { return document.querySelectorAll(sel); }

  /* ------------------------------------------------------------------ */
  /*  Read variant data from the page                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Variant buttons carry data attributes with pricing info set by Liquid:
   *   data-variant-id, data-price, data-compare-price, data-nights
   */
  function getVariantData(btn) {
    return {
      id:           btn.getAttribute('data-variant-id'),
      price:        parseInt(btn.getAttribute('data-price') || '0', 10),
      comparePrice: parseInt(btn.getAttribute('data-compare-price') || '0', 10),
      nights:       parseInt(btn.getAttribute('data-nights') || '0', 10)
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Select variant                                                     */
  /* ------------------------------------------------------------------ */

  function selectVariant(variantId) {
    var btns = qsa('[data-variant-btn]');
    var btn  = null;

    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-variant-id') === String(variantId)) {
        btn = btns[i];
        btns[i].classList.add('is-active');
      } else {
        btns[i].classList.remove('is-active');
      }
    }

    if (!btn) return;

    var data = getVariantData(btn);
    state.variantId    = data.id;
    state.price        = data.price;
    state.comparePrice = data.comparePrice;
    state.nights       = data.nights;

    updatePriceDisplay();
    updateURL(data.id);
    updateHiddenInput(data.id);
  }

  /* ------------------------------------------------------------------ */
  /*  Subscription toggle                                                */
  /* ------------------------------------------------------------------ */

  function setSubscription(on) {
    state.isSubscribe = !!on;
    updatePriceDisplay();
  }

  /* ------------------------------------------------------------------ */
  /*  Price display                                                      */
  /* ------------------------------------------------------------------ */

  function updatePriceDisplay() {
    var effectivePrice = state.isSubscribe
      ? Math.round(state.price * (1 - SUB_DISCOUNT))
      : state.price;

    var comparePrice = state.isSubscribe
      ? state.price              /* show original as compare when subscribed */
      : state.comparePrice;

    /* Main price */
    var priceEl = qs('#ns-product-price');
    if (priceEl) priceEl.textContent = fmt(effectivePrice);

    /* Compare-at price */
    var compareEl = qs('#ns-product-compare-price');
    if (compareEl) {
      if (comparePrice && comparePrice > effectivePrice) {
        compareEl.textContent = fmt(comparePrice);
        compareEl.style.display = '';
      } else {
        compareEl.style.display = 'none';
      }
    }

    /* Per-night cost */
    var perNightEl = qs('#ns-product-per-night');
    if (perNightEl && state.nights > 0) {
      var perNight = effectivePrice / state.nights;
      perNightEl.textContent = '$' + (perNight / 100).toFixed(2) + '/night';
    }

    /* Savings badge */
    var badgeEl = qs('#ns-product-badge');
    if (badgeEl) {
      var savings = comparePrice > effectivePrice ? comparePrice - effectivePrice : 0;
      if (state.isSubscribe) {
        badgeEl.textContent = 'Save 20%';
        badgeEl.style.display = '';
      } else if (savings > 0) {
        badgeEl.textContent = 'Save ' + fmt(savings);
        badgeEl.style.display = '';
      } else {
        badgeEl.style.display = 'none';
      }
    }

    /* FAB price */
    var fabPrice = qs('#ns-fab-price');
    if (fabPrice) fabPrice.textContent = fmt(effectivePrice);
  }

  /* ------------------------------------------------------------------ */
  /*  URL & hidden input                                                 */
  /* ------------------------------------------------------------------ */

  function updateURL(variantId) {
    if (!window.history || !window.history.replaceState) return;
    var url = new URL(window.location.href);
    url.searchParams.set('variant', variantId);
    window.history.replaceState(null, '', url.toString());
  }

  function updateHiddenInput(variantId) {
    var input = qs('#ns-variant-id');
    if (input) input.value = variantId;
  }

  /* ------------------------------------------------------------------ */
  /*  Add to cart with optional subscription prompt                      */
  /* ------------------------------------------------------------------ */

  function handleAddToCart() {
    if (!state.variantId) return;

    /* If one-time and sub-prompt hasn't fired this session, show it */
    if (!state.isSubscribe &&
        !sessionStorage.getItem('ns_sub_prompted') &&
        typeof window.NsSubPrompt === 'object') {
      window.NsSubPrompt.show({
        variantId:  state.variantId,
        price:      state.price,
        nights:     state.nights
      });
      return;
    }

    window.NsCart.add(state.variantId, 1);
  }

  function handleBuyNow() {
    if (!state.variantId) return;
    window.location.href = '/cart/' + state.variantId + ':1';
  }

  /* ------------------------------------------------------------------ */
  /*  Event bindings                                                     */
  /* ------------------------------------------------------------------ */

  document.addEventListener('click', function (e) {
    /* Variant buttons */
    var vBtn = e.target.closest('[data-variant-btn]');
    if (vBtn) {
      selectVariant(vBtn.getAttribute('data-variant-id'));
      return;
    }

    /* Add to cart */
    if (e.target.closest('[data-add-to-cart]')) {
      e.preventDefault();
      handleAddToCart();
      return;
    }

    /* Buy now */
    if (e.target.closest('[data-buy-now]')) {
      e.preventDefault();
      handleBuyNow();
      return;
    }
  });

  /* Subscription toggle */
  document.addEventListener('change', function (e) {
    if (e.target.id === 'ns-subscribe-toggle' || e.target.closest('[data-subscribe-toggle]')) {
      setSubscription(e.target.checked);
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Initialise from URL or first variant                               */
  /* ------------------------------------------------------------------ */

  function init() {
    var params  = new URLSearchParams(window.location.search);
    var urlVar  = params.get('variant');
    var btns    = qsa('[data-variant-btn]');

    if (btns.length === 0) return;

    if (urlVar) {
      selectVariant(urlVar);
    } else {
      /* Default to the first variant */
      var first = btns[0];
      if (first) selectVariant(first.getAttribute('data-variant-id'));
    }
  }

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  /* ------------------------------------------------------------------ */
  /*  Public API (used by sub-prompt)                                    */
  /* ------------------------------------------------------------------ */

  window.NsProduct = {
    select:       selectVariant,
    subscribe:    setSubscription,
    addToCart:     handleAddToCart,
    getState:     function () { return state; }
  };
})();
