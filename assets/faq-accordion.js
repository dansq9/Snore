/**
 * NightSeals — FAQ Accordion
 *
 * Only one <details> element may be open at a time within each
 * FAQ container.  Uses event delegation on the "toggle" event so
 * it works regardless of how many FAQ sections exist on the page.
 */
(function () {
  'use strict';

  document.addEventListener('toggle', function (e) {
    var details = e.target;
    if (details.tagName !== 'DETAILS' || !details.open) return;

    /* Walk siblings inside the same parent container */
    var parent = details.parentElement;
    if (!parent) return;

    var siblings = parent.querySelectorAll('details');
    for (var i = 0; i < siblings.length; i++) {
      if (siblings[i] !== details && siblings[i].open) {
        siblings[i].removeAttribute('open');
      }
    }
  }, true); /* useCapture — toggle doesn't bubble */
})();
