import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// No StrictMode: Fabric.js owns real canvas/DOM state and its dispose() is
// async, so React's dev-mode double-invoke of effects (mount, cleanup,
// mount) races a fresh Canvas init against the previous one's teardown and
// corrupts rendering (canvas ends up scaled/painted incorrectly).
createRoot(document.getElementById('root')).render(<App />)
