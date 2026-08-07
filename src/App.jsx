import { useRef } from 'react';
import { useCoasterCanvas } from './hooks/useCoasterCanvas';
import TextPanel from './components/TextPanel';
import ImagePanel from './components/ImagePanel';
import SelectionPanel from './components/SelectionPanel';
import CanvasControls from './components/CanvasControls';
import ExportPanel from './components/ExportPanel';
import CoasterStage from './components/CoasterStage';
import { COASTER_SIZE_MM, SAFE_ZONE_INSET_MM } from './constants';

export default function App() {
  const canvasElRef = useRef(null);
  const canvas = useCoasterCanvas(canvasElRef);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Vien Creations</h1>
        <span className="subtitle">
          Coaster designer · {COASTER_SIZE_MM}×{COASTER_SIZE_MM}mm · safe zone
          inset {SAFE_ZONE_INSET_MM}mm · Phase 1
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
            exportPNG={canvas.exportPNG}
            exportSVG={canvas.exportSVG}
            referenceCode={canvas.referenceCode}
            lastExport={canvas.lastExport}
          />
        </aside>
      </div>
    </div>
  );
}
