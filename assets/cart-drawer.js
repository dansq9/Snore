/**
 * NightSeals — AJAX Cart Drawer
 *
 * Provides add / update / remove operations against the Shopify AJAX Cart API,
 * renders line-items into the static shell defined in snippets/cart-drawer.liquid,
 * and manages the open / close state of the slide-out drawer.
 *
 * Global: window.NsCart  (also aliased to window.NightSeals.Cart for header compat)
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  var FREE_SHIPPING_CENTS = 5000;

  /** Format cents as $XX.XX */
  function fmt(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  /** Resize a Shopify CDN image URL to a given width. */
  function resizeImg(url, width) {
    if (!url) return '';
    return url.replace(/(\.[a-z]+)(\?|$)/, '_' + width + 'x$1$2');
  }

  /** Escape a string for safe insertion into innerHTML. */
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * Pre-load a discount code onto the checkout. Hitting /discount/CODE sets
   * Shopify's discount cookie; the reduction then applies automatically at
   * checkout (the AJAX cart can't show code discounts in its own totals, so
   * this is the supported storefront path). Redirects to /cart.js to keep the
   * response tiny.
   * @param {string} code
   * @returns {Promise}
   */
  function applyDiscount(code) {
    code = (code || '').trim();
    if (!code) return Promise.reject(new Error('empty discount code'));
    return fetch('/discount/' + encodeURIComponent(code) + '?redirect=' +
      encodeURIComponent('/cart.js'), { credentials: 'same-origin' });
  }

  /**
   * Supply tiers for the main product, ascending by price. Rendered as a JSON
   * island in snippets/cart-drawer.liquid so the upsell can find the next tier.
   */
  function getTiers() {
    var el = document.getElementById('ns-cart-tier-data');
    if (!el) return [];
    try {
      var arr = JSON.parse(el.textContent);
      return arr.slice().sort(function (a, b) { return a.price - b.price; });
    } catch (e) { return []; }
  }

  /* ------------------------------------------------------------------ */
  /*  DOM references (cached once on first use)                          */
  /* ------------------------------------------------------------------ */

  var els = {};

  function dom(id) {
    if (!els[id]) els[id] = document.getElementById(id);
    return els[id];
  }

  /* ------------------------------------------------------------------ */
  /*  Shopify AJAX helpers                                               */
  /* ------------------------------------------------------------------ */

  function fetchJSON(url, opts) {
    return fetch(url, opts).then(function (r) { return r.json(); });
  }

  function getCart() {
    return fetchJSON('/cart.js');
  }

  /* ------------------------------------------------------------------ */
  /*  Public cart operations                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Add a variant to the cart.
   * @param {string|number} variantId
   * @param {number}        [quantity=1]
   * @returns {Promise}
   */
  function addToCart(variantId, quantity, sellingPlan) {
    var id = parseInt(variantId, 10);
    if (!id) {
      console.error('[NsCart] add called with an invalid variant id:', variantId,
        '— is a product with variants assigned? (Theme settings → Shop)');
      return Promise.reject(new Error('Invalid variant id'));
    }
    var item = { id: id, quantity: quantity || 1 };
    if (sellingPlan) { item.selling_plan = parseInt(sellingPlan, 10); }
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [item] })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          /* Shopify returns { status, message, description } on failure */
          var msg = (data && (data.description || data.message)) || 'Add to cart failed';
          console.error('[NsCart] /cart/add.js failed:', msg);
          throw new Error(msg);
        }
        return data;
      });
    }).then(function (data) {
      renderCartDrawer();
      openCartDrawer();

      /* First add-to-cart confetti (once per session) */
      if (!sessionStorage.getItem('ns_first_add')) {
        if (typeof window.fireConfetti === 'function') window.fireConfetti();
        sessionStorage.setItem('ns_first_add', '1');
      }

      return data;
    });
  }

  /**
   * Change a line-item quantity (0 removes it).
   * @param {string} key      Shopify line-item key
   * @param {number} quantity
   * @returns {Promise}
   */
  function updateCartItem(key, quantity) {
    return fetchJSON('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    }).then(function () {
      return renderCartDrawer();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  function renderCartDrawer() {
    return getCart().then(function (cart) {
      var drawer     = dom('ns-cart-drawer');
      if (!drawer) return;

      var countEl    = dom('ns-cart-count');
      var shippingEl = dom('ns-cart-shipping');
      var itemsEl    = dom('ns-cart-items');
      var upsellEl   = dom('ns-cart-upsell');
      var footerEl   = dom('ns-cart-footer');
      var emptyEl    = dom('ns-cart-empty');
      var bodyEl     = dom('ns-cart-body');
      var subtotalEl = dom('ns-cart-subtotal');

      /* Also update any floating badge in the header */
      var badges = document.querySelectorAll('.ns-cart-badge, .ns-header__cart-badge');
      for (var b = 0; b < badges.length; b++) {
        badges[b].textContent = cart.item_count;
        badges[b].style.display = cart.item_count > 0 ? '' : 'none';
      }

      /* Item count pill next to title */
      if (countEl) {
        countEl.textContent = cart.item_count;
        countEl.style.display = cart.item_count > 0 ? '' : 'none';
      }

      /* ----- Empty state ----- */
      if (cart.item_count === 0) {
        if (bodyEl)  bodyEl.style.display = 'none';
        if (footerEl) footerEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        return;
      }

      if (bodyEl)  bodyEl.style.display = '';
      if (footerEl) footerEl.style.display = '';
      if (emptyEl) emptyEl.style.display = 'none';

      /* ----- Shipping progress ----- */
      if (shippingEl) {
        var total       = cart.total_price;
        var freeShip    = total >= FREE_SHIPPING_CENTS;
        var gap         = Math.max(0, FREE_SHIPPING_CENTS - total);
        var pct         = Math.min(100, Math.round(total / FREE_SHIPPING_CENTS * 100));

        var shipText = freeShip
          ? '<span class="ns-cart-shipping__check">✓</span> You’ve unlocked free U.S. shipping'
          : 'You’re ' + fmt(gap) + ' away from free U.S. shipping';

        shippingEl.innerHTML =
          '<p class="ns-cart-shipping__text">' + shipText + '</p>' +
          '<div class="ns-cart-shipping__bar">' +
            '<div class="ns-cart-shipping__fill" style="width:' + pct + '%"></div>' +
          '</div>';
      }

      /* ----- Line items ----- */
      if (itemsEl) {
        var html = '';

        for (var i = 0; i < cart.items.length; i++) {
          var item = cart.items[i];
          var img  = resizeImg(item.image, 200);
          var hasCompare = item.original_line_price > item.final_line_price;
          var savings    = hasCompare ? item.original_line_price - item.final_line_price : 0;

          html += '<div class="ns-cart-item">';

          /* Thumbnail */
          html += '<img class="ns-cart-item__img" src="' + img + '" alt="" loading="lazy">';

          /* Info column */
          html += '<div class="ns-cart-item__info">';
          html += '<div class="ns-cart-item__title">' + item.product_title + '</div>';
          if (item.variant_title) {
            html += '<div class="ns-cart-item__variant">' + item.variant_title + '</div>';
          }

          /* Price row */
          html += '<div class="ns-cart-item__price-row">';
          html += '<span>' + fmt(item.final_line_price) + '</span>';
          if (hasCompare) {
            html += '<span class="ns-cart-item__compare-price">' + fmt(item.original_line_price) + '</span>';
          }
          if (savings > 0) {
            html += '<span class="ns-cart-item__savings">Save ' + fmt(savings) + '</span>';
          }
          html += '</div>';

          /* Quantity stepper */
          html += '<div class="ns-cart-item__qty">' +
            '<button class="ns-cart-item__qty-btn" data-cart-qty="' + item.key + '" data-delta="-1" aria-label="Decrease quantity">−</button>' +
            '<div class="ns-cart-item__qty-val">' + item.quantity + '</div>' +
            '<button class="ns-cart-item__qty-btn" data-cart-qty="' + item.key + '" data-delta="1" aria-label="Increase quantity">+</button>' +
          '</div>';

          /* Remove link */
          html += '<button class="ns-cart-item__remove" data-cart-remove="' + item.key + '">Remove</button>';

          html += '</div>'; /* .ns-cart-item__info */
          html += '</div>'; /* .ns-cart-item */
        }

        itemsEl.innerHTML = html;
      }

      /* ----- Upsell (next tier up) ----- */
      renderUpsell(cart);

      /* ----- Footer totals ----- */
      if (subtotalEl) {
        subtotalEl.textContent = fmt(cart.total_price);
      }
      /* (The floating buy bar shows the current product selection, not the
         cart total — it's managed by fab.js, so we don't touch it here.) */
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Upsell — nudge to the next supply tier up                          */
  /* ------------------------------------------------------------------ */

  function renderUpsell(cart) {
    var upsellEl = dom('ns-cart-upsell');
    if (!upsellEl) return;
    upsellEl.innerHTML = '';

    var tiers = getTiers();
    if (tiers.length < 2 || !cart.items || !cart.items.length) return;

    /* Highest tier already in the cart (matched by variant id). */
    var bestIdx = -1, bestItem = null;
    for (var i = 0; i < cart.items.length; i++) {
      var it = cart.items[i];
      for (var t = 0; t < tiers.length; t++) {
        if (tiers[t].id === it.variant_id && t > bestIdx) {
          bestIdx = t; bestItem = it;
        }
      }
    }
    if (bestIdx === -1) return;               /* no recognised tier in cart */
    if (bestIdx >= tiers.length - 1) return;  /* already on the top tier    */

    var cur  = tiers[bestIdx];
    var next = tiers[bestIdx + 1];

    var sub = 'More nights, better value';
    if (cur.perNight && next.perNight && next.perNight < cur.perNight) {
      sub = 'Just ' + fmt(next.perNight) + '/night · save ' +
            fmt(cur.perNight - next.perNight) + '/night';
    }

    var plan = (bestItem.selling_plan_allocation &&
                bestItem.selling_plan_allocation.selling_plan)
      ? bestItem.selling_plan_allocation.selling_plan.id : '';

    upsellEl.innerHTML =
      '<div class="ns-cart-upsell__card">' +
        '<div class="ns-cart-upsell__body">' +
          '<span class="ns-cart-upsell__eyebrow">↑ Upgrade &amp; save</span>' +
          '<span class="ns-cart-upsell__label">' + escapeHtml(next.title) + '</span>' +
          '<span class="ns-cart-upsell__sub">' + escapeHtml(sub) + '</span>' +
        '</div>' +
        '<button type="button" class="ns-cart-upsell__btn" data-cart-upgrade ' +
          'data-from-key="' + escapeHtml(bestItem.key) + '" ' +
          'data-to-id="' + next.id + '" ' +
          'data-qty="' + bestItem.quantity + '"' +
          (plan ? ' data-plan="' + plan + '"' : '') +
        '>Upgrade</button>' +
      '</div>';
  }

  /**
   * Swap the current tier line for the next tier up. Adds the new variant
   * first, then removes the old line, so the cart never momentarily empties.
   */
  function upgradeTier(fromKey, toVariantId, quantity, sellingPlan) {
    var item = { id: parseInt(toVariantId, 10), quantity: parseInt(quantity, 10) || 1 };
    if (sellingPlan) item.selling_plan = parseInt(sellingPlan, 10);
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [item] })
    }).then(function (res) { return res.json(); })
      .then(function () {
        return fetchJSON('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: fromKey, quantity: 0 })
        });
      })
      .then(function () { return renderCartDrawer(); });
  }

  /* ------------------------------------------------------------------ */
  /*  Open / Close                                                       */
  /* ------------------------------------------------------------------ */

  function openCartDrawer() {
    var d = dom('ns-cart-drawer');
    if (!d) return;
    d.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    var d = dom('ns-cart-drawer');
    if (!d) return;
    d.style.display = 'none';
    document.body.style.overflow = '';
  }

  /* ------------------------------------------------------------------ */
  /*  Event delegation                                                   */
  /* ------------------------------------------------------------------ */

  document.addEventListener('click', function (e) {
    var target = e.target;

    /* Close triggers */
    if (target.hasAttribute('data-cart-close') || target.closest('[data-cart-close]')) {
      closeCartDrawer();
      return;
    }

    /* Quantity buttons */
    var qtyBtn = target.closest('[data-cart-qty]');
    if (qtyBtn) {
      var key   = qtyBtn.getAttribute('data-cart-qty');
      var delta = parseInt(qtyBtn.getAttribute('data-delta'), 10);
      var valEl = qtyBtn.parentElement.querySelector('.ns-cart-item__qty-val');
      var cur   = valEl ? parseInt(valEl.textContent, 10) : 1;
      updateCartItem(key, Math.max(0, cur + delta));
      return;
    }

    /* Remove buttons */
    var removeBtn = target.closest('[data-cart-remove]');
    if (removeBtn) {
      updateCartItem(removeBtn.getAttribute('data-cart-remove'), 0);
      return;
    }

    /* Upgrade-to-next-tier button */
    var upBtn = target.closest('[data-cart-upgrade]');
    if (upBtn) {
      upBtn.disabled = true;
      upgradeTier(
        upBtn.getAttribute('data-from-key'),
        upBtn.getAttribute('data-to-id'),
        upBtn.getAttribute('data-qty'),
        upBtn.getAttribute('data-plan')
      ).catch(function () { upBtn.disabled = false; });
      return;
    }

    /* Promo code reveal (shared by drawer + cart page) */
    var promoToggle = target.closest('[data-promo-toggle]');
    if (promoToggle) {
      var promoForm = promoToggle.closest('[data-promo-form]');
      var fields = promoForm && promoForm.querySelector('[data-promo-fields]');
      if (fields) {
        fields.hidden = !fields.hidden;
        if (!fields.hidden) { var inp = fields.querySelector('input'); if (inp) inp.focus(); }
      }
      return;
    }
  });

  /* Promo code submit — Apply button or Enter key (shared by both carts) */
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-promo-form]');
    if (!form) return;
    e.preventDefault();

    var input = form.querySelector('input[name="discount"]');
    var msg   = form.querySelector('[data-promo-msg]');
    var btn   = form.querySelector('[type="submit"]');
    var code  = input ? input.value.trim() : '';
    if (!code) return;

    if (btn) btn.disabled = true;
    applyDiscount(code).then(function () {
      if (msg) {
        msg.hidden = false;
        msg.className = 'ns-promo__msg is-success';
        msg.innerHTML = '<span class="ns-promo__check">✓</span> ' +
          escapeHtml(code.toUpperCase()) + ' applied — discount shows at checkout.';
      }
    }).catch(function () {
      if (msg) {
        msg.hidden = false;
        msg.className = 'ns-promo__msg is-error';
        msg.textContent = 'Couldn’t apply that — you can re-enter it at checkout.';
      }
    }).then(function () { if (btn) btn.disabled = false; });
  });

  /* ------------------------------------------------------------------ */
  /*  Expose globals                                                     */
  /* ------------------------------------------------------------------ */

  var api = {
    add:           addToCart,
    update:        updateCartItem,
    open:          openCartDrawer,
    close:         closeCartDrawer,
    render:        renderCartDrawer,
    applyDiscount: applyDiscount
  };

  window.NsCart = api;

  /* Alias for header compat (header.liquid references NightSeals.Cart) */
  if (!window.NightSeals) window.NightSeals = {};
  window.NightSeals.Cart = api;

  /* Initial render so badge is correct on page load */
  renderCartDrawer();
})();
