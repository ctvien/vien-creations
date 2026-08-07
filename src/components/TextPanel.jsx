import { useEffect, useState } from 'react';
import { FONT_OPTIONS, DEFAULT_FONT, DEFAULT_FONT_SIZE } from '../constants';

export default function TextPanel({ selectedObject, addText, applyFontToSelection, applyFontSizeToSelection }) {
  const [draft, setDraft] = useState('');
  const [font, setFont] = useState(DEFAULT_FONT);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  const selectedIsText = selectedObject?.type === 'i-text';

  // When a text element gets selected, reflect its actual font/size in the
  // controls so they act as an editor for the current selection.
  useEffect(() => {
    if (selectedIsText) {
      setFont(selectedObject.fontFamily);
      setFontSize(Math.round(selectedObject.fontSize));
    }
  }, [selectedObject, selectedIsText]);

  const handleFontChange = (value) => {
    setFont(value);
    if (selectedIsText) applyFontToSelection(value);
  };

  const handleSizeChange = (value) => {
    setFontSize(value);
    if (selectedIsText) applyFontSizeToSelection(value);
  };

  const handleAdd = () => {
    addText(draft, { font, fontSize });
    setDraft('');
  };

  return (
    <div className="section">
      <h2>Text</h2>
      <div className="field">
        <label htmlFor="text-input">Add text</label>
        <input
          id="text-input"
          type="text"
          placeholder="e.g. Happy Birthday"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="font-select">
          Font {selectedIsText && <em>(editing selection)</em>}
        </label>
        <select id="font-select" value={font} onChange={(e) => handleFontChange(e.target.value)}>
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="font-size">Font size ({fontSize}px)</label>
        <input
          id="font-size"
          type="number"
          min={10}
          max={160}
          value={fontSize}
          onChange={(e) => handleSizeChange(Number(e.target.value))}
        />
      </div>
      <button className="btn btn-primary btn-block" onClick={handleAdd} disabled={!draft.trim()}>
        + Add text to coaster
      </button>
    </div>
  );
}
