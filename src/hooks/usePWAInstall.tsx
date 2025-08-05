import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isInstalledApp = isStandalone || isIOSStandalone;
    setIsInstalled(isInstalledApp);

    // Always show install option for testing, but check browser capability
    if (!isInstalledApp) {
      // Check if browser supports PWA installation
      const supportsInstall = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsInstallable(supportsInstall);
    }

    const handler = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const appInstalledHandler = () => {
      console.log('App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);

    // Log current state for debugging
    console.log('PWA Install Hook initialized:', {
      isStandalone,
      isIOSStandalone,
      isInstalled: isInstalledApp,
      userAgent: navigator.userAgent
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const installApp = async () => {
    console.log('Install button clicked, deferredPrompt:', !!deferredPrompt);
    
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log('User response to install prompt:', outcome);
        
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        
        setDeferredPrompt(null);
        setIsInstallable(false);
        return;
      } catch (error) {
        console.error('Install failed:', error);
      }
    }

    // Fallback for browsers that don't support beforeinstallprompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      const isInApp = (window.navigator as any).standalone === true;
      if (!isInApp) {
        alert('To install this app on iOS:\n\n1. Tap the Share button (⎋) at the bottom\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm\n\nThis will create a native app icon on your home screen!');
      }
    } else if (isAndroid) {
      // Try to trigger Chrome's install banner manually
      alert('To install this app:\n\n1. Tap the menu (⋮) in your browser\n2. Look for "Install app" or "Add to Home Screen"\n3. Follow the prompts\n\nThis will install the app as a native application!');
    } else {
      // Desktop browsers
      alert('To install this app:\n\n1. Look for an install icon (⬇) in your address bar\n2. Or check browser menu for "Install app"\n3. Follow the installation prompts\n\nThis will install the app to your desktop!');
    }
  };

  return {
    isInstallable: isInstallable && !isInstalled,
    isInstalled,
    installApp,
    canPrompt: !!deferredPrompt
  };
};