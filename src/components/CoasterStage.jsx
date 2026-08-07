export default function CoasterStage({
  canvasElRef,
  zoom,
  zoomIn,
  zoomOut,
  zoomReset,
  outOfBoundsWarning,
  lowResWarning,
}) {
  return (
    <div className="canvas-area">
      <div className="warnings">
        {outOfBoundsWarning && (
          <div className="warning-banner">
            ⚠ One or more elements extend outside the dashed engraving-safe
            zone.
          </div>
        )}
        {lowResWarning && (
          <div className="warning-banner">
            ⚠ An uploaded image is below ~150 DPI at its current size — it
            may look soft once engraved. Try a higher-res image or shrink it.
          </div>
        )}
      </div>
      <div className="canvas-scroll">
        <div className="canvas-frame">
          <canvas ref={canvasElRef} />
        </div>
      </div>
      <div className="zoom-controls">
        <button className="btn" onClick={zoomOut}>
          −
        </button>
        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
        <button className="btn" onClick={zoomIn}>
          +
        </button>
        <button className="btn" onClick={zoomReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
