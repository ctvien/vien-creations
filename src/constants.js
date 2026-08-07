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
];

export const DEFAULT_FONT = FONT_OPTIONS[0].value;
export const DEFAULT_FONT_SIZE = 36;
