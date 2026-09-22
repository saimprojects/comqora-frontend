# Comqora logo kit

## Meaning

- **C-shaped outer form:** Commerce; connected orders, stock, delivery, messaging and profit.
- **Central rounded square:** Core; a single operating centre for the seller's workspace.
- **Outward diagonal tail / Q hint:** forward movement and growth. It also differentiates the mark from a plain C.

## Files

- `comqora-logo.png`: full transparent logo for light backgrounds, 1800 × 400.
- `comqora-logo-dark.png`: full transparent logo for dark backgrounds, 1800 × 400.
- `comqora-logo.svg` / `comqora-logo-dark.svg`: portable, self-contained logo lockups. The wordmark is outlined vector lettering; the symbol is the embedded high-resolution generated PNG, not a fully vector-traced mark.
- `comqora-symbol.png`: original selected transparent generated symbol, 1254 × 1254.
- `comqora-symbol-192.png`: small website symbol export.
- `comqora-symbol-32.png` / `comqora-symbol-64.png`: browser tab icons.
- `comqora-symbol-180.png`: touch icon.

All PNG exports retain real alpha transparency. Do not add a white box or a checkerboard background. Use the dark variant on navy/dark surfaces. Avoid stretching, rotating or adding shadows. Retain space around the mark at least equal to the small central square's width. Keep the full logo at least 150 CSS pixels wide; use the symbol alone for smaller placements.

The website palette is electric indigo `#4055D9`, periwinkle `#9AA9FF`, ink `#192339` and dark-theme text `#EEF1FC`. The generated symbol has natural small colour variation; the wordmark uses the exact text colours.

## Production

Concept/symbol: built-in image generation (no API-key/CLI fallback). The approved symbol's genuine transparent alpha was inspected. Attempted AI wordmark exports with a baked checkerboard were rejected; the delivered full logo uses that approved symbol plus a clean outlined lowercase wordmark. Text outlines use Segoe UI Bold, so the exported logo does not depend on font downloads.

Delivery-size exports are rendered by `Frontend/scripts/export-brand.cjs` using Sharp. This does not remove/repaint the approved symbol's background; it preserves the original alpha. The frontend loads the 192px symbol once and renders the outlined wordmark using theme-aware colours.

No trademark registration or trademark-clearance claim is made.
