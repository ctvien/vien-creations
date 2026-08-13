import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, IText, FabricImage, Rect, Gradient, filters, util } from 'fabric';
import {
  SAFE_ZONE_INSET_MM,
  SCREEN_PX_PER_MM,
  CANVAS_SIZE_PX,
  MIN_SAFE_DPI,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  HISTORY_LIMIT,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  PRODUCT_TYPE,
  getFontWeight,
} from '../constants';
import { getEffectiveDPI } from '../utils/dpi';
import { generatePreviewPNGBlob, generateProductionSVGBlob } from '../utils/exportCanvas';
import { submitDesign, DesignSubmitError } from '../utils/api';
import { notifyParentDesignComplete, onParentInit } from '../utils/parentBridge';

const SAFE_ZONE_PX = SAFE_ZONE_INSET_MM * SCREEN_PX_PER_MM;
const SAFE_ZONE_SIZE_PX = CANVAS_SIZE_PX - SAFE_ZONE_PX * 2;

let objectIdCounter = 0;
const nextObjectId = () => `obj_${Date.now()}_${objectIdCounter++}`;

// Is `obj`'s bounding box fully contained within the engraving-safe zone?
function isWithinSafeZone(obj) {
  const box = obj.getBoundingRect(true);
  return (
    box.left >= SAFE_ZONE_PX &&
    box.top >= SAFE_ZONE_PX &&
    box.left + box.width <= SAFE_ZONE_PX + SAFE_ZONE_SIZE_PX &&
    box.top + box.height <= SAFE_ZONE_PX + SAFE_ZONE_SIZE_PX
  );
}

export function useCoasterCanvas(canvasElRef) {
  const fabricRef = useRef(null);
  const backgroundRef = useRef(null);
  const safeZoneRef = useRef(null);
  const historyRef = useRef({ stack: [], index: -1 });
  const restoringRef = useRef(false);

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
  // Which product to design. Only "coaster" exists so far — this just wires
  // up the parent->iframe handoff ahead of more products landing.
  const [productType, setProductType] = useState(PRODUCT_TYPE);

  // The WordPress embed can tell us which product/template to load via
  // postMessage; if that never arrives (standalone dev, or an embed that
  // doesn't bother) we just stay on the PRODUCT_TYPE default.
  useEffect(() => onParentInit(setProductType), []);

  const isDesignObject = (obj) => obj && !obj.isGuide;

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
  }, []);

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
      width: CANVAS_SIZE_PX,
      height: CANVAS_SIZE_PX,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Product mockup background: light wood/slate tone so the canvas reads
    // as a coaster preview rather than a blank white square.
    const background = new Rect({
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      width: CANVAS_SIZE_PX,
      height: CANVAS_SIZE_PX,
      fill: makeWoodGradient(),
      selectable: false,
      evented: false,
      excludeFromExport: false,
      isGuide: true,
    });
    background.set('isGuide', true);
    backgroundRef.current = background;

    const safeZone = new Rect({
      left: SAFE_ZONE_PX,
      top: SAFE_ZONE_PX,
      originX: 'left',
      originY: 'top',
      width: SAFE_ZONE_SIZE_PX,
      height: SAFE_ZONE_SIZE_PX,
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
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasElRef]);

  // --- Actions ---

  const addText = useCallback((text, { font = DEFAULT_FONT, fontSize = DEFAULT_FONT_SIZE } = {}) => {
    const canvas = fabricRef.current;
    if (!canvas || !text.trim()) return;
    const textObj = new IText(text, {
      left: CANVAS_SIZE_PX / 2,
      top: CANVAS_SIZE_PX / 2,
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
  }, []);

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
    const maxDim = SAFE_ZONE_SIZE_PX * 0.8;
    const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
    img.set({
      left: CANVAS_SIZE_PX / 2,
      top: CANVAS_SIZE_PX / 2,
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
  }, []);

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
      { width: CANVAS_SIZE_PX * clamped, height: CANVAS_SIZE_PX * clamped },
      { cssOnly: true }
    );
    setZoom(clamped);
  }, []);

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
      });
      const saved = await submitDesign({
        previewBlob,
        productionBlob,
        productType,
      });
      setReferenceCode(saved.referenceCode);
      setSaveStatus('success');
      notifyParentDesignComplete({
        referenceCode: saved.referenceCode,
        previewImageUrl: saved.previewImageUrl,
        productType: saved.productType || productType,
      });
    } catch (err) {
      setSaveError(
        err instanceof DesignSubmitError
          ? err.message
          : 'Something went wrong saving your design. Please try again.'
      );
      setSaveStatus('error');
    }
  }, [productType]);

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

function makeWoodGradient() {
  return new Gradient({
    type: 'linear',
    coords: { x1: 0, y1: 0, x2: CANVAS_SIZE_PX, y2: CANVAS_SIZE_PX },
    colorStops: [
      { offset: 0, color: '#c8ad88' },
      { offset: 0.5, color: '#b89a72' },
      { offset: 1, color: '#a68a63' },
    ],
  });
}
