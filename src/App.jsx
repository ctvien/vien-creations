import { useRef } from 'react';
import { useCoasterCanvas } from './hooks/useCoasterCanvas';
import { useProductConfig } from './hooks/useProductConfig';
import TextPanel from './components/TextPanel';
import ImagePanel from './components/ImagePanel';
import SelectionPanel from './components/SelectionPanel';
import CanvasControls from './components/CanvasControls';
import ExportPanel from './components/ExportPanel';
import CoasterStage from './components/CoasterStage';

export default function App() {
  const productConfig = useProductConfig();

  // Physical size / safe-zone / background all come from productConfig, so
  // the canvas can't be built until it resolves (from the WordPress
  // parent's vien_init message, or the default after a brief wait — see
  // useProductConfig). Keeping this gate here, rather than inside
  // useCoasterCanvas, means that hook never has to deal with the config
  // changing out from under an already-built canvas.
  if (!productConfig) {
    return (
      <div className="app app-loading">
        <p>Loading designer…</p>
      </div>
    );
  }

  return <ConfiguratorApp productConfig={productConfig} />;
}

function ConfiguratorApp({ productConfig }) {
  const canvasElRef = useRef(null);
  const canvas = useCoasterCanvas(canvasElRef, productConfig);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Vien Creations</h1>
        <span className="subtitle">
          {productConfig.productLabel} designer · {productConfig.widthMm}×
          {productConfig.heightMm}mm · safe zone inset{' '}
          {productConfig.safeZoneInsetMm}mm
        </span>
      </header>
      <div className="app-body">
        <aside className="panel panel-left">
          <TextPanel
            selectedObject={canvas.selectedObject}
            addText={canvas.addText}
            applyFontToSelection={canvas.applyFontToSelection}
            applyFontSizeToSelection={canvas.applyFontSizeToSelection}
          />
          <ImagePanel addImage={canvas.addImage} />
        </aside>

        <main>
          <CoasterStage
            canvasElRef={canvasElRef}
            zoom={canvas.zoom}
            zoomIn={canvas.zoomIn}
            zoomOut={canvas.zoomOut}
            zoomReset={canvas.zoomReset}
            outOfBoundsWarning={canvas.outOfBoundsWarning}
            lowResWarning={canvas.lowResWarning}
          />
        </main>

        <aside className="panel panel-right">
          <SelectionPanel
            selectedObject={canvas.selectedObject}
            deleteSelected={canvas.deleteSelected}
            bringForward={canvas.bringForward}
            sendBackward={canvas.sendBackward}
          />
          <CanvasControls
            canUndo={canvas.canUndo}
            canRedo={canvas.canRedo}
            undo={canvas.undo}
            redo={canvas.redo}
            clearCanvas={canvas.clearCanvas}
          />
          <ExportPanel
            hasContent={canvas.hasContent}
            saveStatus={canvas.saveStatus}
            saveError={canvas.saveError}
            referenceCode={canvas.referenceCode}
            confirmDesign={canvas.confirmDesign}
          />
        </aside>
      </div>
    </div>
  );
}
