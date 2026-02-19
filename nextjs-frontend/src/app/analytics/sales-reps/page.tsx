"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ProtectedRoute } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SalesRepPerformance,
  SalesRepPerformanceResponse,
  api,
  formatCurrency,
} from "@/lib/api";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import {
  Award,
  DollarSign,
  Loader2,
  Users,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

type RangeKey = "day" | "7d" | "14d" | "30d" | "90d" | "365d" | "custom" | "all";
type SortMetric =
  | "revenue"
  | "orders"
  | "assignedCustomers"
  | "activeCustomers";

const RANGE_OPTIONS: Array<{ label: string; value: RangeKey }> = [
  { label: "1 Day", value: "day" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 14 days", value: "14d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 12 months", value: "365d" },
  { label: "All Time", value: "all" },
  { label: "Custom range", value: "custom" },
];

const METRIC_OPTIONS: Array<{
  value: SortMetric;
  label: string;
  highLabel: string;
  lowLabel: string;
  getValue: (rep: SalesRepPerformance) => number;
}> = [
    {
      value: "revenue",
      label: "Revenue",
      highLabel: "High revenue",
      lowLabel: "Low revenue",
      getValue: (rep) => rep.metrics.totalRevenue ?? 0,
    },
    {
      value: "orders",
      label: "Orders",
      highLabel: "High orders",
      lowLabel: "Low orders",
      getValue: (rep) => rep.metrics.totalOrders ?? 0,
    },
    {
      value: "assignedCustomers",
      label: "Assigned Customers",
      highLabel: "High assigned customers",
      lowLabel: "Low assigned customers",
      getValue: (rep) => rep.metrics.assignedCustomers ?? 0,
    },
    {
      value: "activeCustomers",
      label: "Active Customers",
      highLabel: "High active customers",
      lowLabel: "Low active customers",
      getValue: (rep) => rep.metrics.activeCustomers ?? 0,
    },
  ];

export default function SalesRepPerformancePage() {
  const [range, setRange] = useState<RangeKey>("90d");
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesRepPerformanceResponse | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortMetric, setSortMetric] = useState<SortMetric>("revenue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const loadData = async (
    selectedRange: RangeKey,
    from?: Date | null,
    to?: Date | null
  ) => {
    try {
      setLoading(true);
      setError(null);

      let rangeToSend: any = selectedRange;
      let fromToSend = from;
      let toToSend = to;

      if (selectedRange === 'day' && from) {
        rangeToSend = 'custom';
        fromToSend = new Date(from);
        fromToSend.setHours(0, 0, 0, 0);
        toToSend = new Date(from);
        toToSend.setHours(23, 59, 59, 999);
      }

      const response = await api.getSalesRepPerformance(
        rangeToSend,
        fromToSend ?? undefined,
        toToSend ?? undefined
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || "Unable to load sales rep analytics.");
      }
      const result = response.data;
      setData(result);
      setSelectedRepId((prev) =>
        prev && result.reps.some((rep) => rep.salesRepId === prev)
          ? prev
          : null
      );
    } catch (err: any) {
      setError(err?.message || "Unable to load sales rep analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range === "custom") {
      if (!customFrom || !customTo) return;
      loadData(range, customFrom, customTo);
    } else if (range === "day") {
      if (!customFrom) return;
      loadData(range, customFrom);
    } else {
      loadData(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customFrom, customTo]);

  const currentMetricOption =
    METRIC_OPTIONS.find((option) => option.value === sortMetric) ??
    METRIC_OPTIONS[0];

  const filteredSortedReps = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.trim().toLowerCase();
    const filtered = data.reps.filter((rep) => {
      if (!query) return true;
      const name = `${rep.user.firstName ?? ""} ${rep.user.lastName ?? ""}`
        .trim()
        .toLowerCase();
      const email = (rep.user.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });

    const sorter = currentMetricOption.getValue;
    return filtered.sort((a, b) => {
      const aValue = sorter(a);
      const bValue = sorter(b);
      if (sortDirection === "desc") {
        return bValue - aValue;
      }
      return aValue - bValue;
    });
  }, [data, searchQuery, currentMetricOption, sortDirection]);

  useEffect(() => {
    if (!filteredSortedReps.length) {
      setSelectedRepId(null);
      return;
    }
    setSelectedRepId((prev) =>
      prev && filteredSortedReps.some((rep) => rep.salesRepId === prev)
        ? prev
        : filteredSortedReps[0].salesRepId
    );
  }, [filteredSortedReps]);

  const selectedRep: SalesRepPerformance | null = useMemo(() => {
    if (!filteredSortedReps.length || !selectedRepId) return null;
    return (
      filteredSortedReps.find((rep) => rep.salesRepId === selectedRepId) ?? null
    );
  }, [filteredSortedReps, selectedRepId]);

  const overallTrend = useMemo(() => {
    if (!filteredSortedReps.length) {
      return null;
    }
    const topPerformer = filteredSortedReps[0];
    return { topPerformer };
  }, [filteredSortedReps]);

  const handleRetry = () => {
    if (range === "custom") {
      if (!customFrom || !customTo) return;
      loadData(range, customFrom, customTo);
    } else if (range === "day") {
      if (!customFrom) return;
      loadData(range, customFrom);
    } else {
      loadData(range);
    }
  };

  const disableRefresh =
    loading || (range === "custom" && (!customFrom || !customTo)) || (range === "day" && !customFrom);

  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'STAFF', 'SALES_MANAGER']}>
      <DashboardLayout>
        <div className="space-y-6 pb-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Sales Rep Performance
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                Monitor revenue, productivity, and customer engagement across your
                sales team.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={range}
                onValueChange={(value) => setRange(value as RangeKey)}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {range === "day" && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start sm:w-44 text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customFrom ? customFrom.toLocaleDateString() : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={customFrom ?? undefined}
                        onSelect={(date) => setCustomFrom(date ?? null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              {range === "custom" && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start sm:w-44"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customFrom ? customFrom.toLocaleDateString() : "From date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={customFrom ?? undefined}
                        onSelect={(date) => setCustomFrom(date ?? null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start sm:w-44"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customTo ? customTo.toLocaleDateString() : "To date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={customTo ?? undefined}
                        onSelect={(date) => setCustomTo(date ?? null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleRetry}
                disabled={disableRefresh}
              >
                Refresh
              </Button>
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Loading performance data…</span>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Failed to load analytics</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleRetry}>Try again</Button>
              </CardContent>
            </Card>
          ) : !data || data.reps.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No sales representatives found</CardTitle>
                <CardDescription>
                  Add sales reps and assign customers to start tracking performance.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(data.totals.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across {data.reps.length} sales reps
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Orders Closed</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.totals.totalOrders}</div>
                    <p className="text-xs text-muted-foreground">
                      {data.period
                        ? `${new Date(data.period.from).toLocaleDateString()} - ${new Date(
                          data.period.to
                        ).toLocaleDateString()}`
                        : `${data.rangeDays}-day window`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Reps</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.totals.repsActive}</div>
                    <p className="text-xs text-muted-foreground">
                      Reps with at least one active customer
                    </p>
                  </CardContent>
                </Card>
              </div>

              {overallTrend?.topPerformer && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Award className="h-4 w-4 text-primary" />
                        Top Performer
                      </CardTitle>
                      <CardDescription>
                        {overallTrend.topPerformer.user.firstName}{" "}
                        {overallTrend.topPerformer.user.lastName} generated{" "}
                        {formatCurrency(overallTrend.topPerformer.metrics.totalRevenue)} from{" "}
                        {overallTrend.topPerformer.metrics.totalOrders} orders.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        Orders {overallTrend.topPerformer.metrics.totalOrders}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              )}

              <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Sales Rep Summary</CardTitle>
                  <CardDescription>
                    Compare performance metrics across all sales reps in the selected range.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center md:justify-between">
                    <Input
                      placeholder="Search sales reps by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full md:max-w-sm"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Select
                        value={sortMetric}
                        onValueChange={(value) => setSortMetric(value as SortMetric)}
                      >
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Sort metric" />
                        </SelectTrigger>
                        <SelectContent>
                          {METRIC_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={sortDirection}
                        onValueChange={(value) =>
                          setSortDirection(value as "asc" | "desc")
                        }
                      >
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Sort order" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">
                            {currentMetricOption.highLabel}
                          </SelectItem>
                          <SelectItem value="asc">
                            {currentMetricOption.lowLabel}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sales Rep</TableHead>
                        <TableHead className="hidden xl:table-cell">Status</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Avg. Order</TableHead>
                        <TableHead>Assigned Customers</TableHead>
                        <TableHead>Active</TableHead>
                        {/* <TableHead className="text-right">Actions</TableHead> */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSortedReps.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-10 text-center text-sm text-muted-foreground"
                          >
                            No sales reps match your current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSortedReps.map((rep) => (
                          <TableRow
                            key={rep.salesRepId}
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {rep.user.firstName} {rep.user.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {rep.user.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <Badge variant={rep.user.isActive ? "outline" : "destructive"}>
                                {rep.user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(rep.metrics.totalRevenue)}</TableCell>
                            <TableCell>{rep.metrics.totalOrders}</TableCell>
                            <TableCell>
                              {formatCurrency(rep.metrics.averageOrderValue)}
                            </TableCell>
                            <TableCell>{rep.metrics.assignedCustomers}</TableCell>
                            <TableCell>{rep.metrics.activeCustomers}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
