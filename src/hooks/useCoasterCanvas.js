import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, IText, FabricImage, Rect, Gradient, filters, util } from 'fabric';
import {
  SCREEN_PX_PER_MM,
  MIN_SAFE_DPI,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  HISTORY_LIMIT,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  getFontWeight,
} from '../constants';
import { getEffectiveDPI } from '../utils/dpi';
import { generatePreviewPNGBlob, generateProductionSVGBlob } from '../utils/exportCanvas';
import { submitDesign, DesignSubmitError } from '../utils/api';
import { notifyParentDesignComplete } from '../utils/parentBridge';

let objectIdCounter = 0;
const nextObjectId = () => `obj_${Date.now()}_${objectIdCounter++}`;

// productConfig is resolved once (by useProductConfig) before this hook is
// ever mounted — see App.jsx, which holds off rendering the canvas until
// then — so it's treated as stable for this hook instance's whole
// lifetime. Physical size / safe-zone inset / background photo all come
// from it, since which product this is can now vary between embeds.
export function useCoasterCanvas(canvasElRef, productConfig) {
  const fabricRef = useRef(null);
  const backgroundRef = useRef(null);
  const safeZoneRef = useRef(null);
  const historyRef = useRef({ stack: [], index: -1 });
  const restoringRef = useRef(false);

  const canvasWidthPx = productConfig.widthMm * SCREEN_PX_PER_MM;
  const canvasHeightPx = productConfig.heightMm * SCREEN_PX_PER_MM;
  const safeZonePx = productConfig.safeZoneInsetMm * SCREEN_PX_PER_MM;
  const safeZoneWidthPx = canvasWidthPx - safeZonePx * 2;
  const safeZoneHeightPx = canvasHeightPx - safeZonePx * 2;

  const [selectedObject, setSelectedObject] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [lowResWarning, setLowResWarning] = useState(false);
  const [outOfBoundsWarning, setOutOfBoundsWarning] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | success | error
  const [saveError, setSaveError] = useState(null);
  const [referenceCode, setReferenceCode] = useState(null);

  const isDesignObject = (obj) => obj && !obj.isGuide;

  // Is `obj`'s bounding box fully contained within the engraving-safe zone?
  const isWithinSafeZone = useCallback(
    (obj) => {
      const box = obj.getBoundingRect(true);
      return (
        box.left >= safeZonePx &&
        box.top >= safeZonePx &&
        box.left + box.width <= safeZonePx + safeZoneWidthPx &&
        box.top + box.height <= safeZonePx + safeZoneHeightPx
      );
    },
    [safeZonePx, safeZoneWidthPx, safeZoneHeightPx]
  );

  const refreshWarnings = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const designObjects = canvas.getObjects().filter(isDesignObject);
    const anyOutOfBounds = designObjects.some((o) => !isWithinSafeZone(o));
    const anyLowRes = designObjects.some(
      (o) => o.type === 'image' && getEffectiveDPI(o) < MIN_SAFE_DPI
    );
    setOutOfBoundsWarning(anyOutOfBounds);
    setLowResWarning(anyLowRes);
    setHasContent(designObjects.length > 0);
    if (safeZoneRef.current) {
      safeZoneRef.current.set({
        stroke: anyOutOfBounds ? '#e2543a' : 'rgba(255,255,255,0.75)',
        strokeWidth: anyOutOfBounds ? 2.5 : 1.5,
      });
      canvas.requestRenderAll();
    }
  }, [isWithinSafeZone]);

  const updateSelectionState = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    setSelectedObject(isDesignObject(active) ? active : null);
  }, []);

  const snapshot = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    return JSON.stringify(
      canvas.getObjects().filter(isDesignObject).map((o) => o.toObject(['id', 'isGuide']))
    );
  }, []);

  const pushHistory = useCallback(() => {
    if (restoringRef.current) return;
    const json = snapshot();
    if (json === null) return;
    const h = historyRef.current;
    const truncated = h.stack.slice(0, h.index + 1);
    truncated.push(json);
    const overflow = truncated.length - HISTORY_LIMIT;
    const trimmed = overflow > 0 ? truncated.slice(overflow) : truncated;
    historyRef.current = { stack: trimmed, index: trimmed.length - 1 };
    setCanUndo(historyRef.current.index > 0);
    setCanRedo(false);
  }, [snapshot]);

  const restoreSnapshot = useCallback(async (json) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    restoringRef.current = true;
    canvas.discardActiveObject();
    canvas.getObjects().filter(isDesignObject).forEach((o) => canvas.remove(o));
    const objects = JSON.parse(json);
    if (objects.length) {
      const enlivened = await util.enlivenObjects(objects);
      enlivened.forEach((o) => canvas.add(o));
    }
    canvas.requestRenderAll();
    refreshWarnings();
    restoringRef.current = false;
  }, [refreshWarnings]);

  const undo = useCallback(async () => {
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index -= 1;
    await restoreSnapshot(h.stack[h.index]);
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  }, [restoreSnapshot]);

  const redo = useCallback(async () => {
    const h = historyRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index += 1;
    await restoreSnapshot(h.stack[h.index]);
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  }, [restoreSnapshot]);

  // --- Canvas setup (once) ---
  useEffect(() => {
    if (!canvasElRef.current) return undefined;

    const canvas = new Canvas(canvasElRef.current, {
      width: canvasWidthPx,
      height: canvasHeightPx,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Product mockup background. Starts as a generic wood-tone gradient
    // placeholder so the canvas never shows a blank white square; if this
    // product has a real background photo configured (set by the shop
    // owner in the WordPress plugin, not the customer), it's swapped in
    // asynchronously below once it finishes loading.
    const background = new Rect({
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      width: canvasWidthPx,
      height: canvasHeightPx,
      fill: makeWoodGradient(canvasWidthPx, canvasHeightPx),
      selectable: false,
      evented: false,
      excludeFromExport: false,
      isGuide: true,
    });
    background.set('isGuide', true);
    backgroundRef.current = background;

    const safeZone = new Rect({
      left: safeZonePx,
      top: safeZonePx,
      originX: 'left',
      originY: 'top',
      width: safeZoneWidthPx,
      height: safeZoneHeightPx,
      fill: 'transparent',
      stroke: 'rgba(255,255,255,0.75)',
      strokeWidth: 1.5,
      strokeDashArray: [8, 6],
      selectable: false,
      evented: false,
      excludeFromExport: true,
      isGuide: true,
    });
    safeZoneRef.current = safeZone;

    canvas.add(background, safeZone);
    canvas.requestRenderAll();

    let cancelled = false;
    if (productConfig.backgroundImageUrl) {
      loadCoverBackgroundImage(productConfig.backgroundImageUrl, canvasWidthPx, canvasHeightPx)
        .then((img) => {
          // Component unmounted, or a newer effect run already tore this
          // canvas down, before the image finished loading.
          if (cancelled || fabricRef.current !== canvas) return;
          img.set({
            selectable: false,
            evented: false,
            excludeFromExport: false,
            isGuide: true,
          });
          const index = canvas.getObjects().indexOf(background);
          canvas.remove(background);
          canvas.insertAt(index, img);
          backgroundRef.current = img;
          canvas.requestRenderAll();
        })
        .catch(() => {
          // Photo failed to load (404, network, CORS) — keep the gradient
          // placeholder rather than leaving a broken/blank canvas.
        });
    }

    const onCommit = () => {
      pushHistory();
      refreshWarnings();
    };
    const onTransform = () => refreshWarnings();

    canvas.on('object:added', (e) => {
      if (e.target && !e.target.isGuide) onCommit();
    });
    canvas.on('object:removed', (e) => {
      if (e.target && !e.target.isGuide) onCommit();
    });
    canvas.on('object:modified', onCommit);
    canvas.on('object:moving', onTransform);
    canvas.on('object:scaling', onTransform);
    canvas.on('object:rotating', onTransform);
    canvas.on('text:editing:exited', onCommit);
    canvas.on('selection:created', updateSelectionState);
    canvas.on('selection:updated', updateSelectionState);
    canvas.on('selection:cleared', updateSelectionState);

    // Seed history with the empty canvas so undo can always get back here.
    historyRef.current = { stack: [snapshot()], index: 0 };
    setCanUndo(false);
    setCanRedo(false);

    return () => {
      cancelled = true;
      canvas.dispose();
      fabricRef.current = null;
    };
    // productConfig is resolved once before this hook is mounted (see the
    // module comment above) and never changes for this instance's
    // lifetime, so it's intentionally left out of the dep array — this
    // effect is meant to run exactly once, like the original single-product
    // version did.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasElRef]);

  // --- Actions ---

  const addText = useCallback((text, { font = DEFAULT_FONT, fontSize = DEFAULT_FONT_SIZE } = {}) => {
    const canvas = fabricRef.current;
    if (!canvas || !text.trim()) return;
    const textObj = new IText(text, {
      left: canvasWidthPx / 2,
      top: canvasHeightPx / 2,
      originX: 'center',
      originY: 'center',
      fontFamily: font,
      fontWeight: getFontWeight(font),
      fontSize,
      fill: '#2b2420',
      id: nextObjectId(),
      isGuide: false,
    });
    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.requestRenderAll();
  }, [canvasWidthPx, canvasHeightPx]);

  const addImage = useCallback(async (file) => {
    const canvas = fabricRef.current;
    if (!canvas || !file) return;

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = await FabricImage.fromURL(dataUrl);

    // Convert to grayscale immediately so the preview matches how the
    // design will actually look once engraved.
    img.filters = [new filters.Grayscale()];
    img.applyFilters();

    // Fit the image inside the safe zone on drop, preserving aspect ratio.
    const maxDim = Math.min(safeZoneWidthPx, safeZoneHeightPx) * 0.8;
    const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
    img.set({
      left: canvasWidthPx / 2,
      top: canvasHeightPx / 2,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
      id: nextObjectId(),
      isGuide: false,
    });

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
  }, [canvasWidthPx, canvasHeightPx, safeZoneWidthPx, safeZoneHeightPx]);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.isGuide) return;
    if (active.type === 'activeselection') {
      active.forEachObject((o) => canvas.remove(o));
    } else {
      canvas.remove(active);
    }
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, []);

  const bringForward = useCallback(() => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active.isGuide) return;
    canvas.bringObjectForward(active);
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const sendBackward = useCallback(() => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active.isGuide) return;
    canvas.sendObjectBackwards(active);
    // Never let a design object fall behind the background/safe-zone guides.
    const bg = backgroundRef.current;
    if (bg && canvas.getObjects().indexOf(active) <= canvas.getObjects().indexOf(bg)) {
      canvas.moveObjectTo(active, 1);
    }
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const clearCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.getObjects().filter(isDesignObject).forEach((o) => canvas.remove(o));
    canvas.requestRenderAll();
    setSaveStatus('idle');
    setSaveError(null);
    setReferenceCode(null);
  }, []);

  const setZoomClamped = useCallback((next) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    canvas.setDimensions(
      { width: canvasWidthPx * clamped, height: canvasHeightPx * clamped },
      { cssOnly: true }
    );
    setZoom(clamped);
  }, [canvasWidthPx, canvasHeightPx]);

  const zoomIn = useCallback(() => setZoomClamped(zoom + ZOOM_STEP), [zoom, setZoomClamped]);
  const zoomOut = useCallback(() => setZoomClamped(zoom - ZOOM_STEP), [zoom, setZoomClamped]);
  const zoomReset = useCallback(() => setZoomClamped(1), [setZoomClamped]);

  const applyFontToSelection = useCallback((font) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!active || active.type !== 'i-text') return;
    active.set({ fontFamily: font, fontWeight: getFontWeight(font) });
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const applyFontSizeToSelection = useCallback((size) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!active || active.type !== 'i-text') return;
    active.set('fontSize', size);
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  // Generates the preview PNG + production SVG and hands them to the backend,
  // which owns reference-code generation (so it can guarantee uniqueness
  // against every design ever saved, not just this browser tab). Safe to
  // call again after a failure — nothing about a failed attempt is
  // persisted client- or server-side, so retrying just re-submits.
  const confirmDesign = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const previewBlob = generatePreviewPNGBlob(canvas, { safeZoneRect: safeZoneRef.current });
      const productionBlob = generateProductionSVGBlob(canvas, {
        backgroundRect: backgroundRef.current,
        safeZoneRect: safeZoneRef.current,
        widthMm: productConfig.widthMm,
        heightMm: productConfig.heightMm,
        canvasWidthPx,
        canvasHeightPx,
      });
      const saved = await submitDesign({
        previewBlob,
        productionBlob,
        productType: productConfig.productType,
      });
      setReferenceCode(saved.referenceCode);
      setSaveStatus('success');
      notifyParentDesignComplete({
        referenceCode: saved.referenceCode,
        previewImageUrl: saved.previewImageUrl,
        productType: saved.productType || productConfig.productType,
      });
    } catch (err) {
      setSaveError(
        err instanceof DesignSubmitError
          ? err.message
          : 'Something went wrong saving your design. Please try again.'
      );
      setSaveStatus('error');
    }
  }, [productConfig.productType, productConfig.widthMm, productConfig.heightMm, canvasWidthPx, canvasHeightPx]);

  return {
    selectedObject,
    zoom,
    canUndo,
    canRedo,
    lowResWarning,
    outOfBoundsWarning,
    hasContent,
    saveStatus,
    saveError,
    referenceCode,
    addText,
    addImage,
    deleteSelected,
    bringForward,
    sendBackward,
    undo,
    redo,
    clearCanvas,
    zoomIn,
    zoomOut,
    zoomReset,
    applyFontToSelection,
    applyFontSizeToSelection,
    confirmDesign,
  };
}

function makeWoodGradient(widthPx, heightPx) {
  return new Gradient({
    type: 'linear',
    coords: { x1: 0, y1: 0, x2: widthPx, y2: heightPx },
    colorStops: [
      { offset: 0, color: '#c8ad88' },
      { offset: 0.5, color: '#b89a72' },
      { offset: 1, color: '#a68a63' },
    ],
  });
}

// Loads a shop-configured product photo and scales it to fully cover the
// canvas (like CSS background-size: cover) so it reads as an edge-to-edge
// product mockup regardless of the photo's own aspect ratio. crossOrigin
// is required here: the photo is served from the WordPress site, a
// different origin than this app, and without it the canvas would be
// "tainted" and every export (toDataURL/toSVG) would start throwing —
// this only works if that origin actually sends CORS headers for the
// image (see the WordPress plugin's background-image proxy endpoint).
async function loadCoverBackgroundImage(url, targetWidthPx, targetHeightPx) {
  const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
  const scale = Math.max(targetWidthPx / img.width, targetHeightPx / img.height);
  img.set({
    left: targetWidthPx / 2,
    top: targetHeightPx / 2,
    originX: 'center',
    originY: 'center',
    scaleX: scale,
    scaleY: scale,
  });
  return img;
}
