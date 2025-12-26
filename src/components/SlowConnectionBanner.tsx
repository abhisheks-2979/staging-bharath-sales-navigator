import { useNetwork } from '@/contexts/NetworkContext';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function SlowConnectionBanner() {
  const { isOnline, isSlow, connectionQuality, manualOfflineMode, setManualOfflineMode } = useNetwork();
  const [expanded, setExpanded] = useState(false);

  const isOffline = !isOnline || manualOfflineMode;
  
  // Don't show if connection is good
  if (isOnline && !isSlow && !manualOfflineMode) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-[200]">
      {/* Small floating indicator */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all",
          isOffline 
            ? "bg-destructive text-destructive-foreground" 
            : "bg-warning text-warning-foreground"
        )}
        aria-label={isOffline ? "Offline" : "Slow connection"}
      >
        {isOffline ? (
          <WifiOff className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
      </button>

      {/* Expanded tooltip */}
      {expanded && (
        <div 
          className={cn(
            "absolute bottom-12 right-0 w-48 p-3 rounded-lg shadow-xl text-xs animate-in fade-in slide-in-from-bottom-2 duration-200",
            isOffline 
              ? "bg-destructive text-destructive-foreground" 
              : "bg-warning text-warning-foreground"
          )}
        >
          <div className="font-medium mb-1">
            {isOffline ? (manualOfflineMode ? 'Manual Offline' : 'No Internet') : 'Slow Connection'}
          </div>
          <div className="opacity-80 mb-2">
            {isOffline ? 'Using cached data' : 'Some features may be delayed'}
          </div>
          
          {manualOfflineMode ? (
            <button
              onClick={() => {
                setManualOfflineMode(false);
                setExpanded(false);
              }}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Go online
            </button>
          ) : !isOffline ? (
            <button
              onClick={() => {
                setManualOfflineMode(true);
                setExpanded(false);
              }}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Work offline
            </button>
          ) : null}
        </div>
      )}
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
