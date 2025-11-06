import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config';
import { forceCompleteRefresh } from './utils/forceRefresh';

// PWA service worker will be auto-registered by VitePWA plugin

// Global error handler for cache-related React errors
window.addEventListener('error', (event) => {
  const error = event.error;
  if (error && (
    error.message?.includes('Cannot read properties of null') ||
    error.message?.includes('Invalid hook call') ||
    error.stack?.includes('useState')
  )) {
    console.error('Critical React bundling error detected. Forcing refresh...');
    event.preventDefault();
    forceCompleteRefresh();
  }
});

// Check for cached React issues on startup
const checkReactIntegrity = () => {
  try {
    // Test if React is properly loaded
    if (!React || typeof React.useState !== 'function') {
      console.error('React not properly loaded. Forcing refresh...');
      forceCompleteRefresh();
      return false;
    }
    return true;
  } catch (error) {
    console.error('React integrity check failed:', error);
    forceCompleteRefresh();
    return false;
  }
};

if (checkReactIntegrity()) {
  createRoot(document.getElementById("root")!).render(<App />);
}
