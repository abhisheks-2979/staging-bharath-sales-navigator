import { useNetwork } from '@/contexts/NetworkContext';
import { Wifi, WifiOff, AlertTriangle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function SlowConnectionBanner() {
  const { isOnline, isSlow, connectionQuality, effectiveType, manualOfflineMode, setManualOfflineMode } = useNetwork();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Reset dismissed state when connection status changes significantly
  useEffect(() => {
    if (connectionQuality === 'offline' || (!isOnline && !manualOfflineMode)) {
      setDismissed(false);
      setShowBanner(true);
    } else if (connectionQuality === 'slow') {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [connectionQuality, isOnline, manualOfflineMode]);

  // Don't show if dismissed or no issue
  if (dismissed || (!showBanner && !manualOfflineMode)) {
    return null;
  }

  const isOffline = !isOnline || manualOfflineMode;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[200] px-4 py-2 flex items-center justify-between gap-2 text-sm animate-in slide-in-from-top duration-300",
        isOffline 
          ? "bg-destructive/90 text-destructive-foreground" 
          : "bg-warning/90 text-warning-foreground"
      )}
    >
      <div className="flex items-center gap-2">
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>
              {manualOfflineMode ? 'Working offline (manual)' : 'No internet connection'} 
              {' • Using cached data'}
            </span>
          </>
        ) : isSlow ? (
          <>
            <AlertTriangle className="h-4 w-4" />
            <span>
              Slow connection detected ({effectiveType}) • Some features may be delayed
            </span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {!isOffline && (
          <button
            onClick={() => setManualOfflineMode(true)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Work offline
          </button>
        )}
        
        {manualOfflineMode && (
          <button
            onClick={() => setManualOfflineMode(false)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Go online
          </button>
        )}

        {!isOffline && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-white/20"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// Compact version for use in headers/status bars
export function ConnectionStatusIndicator() {
  const { isOnline, isSlow, manualOfflineMode } = useNetwork();

  if (isOnline && !isSlow && !manualOfflineMode) {
    return null;
  }

  const isOffline = !isOnline || manualOfflineMode;

  return (
    <div 
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
        isOffline 
          ? "bg-destructive/20 text-destructive" 
          : "bg-warning/20 text-warning"
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      ) : (
        <>
          <Wifi className="h-3 w-3" />
          <span>Slow</span>
        </>
      )}
    </div>
  );
}
