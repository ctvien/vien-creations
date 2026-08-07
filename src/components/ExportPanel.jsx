export default function ExportPanel({ exportPNG, exportSVG, referenceCode, lastExport }) {
  return (
    <div className="section">
      <h2>Export</h2>
      <div className="btn-row">
        <button className="btn btn-primary btn-block" onClick={exportPNG}>
          Export PNG preview
        </button>
      </div>
      <div className="btn-row" style={{ marginTop: 8 }}>
        <button className="btn btn-block" onClick={exportSVG}>
          Export SVG (production)
        </button>
      </div>
      <p className="export-note">
        PNG export is a high-res (~300 DPI) customer-facing preview with the
        coaster mockup background. SVG export drops the background/guides and
        is meant for the laser workflow — note that any uploaded image
        embeds as a raster bitmap inside the SVG, not true vector paths, so
        it still needs tracing/vectorizing before cutting if the laser
        software requires pure vectors. Text exports as real vector shapes.
      </p>
      {referenceCode && (
        <div className="reference-code">
          <div className="code">{referenceCode}</div>
          <div className="meta">
            reference code · {lastExport?.type === 'svg' ? 'SVG' : 'PNG'} export
          </div>
        </div>
      )}
    </div>
  );
}
