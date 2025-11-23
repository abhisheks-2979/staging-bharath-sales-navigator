import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('🚀 App starting...');

// Simple, reliable startup
const startApp = async () => {
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
