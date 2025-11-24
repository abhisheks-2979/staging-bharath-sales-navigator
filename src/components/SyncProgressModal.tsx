import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { offlineStorage } from "@/lib/offlineStorage";

interface SyncItem {
  id: string;
  action: string;
  status: 'pending' | 'syncing' | 'success' | 'error';
  error?: string;
}

interface SyncProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SyncProgressModal = ({ open, onOpenChange }: SyncProgressModalProps) => {
  const [syncItems, setSyncItems] = useState<SyncItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [syncedItems, setSyncedItems] = useState(0);

  useEffect(() => {
    if (!open) return;

    const loadSyncQueue = async () => {
      try {
        const queue = await offlineStorage.getSyncQueue();
        setTotalItems(queue.length);
        setSyncItems(queue.map(item => ({
          id: item.id,
          action: item.action,
          status: 'pending'
        })));
      } catch (error) {
        console.error('Error loading sync queue:', error);
      }
    };

    loadSyncQueue();
    const interval = setInterval(loadSyncQueue, 1000);

    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    const successCount = syncItems.filter(item => item.status === 'success').length;
    setSyncedItems(successCount);
  }, [syncItems]);

  const progress = totalItems > 0 ? (syncedItems / totalItems) * 100 : 0;

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'CREATE_ORDER': 'Creating Order',
      'UPDATE_ORDER': 'Updating Order',
      'CREATE_VISIT': 'Creating Visit',
      'CHECK_IN': 'Check In',
      'CHECK_OUT': 'Check Out',
      'CREATE_STOCK': 'Creating Stock',
      'UPDATE_STOCK': 'Updating Stock',
      'CREATE_RETAILER': 'Creating Retailer',
      'UPDATE_RETAILER': 'Updating Retailer',
      'DELETE_RETAILER': 'Deleting Retailer',
      'CREATE_ATTENDANCE': 'Check In Attendance',
      'UPDATE_ATTENDANCE': 'Check Out Attendance',
      'CREATE_BEAT': 'Creating Beat',
      'UPDATE_BEAT': 'Updating Beat',
      'DELETE_BEAT': 'Deleting Beat',
      'CREATE_BEAT_PLAN': 'Creating Beat Plan',
      'UPDATE_BEAT_PLAN': 'Updating Beat Plan',
      'NO_ORDER': 'Recording No Order',
      'CREATE_COMPETITION_DATA': 'Recording Competition Data',
      'CREATE_RETURN_STOCK': 'Recording Return Stock',
    };
    return labels[action] || action;
  };

  const getStatusIcon = (status: SyncItem['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sync Progress</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{syncedItems} / {totalItems}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress.toFixed(0)}% Complete
            </p>
          </div>

          {/* Sync Items List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Items Being Synced</h4>
            {syncItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>All data synced successfully!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {syncItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {getStatusIcon(item.status)}
                      <span className="text-sm">{getActionLabel(item.action)}</span>
                    </div>
                    <Badge variant={
                      item.status === 'success' ? 'default' : 
                      item.status === 'error' ? 'destructive' : 
                      'secondary'
                    }>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
