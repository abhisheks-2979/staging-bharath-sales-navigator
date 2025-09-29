import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, X, RefreshCw } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { checkForUpdates, forceRefresh } from "@/utils/cacheUtils";

export const PWAInstallPrompt = () => {
  const { isInstallable, installApp, canPrompt, handleDismiss } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Check for updates on component mount
    checkForUpdates().then(setHasUpdate);
  }, []);

  const handleInstallClick = () => {
    installApp();
    setIsDismissed(true);
  };

  const handleLocalDismiss = () => {
    handleDismiss();
    setIsDismissed(true);
  };

  const handleForceRefresh = () => {
    forceRefresh();
  };

  // Show update prompt if there's an update available
  if (hasUpdate) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-lg border-orange-500/20 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">Update Available</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHasUpdate(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            A new version is available with the latest updates
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex space-x-2">
            <Button onClick={handleForceRefresh} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Now
            </Button>
            <Button variant="outline" onClick={() => setHasUpdate(false)}>
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }


  if (!isInstallable || isDismissed) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Install App</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLocalDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Install Bharath Sales Navigator for a better experience
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex space-x-2">
          <Button onClick={handleInstallClick} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Install Now
          </Button>
          <Button variant="outline" onClick={handleLocalDismiss}>
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};