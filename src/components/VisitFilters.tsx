import { useState } from "react";
import { Filter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface FilterOptions {
  category?: string;
  lastVisitDays?: string;
  visitFrequency?: string;
  avgSalesRange?: string;
  location?: string;
  priority?: string;
  focusedProduct?: string;
}

interface VisitFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableCategories?: string[];
  availableLocations?: string[];
}

export const VisitFilters = ({ 
  filters, 
  onFiltersChange,
  availableCategories = [],
  availableLocations = []
}: VisitFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== "all").length;

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters };
    if (value === "all" || !value) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:from-primary/15 hover:to-primary/10 text-xs sm:text-sm h-9"
          >
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground text-xs">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 sm:w-96 p-4 bg-background z-50" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm sm:text-base">Filter Retailers</h4>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Category</Label>
              <Select
                value={filters.category || "all"}
                onValueChange={(value) => handleFilterChange("category", value)}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Last Visit Filter */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Last Visited</Label>
              <Select
                value={filters.lastVisitDays || "all"}
                onValueChange={(value) => handleFilterChange("lastVisitDays", value)}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm bg-background">
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90+ days</SelectItem>
                  <SelectItem value="never">Never visited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Average Sales Range */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Avg Order Value</Label>
              <Select
                value={filters.avgSalesRange || "all"}
                onValueChange={(value) => handleFilterChange("avgSalesRange", value)}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm bg-background">
                  <SelectValue placeholder="All ranges" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All ranges</SelectItem>
                  <SelectItem value="high">High (₹20,000+)</SelectItem>
                  <SelectItem value="medium">Medium (₹10,000 - ₹20,000)</SelectItem>
                  <SelectItem value="low">Low (₹5,000 - ₹10,000)</SelectItem>
                  <SelectItem value="very-low">Very Low (&lt;₹5,000)</SelectItem>
                  <SelectItem value="zero">No orders yet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Focused Product Filter */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Focused Products</Label>
              <Select
                value={filters.focusedProduct || "all"}
                onValueChange={(value) => handleFilterChange("focusedProduct", value)}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm bg-background">
                  <SelectValue placeholder="All products" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All products</SelectItem>
                  <SelectItem value="focused">Focused Products Only</SelectItem>
                  <SelectItem value="non-focused">Non-Focused Products Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Priority</Label>
              <Select
                value={filters.priority || "all"}
                onValueChange={(value) => handleFilterChange("priority", value)}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm bg-background">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Filter */}
            {availableLocations.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Location</Label>
                <Select
                  value={filters.location || "all"}
                  onValueChange={(value) => handleFilterChange("location", value)}
                >
                  <SelectTrigger className="h-9 text-xs sm:text-sm bg-background">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All locations</SelectItem>
                    {availableLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {filters.category && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
              Category: {filters.category}
              <button
                onClick={() => handleFilterChange("category", "")}
                className="ml-1 hover:text-primary-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.lastVisitDays && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
              {filters.lastVisitDays === "never" ? "Never visited" : `Last ${filters.lastVisitDays} days`}
              <button
                onClick={() => handleFilterChange("lastVisitDays", "")}
                className="ml-1 hover:text-primary-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.avgSalesRange && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
              Sales: {filters.avgSalesRange}
              <button
                onClick={() => handleFilterChange("avgSalesRange", "")}
                className="ml-1 hover:text-primary-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
              Priority: {filters.priority}
              <button
                onClick={() => handleFilterChange("priority", "")}
                className="ml-1 hover:text-primary-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
              Location: {filters.location}
              <button
                onClick={() => handleFilterChange("location", "")}
                className="ml-1 hover:text-primary-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.focusedProduct && (
            <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
              {filters.focusedProduct === "focused" ? "Focused Products" : "Non-Focused Products"}
              <button
                onClick={() => handleFilterChange("focusedProduct", "")}
                className="ml-1 hover:text-orange-700"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
