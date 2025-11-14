import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface LeaderboardTimeFiltersProps {
  timeFilter: "today" | "week" | "month" | "quarter" | "year";
  onFilterChange: (filter: "today" | "week" | "month" | "quarter" | "year") => void;
}

export function LeaderboardTimeFilters({ timeFilter, onFilterChange }: LeaderboardTimeFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={timeFilter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today's Points</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="quarter">This Quarter</SelectItem>
          <SelectItem value="year">Year-to-Date</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}