function labelFor(type) {
  if (type === 'i-text') return 'Text';
  if (type === 'activeselection') return 'Multiple elements';
  return 'Image';
}

export default function SelectionPanel({ selectedObject, deleteSelected, bringForward, sendBackward }) {
  return (
    <div className="section">
      <h2>Selected element</h2>
      {!selectedObject ? (
        <p className="selection-empty">Click an element on the coaster to select it.</p>
      ) : (
        <>
          <span className="badge">{labelFor(selectedObject.type)}</span>
          <div className="btn-row" style={{ marginBottom: 8 }}>
            <button className="btn" onClick={sendBackward}>
              ↓ Backward
            </button>
            <button className="btn" onClick={bringForward}>
              ↑ Forward
            </button>
          </div>
          <button className="btn btn-danger btn-block" onClick={deleteSelected}>
            Delete element
          </button>
        </>
      )}
    </div>
  );
}
