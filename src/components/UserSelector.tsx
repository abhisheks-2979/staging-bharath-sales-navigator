import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubordinates, Subordinate } from '@/hooks/useSubordinates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, User, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserSelectorProps {
  selectedUserId: string;
  onUserChange: (userId: string) => void;
  showAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
  disabled?: boolean;
}

export const UserSelector = ({
  selectedUserId,
  onUserChange,
  showAllOption = true,
  allOptionLabel = 'All Team Members',
  className,
  disabled = false,
}: UserSelectorProps) => {
  const { user } = useAuth();
  const { subordinates, isManager, isLoading } = useSubordinates();

  // Group subordinates by level for visual hierarchy
  const groupedSubordinates = useMemo(() => {
    const groups = new Map<number, Subordinate[]>();
    subordinates.forEach((sub) => {
      const list = groups.get(sub.level) || [];
      list.push(sub);
      groups.set(sub.level, list);
    });
    return groups;
  }, [subordinates]);

  // Get display name for selected user
  const getDisplayName = (userId: string): string => {
    if (userId === 'all') return allOptionLabel;
    if (userId === user?.id || userId === 'self') return 'My Data';
    const sub = subordinates.find((s) => s.subordinate_user_id === userId);
    return sub?.full_name || 'Unknown User';
  };

  // Don't render if user is not a manager (no subordinates)
  if (!isManager && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn('h-10 w-48 bg-muted animate-pulse rounded-md', className)} />
    );
  }

  return (
    <Select
      value={selectedUserId}
      onValueChange={onUserChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-[200px]', className)}>
        <div className="flex items-center gap-2">
          {selectedUserId === 'all' ? (
            <Users className="h-4 w-4 text-muted-foreground" />
          ) : (
            <User className="h-4 w-4 text-muted-foreground" />
          )}
          <SelectValue placeholder="Select user">
            {getDisplayName(selectedUserId)}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {/* My Data option */}
        <SelectItem value="self">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>My Data</span>
          </div>
        </SelectItem>

        {/* All Team Members option */}
        {showAllOption && (
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{allOptionLabel}</span>
            </div>
          </SelectItem>
        )}

        {/* Subordinates grouped by level */}
        {Array.from(groupedSubordinates.entries()).map(([level, subs]) => (
          <div key={level}>
            {level === 1 && subordinates.length > 0 && (
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                Direct Reports
              </div>
            )}
            {level > 1 && (
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                Level {level} Reports
              </div>
            )}
            {subs.map((sub) => (
              <SelectItem key={sub.subordinate_user_id} value={sub.subordinate_user_id}>
                <div className="flex items-center gap-2">
                  {level > 1 && (
                    <span className="text-muted-foreground">
                      {Array(level - 1)
                        .fill(null)
                        .map((_, i) => (
                          <ChevronRight key={i} className="h-3 w-3 inline" />
                        ))}
                    </span>
                  )}
                  <User className="h-4 w-4" />
                  <span>{sub.full_name}</span>
                </div>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
};
