import { useRef, useState } from 'react';

export default function ImagePanel({ addImage }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await addImage(file);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="section">
      <h2>Image</h2>
      <label className="file-drop">
        {busy ? 'Processing…' : 'Click to upload a JPG or PNG'}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleChange}
          disabled={busy}
        />
      </label>
      <p className="export-note">
        Images are converted to grayscale automatically, matching how they'll
        look once engraved. You'll get a warning if the resolution is too low
        for its size on the coaster.
      </p>
    </div>
  );
}
