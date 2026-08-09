export default function ExportPanel({ hasContent, saveStatus, saveError, referenceCode, confirmDesign }) {
  const saving = saveStatus === 'saving';

  return (
    <div className="section">
      <h2>Save design</h2>

      {saveStatus !== 'success' && (
        <>
          <button
            className="btn btn-primary btn-block"
            onClick={confirmDesign}
            disabled={!hasContent || saving}
          >
            {saving ? 'Saving…' : 'Confirm design'}
          </button>
          <p className="export-note">
            {hasContent
              ? 'Saves a high-res preview and a production file for the laser workflow, and gives you a reference code to use at checkout.'
              : 'Add some text or an image to the coaster before saving.'}
          </p>
        </>
      )}

      {saveStatus === 'error' && (
        <div className="warning-banner" style={{ marginTop: 10 }}>
          ⚠ {saveError} Your design hasn't been lost — it's still right here, just retry when ready.
        </div>
      )}

      {saveStatus === 'success' && (
        <div className="reference-code reference-code-success">
          <div className="meta">Your design is saved</div>
          <div className="code">{referenceCode}</div>
          <p className="export-note">
            You'll see this code again at checkout — screenshot it or write it
            down.
          </p>
          <button className="btn btn-block" style={{ marginTop: 10 }} onClick={confirmDesign}>
            Save changes as a new design
          </button>
        </div>
      )}
    </div>
  );
}
