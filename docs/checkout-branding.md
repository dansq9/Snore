# NightSeals — Checkout branding

Shopify owns the `/checkout` page (Shopify Payments / Stripe run there), so it
**cannot be styled from theme files**. You match it to the NightSeals design in
**Shopify admin → Settings → Checkout → Customize** (the checkout editor / branding).
Everything below maps the design tokens to the fields in that editor.

## Logo
- Upload the **NIGHTSEALS** wordmark (or a monochrome navy version).
- Position: **center**. Max width ~200px.

## Colors
| Editor field | Value | Notes |
|---|---|---|
| Background / Canvas | `#F7F8FA` | Off-white page background |
| Main / Form area | `#FFFFFF` | Card & input background |
| Order summary background | `#EAEDF2` | Light-gray summary panel |
| Accent (primary button) | `#10182B` | Navy — "Pay now" button |
| Button text | `#F7F8FA` | |
| Accent 2 / Links & highlights | `#B27E33` | Dark amber (matches theme kickers/links) |
| Selected/active border | `#D9A04B` | Amber |
| Body text | `#10182B` | |
| Secondary text | `#566072` | |
| Error | keep Shopify default | |

## Typography
- Heading + body font: **Archivo** (upload as a custom font, weights 400–800).
  If a custom font isn't available on your plan, pick the closest system option
  (e.g. a geometric/grotesque sans) — do **not** leave it on a serif default.
- Keep Shopify's default type scale; the brand only needs the family + navy color.

## Shape / corners
- Inputs & buttons corner radius: **10px** (matches the theme's inputs).
- Global corner radius: **rounded** (not "sharp").

## Order summary
- Show the product thumbnail (use the pouch render, `assets/nightseals-pouch.png`).
- The 30-night guarantee + "Ships in 3-5 days" lines can be added as a checkout
  banner/notice if your plan supports custom content blocks.

## Order bump ("Add an extra 30-night pouch — 20% off")
This is **not** branding — it's a checkout UI extension (Shopify Functions / a
checkout app). To build it:
```bash
shopify app generate extension --type checkout_ui_extension --name order-bump
```
Render a checkbox between shipping and payment that adds the "Extra 30-Night Pouch"
variant ($19.95, compare-at $24.95). See `SHOPIFY_BUILD_GUIDE.md` Phase 6 in the
design handoff for the reference component.

## Thank-you / order status page
Customize under the same checkout editor (or Order Status "Additional scripts" on
Plus). Match: animated check, "Thank you for your order", the 4-step timeline, and
the "Back to NightSeals" CTA — colors as above, eyebrow labels in `#B27E33`.

---

### Applying this programmatically (optional)
On Plus / via the Admin GraphQL **checkoutBrandingUpsert** mutation you can set all
of the above in one call (colorScheme, typography, cornerRadius, logo). Ask and I
can generate the full mutation payload from these tokens.
