export default function CanvasControls({ canUndo, canRedo, undo, redo, clearCanvas }) {
  const handleClear = () => {
    if (window.confirm('Clear the whole design and start over?')) {
      clearCanvas();
    }
  };

  return (
    <div className="section">
      <h2>Canvas</h2>
      <div className="btn-row" style={{ marginBottom: 8 }}>
        <button className="btn" onClick={undo} disabled={!canUndo}>
          ↶ Undo
        </button>
        <button className="btn" onClick={redo} disabled={!canRedo}>
          ↷ Redo
        </button>
      </div>
      <button className="btn btn-danger btn-block" onClick={handleClear}>
        Clear canvas
      </button>
    </div>
  );
}
