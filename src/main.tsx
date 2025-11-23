import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('🚀 App starting...');

// Initialize and render app immediately
const root = document.getElementById("root");
if (!root) {
  console.error('❌ Root element not found');
  throw new Error('Root element not found');
}

// Render app immediately
console.log('🎨 Rendering app...');
createRoot(root).render(<App />);
console.log('✅ App rendered successfully');

// Initialize background services after render
(async () => {
  try {
    // Register service worker
    if ('serviceWorker' in navigator) {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('🔄 New content available, will refresh');
        },
        onOfflineReady() {
          console.log('📴 App ready to work offline');
        },
        onRegistered(registration) {
          console.log('✅ Service Worker registered', registration);
        },
        onRegisterError(error) {
          console.error('❌ Service Worker registration error:', error);
        }
      });
    }
  } catch (error) {
    console.warn('⚠️ Service Worker registration failed:', error);
  }

  try {
    // Initialize offline storage in background
    console.log('📦 Initializing offline storage...');
    const { offlineStorage } = await import('./lib/offlineStorage');
    await offlineStorage.init();
    console.log('✅ Offline storage ready');
  } catch (error) {
    console.warn('⚠️ Offline storage init failed:', error);
  }

  try {
    // Load i18n in background
    console.log('📦 Loading i18n...');
    await import('./i18n/config');
    console.log('✅ i18n loaded');
  } catch (error) {
    console.warn('⚠️ i18n failed to load:', error);
  }
})();
