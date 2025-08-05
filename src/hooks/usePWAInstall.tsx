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

    // Always show install option for testing (remove this in production)
    if (!isInstalledApp) {
      setIsInstallable(true);
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
    
    if (!deferredPrompt) {
      // Check if we're on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        alert('To install this app on iOS:\n\n1. Tap the Share button (⎋)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm');
      } else {
        // For other browsers that might not support beforeinstallprompt
        alert('To install this app:\n\n1. Open browser menu (⋮)\n2. Look for "Install app" or "Add to Home Screen"\n3. Follow the prompts');
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('User response to install prompt:', outcome);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  return {
    isInstallable: isInstallable && !isInstalled,
    isInstalled,
    installApp,
    canPrompt: !!deferredPrompt
  };
};