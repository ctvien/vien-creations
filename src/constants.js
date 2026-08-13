// Phase 1: single product. Sent to the backend as designs.product_type so
// the schema is ready for more products later without a migration.
export const PRODUCT_TYPE = 'coaster';

// Physical dimensions of the coaster product (Phase 1: single square coaster)
export const COASTER_SIZE_MM = 90;
export const SAFE_ZONE_INSET_MM = 5;

// On-screen rendering scale. The Fabric canvas is built at this resolution
// (px per mm) for comfortable editing; high-res export uses a multiplier
// on top of this, so the interactive canvas never needs to be huge.
export const SCREEN_PX_PER_MM = 8;
export const CANVAS_SIZE_PX = COASTER_SIZE_MM * SCREEN_PX_PER_MM; // 720px

// Export quality target for the customer-preview PNG.
export const EXPORT_DPI = 300;
export const MM_PER_INCH = 25.4;

// Below this effective DPI (at current on-canvas size) we warn the customer
// that an uploaded image will look soft/pixelated once engraved.
export const MIN_SAFE_DPI = 150;

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;

export const HISTORY_LIMIT = 50;

// Fonts chosen for laser engraving: bold/medium weight sans-serifs that hold
// up as clean single-stroke or filled paths, plus one script style for
// customers who want a handwritten look. All loaded at weights >= 500 —
// thin weights break up or disappear when actually burned into the material.
export const FONT_OPTIONS = [
  { label: 'Montserrat (sans)', value: '"Montserrat", sans-serif', weight: 600 },
  { label: 'Poppins (sans)', value: '"Poppins", sans-serif', weight: 600 },
  { label: 'Oswald (condensed)', value: '"Oswald", sans-serif', weight: 500 },
  { label: 'Roboto Slab (serif)', value: '"Roboto Slab", serif', weight: 500 },
  { label: 'Playfair Display (serif)', value: '"Playfair Display", serif', weight: 600 },
  { label: 'Dancing Script (script)', value: '"Dancing Script", cursive', weight: 700 },

  // Web-safe system fonts — no webfont download needed, every OS ships a
  // real bold face for these, so weight 700 is genuine bold, not faked.
  { label: 'Georgia (serif)', value: 'Georgia, "Times New Roman", serif', weight: 700 },
  { label: 'Times New Roman (serif)', value: '"Times New Roman", Times, serif', weight: 700 },
  { label: 'Arial (sans)', value: 'Arial, Helvetica, sans-serif', weight: 700 },
  { label: 'Verdana (sans)', value: 'Verdana, Geneva, sans-serif', weight: 700 },

  // Google Fonts with a real bold weight available.
  { label: 'Cinzel (serif)', value: '"Cinzel", serif', weight: 700 },
  { label: 'Cormorant Garamond (serif)', value: '"Cormorant Garamond", serif', weight: 700 },

  // Google Fonts script styles that only ship a single (regular) weight —
  // there's no true bold face to load for these, so weight 700 here relies
  // on the browser's synthetic/faux-bold instead of a real font file. It
  // still thickens the strokes somewhat over regular, just less reliably
  // than a true bold weight would, since the browser is inventing it.
  { label: 'Great Vibes (script)', value: '"Great Vibes", cursive', weight: 700 },
  { label: 'Allura (script)', value: '"Allura", cursive', weight: 700 },
  { label: 'Alex Brush (script)', value: '"Alex Brush", cursive', weight: 700 },
  { label: 'Parisienne (script)', value: '"Parisienne", cursive', weight: 700 },
  { label: 'Sacramento (script)', value: '"Sacramento", cursive', weight: 700 },
];

export const DEFAULT_FONT = FONT_OPTIONS[0].value;
export const DEFAULT_FONT_SIZE = 36;

export function getFontWeight(fontFamilyValue) {
  return FONT_OPTIONS.find((f) => f.value === fontFamilyValue)?.weight ?? 400;
}
