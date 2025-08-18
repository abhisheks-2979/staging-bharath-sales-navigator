import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// PWA service worker will be auto-registered by VitePWA plugin

createRoot(document.getElementById("root")!).render(<App />);
