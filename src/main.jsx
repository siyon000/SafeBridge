import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Polyfills for WebTorrent
import { Buffer } from 'buffer'
import process from 'process'
import path from 'path-browserify'

// Set global values needed for WebTorrent
window.Buffer = Buffer
window.process = process
window.path = path
window.global = window

// Mock Node.js-specific functions that might be used
if (!path.join) {
  path.join = (...args) => args.join('/').replace(/\/+/g, '/');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)