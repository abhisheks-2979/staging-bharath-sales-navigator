import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileSpreadsheet, TrendingUp, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { downloadExcel } from "@/utils/fileDownloader";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface PointDetail {
  id: string;
  earned_at: string;
  points: number;
  game_name: string;
  action_name: string;
  action_type: string;
  reference_type: string | null;
  reference_id: string | null;
  visit_id: string | null;
  retailer_id: string | null;
  retailer_name: string | null;
  metadata: any;
}

interface PointsDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  timeFilter: "today" | "yesterday" | "week" | "month" | "quarter" | "year" | "custom";
}

export function PointsDetailsModal({ open, onOpenChange, userId, timeFilter: initialTimeFilter }: PointsDetailsModalProps) {
  const [pointDetails, setPointDetails] = useState<PointDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"today" | "yesterday" | "week" | "month" | "quarter" | "year" | "custom">(initialTimeFilter);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (open && userId) {
      setTimeFilter(initialTimeFilter);
    }
  }, [open, initialTimeFilter]);

  useEffect(() => {
    if (open && userId) {
      fetchPointDetails();
    }
  }, [open, userId, timeFilter, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (timeFilter === "custom") {
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(0);
      }
    } else {
      switch (timeFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          break;
        case "yesterday":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
          break;
        case "week":
          const dayOfWeek = now.getDay();
          startDate = new Date(now);
          startDate.setDate(now.getDate() - dayOfWeek);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          break;
        case "quarter":
          const currentQuarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          break;
        default:
          startDate = new Date(0);
      }
    }

    return { startDate, endDate };
  };

  const fetchPointDetails = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange();

    const { data, error } = await supabase
      .from("gamification_points")
      .select(`
        id,
        earned_at,
        points,
        reference_type,
        reference_id,
        metadata,
        gamification_games(name),
        gamification_actions(action_name, action_type)
      `)
      .eq("user_id", userId)
      .gte("earned_at", startDate.toISOString())
      .lte("earned_at", endDate.toISOString())
      .order("earned_at", { ascending: false });

    if (error) {
      toast.error("Failed to load point details");
      setLoading(false);
      return;
    }

    // Collect all retailer IDs from multiple sources
    const retailerIds = new Set<string>();
    
    (data || []).forEach(item => {
      // Check metadata for retailer_id (most reliable source)
      const metadata = item.metadata as Record<string, any> | null;
      if (metadata?.retailer_id) {
        retailerIds.add(metadata.retailer_id);
      }
      // reference_id might be retailer_id directly
      if (item.reference_id) {
        retailerIds.add(item.reference_id);
      }
    });

    // Fetch retailer names for all collected IDs
    let retailerMap = new Map<string, string>();
    
    if (retailerIds.size > 0) {
      const { data: retailers } = await supabase
        .from("retailers")
        .select("id, name")
        .in("id", Array.from(retailerIds));

      if (retailers) {
        retailers.forEach((retailer: any) => {
          retailerMap.set(retailer.id, retailer.name);
        });
      }
    }

    const formattedData: PointDetail[] = (data || []).map((item: any) => {
      // Get retailer ID from metadata first (most reliable), then reference_id
      const metadata = item.metadata as Record<string, any> | null;
      const retailerId = metadata?.retailer_id || item.reference_id || null;
      const retailerName = retailerId ? retailerMap.get(retailerId) || null : null;

      return {
        id: item.id,
        earned_at: item.earned_at,
        points: item.points,
        game_name: item.gamification_games?.name || "Unknown Game",
        action_name: item.gamification_actions?.action_name || "Unknown Action",
        action_type: item.gamification_actions?.action_type || "",
        reference_type: item.reference_type,
        reference_id: item.reference_id,
        visit_id: null,
        retailer_id: retailerId,
        retailer_name: retailerName,
        metadata: item.metadata
      };
    });

    setPointDetails(formattedData);
    setLoading(false);
  };

  const uniqueGames = Array.from(new Set(pointDetails.map(p => p.game_name)));

  const filteredPoints = selectedGame === "all" 
    ? pointDetails 
    : pointDetails.filter(p => p.game_name === selectedGame);

  const gameChartData = uniqueGames.map(gameName => ({
    name: gameName,
    points: pointDetails
      .filter(p => p.game_name === gameName)
      .reduce((sum, p) => sum + p.points, 0)
  }));

  const handleExportExcel = async () => {
    try {
      const exportData = filteredPoints.map(point => ({
        "Date & Time": format(new Date(point.earned_at), "dd MMM yyyy, HH:mm"),
        "Game Name": point.game_name,
        "Retailer Name": point.retailer_name || "-",
        "Reference": point.reference_id || "-",
        "Points": point.points
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Points Details");

      // Auto-size columns
      const maxWidth = 30;
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.min(
          Math.max(
            key.length,
            ...exportData.map(row => String(row[key as keyof typeof row] || "").length)
          ),
          maxWidth
        )
      }));
      worksheet['!cols'] = colWidths;

      const fileName = `Points_Details_${timeFilter}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      await downloadExcel(workbook, fileName, XLSX);
      
      toast.success("Excel file exported successfully!");
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to export Excel file");
    }
  };

  const totalPoints = filteredPoints.reduce((sum, p) => sum + p.points, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Points Details Breakdown
            </div>
            <Button 
              onClick={handleExportExcel} 
              size="sm"
              variant="outline"
              disabled={filteredPoints.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Time Period and Date Range Selection */}
            <div className="flex flex-wrap items-end gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="timeFilter" className="text-sm mb-2 block">Time Period</Label>
                <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
                  <SelectTrigger id="timeFilter" className="w-full">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {timeFilter === "custom" && (
                <>
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-sm mb-2 block">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customStartDate ? format(customStartDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customStartDate}
                          onSelect={setCustomStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-sm mb-2 block">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customEndDate}
                          onSelect={setCustomEndDate}
                          initialFocus
                          disabled={(date) => customStartDate ? date < customStartDate : false}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>

            <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table">Detailed Table</TabsTrigger>
              <TabsTrigger value="chart">Chart View</TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <Label htmlFor="gameFilter" className="text-sm whitespace-nowrap">Filter by Game:</Label>
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger id="gameFilter" className="w-[250px]">
                      <SelectValue placeholder="Select game" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Games</SelectItem>
                      {uniqueGames.map(gameName => (
                        <SelectItem key={gameName} value={gameName}>
                          {gameName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm font-semibold whitespace-nowrap">
                  Total Points: <span className="text-primary text-lg">{totalPoints}</span>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Game Name</TableHead>
                          <TableHead>Retailer Name</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Points</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPoints.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No points earned in this period
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPoints.map((point) => (
                            <TableRow key={point.id}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {format(new Date(point.earned_at), "dd MMM yyyy, HH:mm")}
                              </TableCell>
                              <TableCell>{point.game_name}</TableCell>
                              <TableCell>
                                {point.retailer_name && point.retailer_id ? (
                                  <a
                                    href={`/retailer/${point.retailer_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-medium"
                                  >
                                    {point.retailer_name}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {point.visit_id ? (
                                  <a
                                    href={`/visit-detail/${point.visit_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline text-xs font-mono"
                                    title={`Visit: ${point.visit_id}`}
                                  >
                                    #{point.visit_id.slice(0, 8)}...
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold text-primary">
                                +{point.points}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chart" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Points by Game Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {gameChartData.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      No data available
                    </div>
                  ) : (
                    <ChartContainer
                      config={{
                        points: {
                          label: "Points",
                          color: "hsl(var(--primary))",
                        },
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gameChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            fontSize={12}
                          />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="points" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueGames.map(gameName => {
                  const gamePoints = pointDetails
                    .filter(p => p.game_name === gameName)
                    .reduce((sum, p) => sum + p.points, 0);
                  const gameCount = pointDetails.filter(p => p.game_name === gameName).length;

                  return (
                    <Card key={gameName}>
                      <CardHeader>
                        <CardTitle className="text-base">{gameName}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Points:</span>
                            <span className="font-bold text-primary">{gamePoints}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Activities:</span>
                            <span className="font-semibold">{gameCount}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
