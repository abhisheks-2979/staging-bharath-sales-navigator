import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

console.log('🚀 App starting...');

// Register service worker for PWA
const updateSW = registerSW({
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

// Simple, reliable startup
const startApp = async () => {
  try {
    console.log('📦 Initializing offline storage...');
    const { offlineStorage } = await import('./lib/offlineStorage');
    await offlineStorage.init();
    console.log('✅ Offline storage ready');
  } catch (error) {
    console.warn('⚠️ Offline storage init failed, continuing anyway:', error);
  }

  try {
    console.log('📦 Loading i18n...');
    await import('./i18n/config');
    console.log('✅ i18n loaded');
  } catch (error) {
    console.warn('⚠️ i18n failed to load, continuing anyway:', error);
  }

  console.log('🎨 Rendering app...');
  const root = document.getElementById("root");
  if (root) {
    createRoot(root).render(<App />);
    console.log('✅ App rendered successfully');
  } else {
    console.error('❌ Root element not found');
  }
};

startApp();
