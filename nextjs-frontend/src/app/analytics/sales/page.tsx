"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPaymentMethodDisplay } from "@/lib/payment-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPrimitive } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye } from "lucide-react";
import { api, formatCurrency, Order } from "@/lib/api";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditOrderDialog } from "@/components/orders/edit-order-dialog";
import { OrderDateFilter } from "@/components/orders/order-date-filter";
import { SendReportDialog } from "@/components/shared/send-report-dialog";
import { SalesLogs } from "./sales-logs";
import { IndependentSalesRepsReport } from "./independent-sales-reps-report";
import { Mail, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

const formatDateLabel = (dateStr: string) => {
  if (!dateStr) return '';
  if (typeof dateStr !== 'string') return String(dateStr);

  // Handle hourly buckets or pre-formatted PST labels
  if (dateStr.includes('PST')) return dateStr;

  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return dateStr;
};

export default function SalesReportsPage() {
  const [range, setRange] = useState("last_30_days");
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [salesChannelId, setSalesChannelId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({ totalRevenue: 0, totalOrders: 0, daily: [] });
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // Day details state
  const [showDayDetailsDialog, setShowDayDetailsDialog] = useState(false);
  const [dayOrders, setDayOrders] = useState<Order[]>([]);
  const [dayDetailsLoading, setDayDetailsLoading] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        let rangeToSend = range;
        let fromToSend = from;
        let toToSend = to;

        if (range === 'day') {
          rangeToSend = 'custom';
          fromToSend = from || new Date();
          toToSend = fromToSend;
        } else if (range === 'custom' && from) {
          fromToSend = from;
          toToSend = to || from;
        }

        // Request detailed data when viewing a single day
        const requestDetailed = range === 'day';
        const res = await api.getSalesReports(
          rangeToSend as any,
          fromToSend || undefined,
          toToSend || undefined,
          requestDetailed,
          salesChannelId,
          true // usePSTFilter legacy flag, now default
        );
        console.log("[SalesReports] API response:", res);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          toast.error(res.error || "Failed to load sales reports");
          setData({ totalRevenue: 0, totalOrders: 0, daily: [] });
        }
      } catch (e: any) {
        console.error("[SalesReports] API error:", e);
        toast.error(e?.message || "Failed to load sales reports");
        setData({ totalRevenue: 0, totalOrders: 0, daily: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, [range, from, to, salesChannelId]);

  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [regionData, setRegionData] = useState<any[]>([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [filters, setFilters] = useState<{ states: string[], citiesByState: Record<string, string[]> }>({ states: [], citiesByState: {} });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getSalesRegionFilters();
        if (res.success && res.data) {
          setFilters(res.data);
        }
      } catch (e) {
        console.error("Failed to fetch region filters", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setRegionLoading(true);
        let rangeToSend = range;
        let fromToSend = from;
        let toToSend = to;

        if (range === 'day') {
          rangeToSend = 'custom';
          fromToSend = from || new Date();
          toToSend = fromToSend;
        } else if (range === 'custom' && from) {
          fromToSend = from;
          toToSend = to || from;
        }

        const stateParam = selectedState !== "ALL" ? selectedState : undefined;
        const cityParam = selectedCity !== "ALL" ? selectedCity : undefined;

        const res = await api.getSalesByRegion(
          rangeToSend as any,
          fromToSend || undefined,
          toToSend || undefined,
          stateParam,
          cityParam,
          salesChannelId
        );
        if (res.success && res.data) {
          setRegionData(res.data);
        } else {
          setRegionData([]);
        }
      } catch (e: any) {
        console.error("Region fetch error:", e);
        setRegionData([]);
      } finally {
        setRegionLoading(false);
      }
    })();
  }, [range, from, to, selectedState, selectedCity, salesChannelId]);

  const handleExportAll = async () => {
    let page = 1;
    const limit = 100;
    let pages = 1;
    const all: Order[] = [];

    let fromToSend = from;
    let toToSend = to;

    if (range === 'day' || (range === 'custom' && from)) {
      fromToSend = from || new Date();
      toToSend = (range === 'custom' && to) ? to : fromToSend;
    }

    try {
      setLoading(true);

      // 1. Generate Aggregated Summary Data
      const summaryData = (data.daily || []).map((d: any) => ({
        'Date': d.date,
        'Revenue ($)': Number(d.revenue || 0).toFixed(2),
        'Orders Count': d.orders || 0
      }));

      // 2. Fetch All Detailed Orders
      do {
        const res: any = await api.getOrders({
          page,
          limit,
          dateFrom: fromToSend?.toISOString(),
          dateTo: toToSend?.toISOString(),
          salesChannelId: salesChannelId,
          usePSTFilter: true,
          excludeFailedPayments: true,
        });
        if (res?.success && res?.data) {
          all.push(...(res.data.orders || []));
          const pagination = res.data.pagination || {};
          pages = pagination.pages || 1;
        } else {
          break;
        }
        page += 1;
      } while (page <= pages);

      const filteredAll = all.filter(o => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');

      const detailedData = filteredAll.map(order => ({
        'Order ID': order.orderNumber || order.id,
        'Customer Name': order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest',
        'Customer Email': order.customer?.email || 'N/A',
        'Status': order.status,
        'Total Amount': `$${Number(order.totalAmount || 0).toFixed(2)}`,
        'Payment Method': getPaymentMethodDisplay(order),
        'Created Date': order.createdAt ? format(new Date(order.createdAt), 'MMM d, yyyy, hh:mm a') : '',
        'Updated Date': order.updatedAt ? format(new Date(order.updatedAt), 'MMM d, yyyy, hh:mm a') : '',
      }));

      // 3. Create Workbook and Sheets
      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Sales Summary');

      const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(wb, wsDetailed, 'Order Details');

      // 4. Download
      const fileName = `sales-analytics-export-${range}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Exported ${summaryData.length} summary rows and ${filteredAll.length} detailed orders`);
    } catch (e) {
      console.error('Export all failed:', e);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailReport = async (email: string) => {
    let rangeToSend = range;
    let fromToSend = from;
    let toToSend = to;

    if (range === 'day' || (range === 'custom' && from)) {
      if (range === 'day') rangeToSend = 'custom';
      fromToSend = from || new Date();
      toToSend = (range === 'custom' && to) ? to : fromToSend;
    }

    return api.sendSalesEmailReport({
      email,
      range: rangeToSend,
      from: fromToSend?.toISOString(),
      to: toToSend?.toISOString(),
      usePSTFilter: true, // Legacy flag, now default behavior
    });
  };

  const handleRowClick = async (orderId: string) => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await api.getOrder(orderId);
      if (res.success && res.data) {
        setEditingOrder(res.data);
        setShowEditDialog(true);
      } else {
        toast.error("Failed to load order details");
      }
    } catch (error) {
      console.error("Failed to load order:", error);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = async (dateStr: string) => {
    if (!dateStr || range === 'day') return; // Don't do anything if already in detailed view or invalid date

    setSelectedDayDate(dateStr);
    setDayDetailsLoading(true);
    setShowDayDetailsDialog(true);
    setDayOrders([]);

    try {
      const res = await api.getOrders({
        dateFrom: dateStr,
        dateTo: dateStr,
        usePSTFilter: true,
        salesChannelId: salesChannelId,
        excludeFailedPayments: true,
        limit: 100 // Reasonable limit for a day drill-down
      });

      if (res.success && res.data && res.data.orders) {
        // Exclude CANCELLED and REFUNDED orders to match main analytics totals
        const filteredOrders = (res.data.orders as Order[]).filter(
          (o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED'
        );
        setDayOrders(filteredOrders);
      } else {
        toast.error("Failed to load orders for this day");
      }
    } catch (e) {
      console.error("Failed to fetch day orders:", e);
      toast.error("Failed to load orders");
    } finally {
      setDayDetailsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sales Reports</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Revenue and order trends</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <OrderDateFilter
                range={range}
                setRange={setRange}
                from={from || undefined}
                setFrom={(d) => setFrom(d || null)}
                to={to || undefined}
                setTo={(d) => setTo(d || null)}
                salesChannelId={salesChannelId}
                onSalesChannelChange={setSalesChannelId}
                className="w-full sm:w-auto"
              />
              <Button variant="outline" onClick={() => setShowEmailDialog(true)} className="w-full sm:w-auto">
                <Mail className="h-4 w-4 mr-2" /> Email Report
              </Button>
              <Button variant="outline" onClick={handleExportAll} className="w-full sm:w-auto">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export All
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="regional">Regional Sales</TabsTrigger>
            <TabsTrigger value="logs">Sales Logs</TabsTrigger>
            <TabsTrigger value="independent-reps">Independent Sales Rep Report</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Total Revenue</CardTitle>
                  <CardDescription>For selected range</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue || 0)}</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Orders</CardTitle>
                  <CardDescription>For selected range</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{data.totalOrders || 0}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="w-full h-[320px]" />
                ) : (
                  <>
                    {((data.chartData || data.daily) || []).length === 0 && (
                      <div className="text-sm text-muted-foreground mb-2">No revenue data available</div>
                    )}
                    {((data.chartData || data.daily) || []).length > 0 && (
                      <div className="text-xs text-muted-foreground mb-2">
                        Showing {((data.chartData || data.daily) || []).length} data points
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={data.chartData || data.daily || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDateLabel}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          tickFormatter={(value) => `$${Math.round(value)}`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          labelFormatter={formatDateLabel}
                          formatter={(value) => [`$${Math.round(Number(value)).toLocaleString()}`, 'Revenue']}
                          contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', r: 5 }}
                          activeDot={{ r: 7 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Orders per Day</CardTitle>
                <CardDescription>Daily order count</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="w-full h-[320px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={data.chartData || data.daily || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                      <YAxis />
                      <Tooltip
                        labelFormatter={formatDateLabel}
                        contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)' }}
                      />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Daily Breakdown</CardTitle>
                <CardDescription>
                  {data.detailed ? 'Individual orders' : 'Aggregated by time period'}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      {data.detailed ? (
                        <>
                          <TableHead>Order Number</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date/Time</TableHead>
                          <TableHead>Revenue</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Date</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Orders</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          {data.detailed && <Skeleton className="h-4 w-24" />}
                        </TableRow>
                      ))
                    ) : data.detailed ? (
                      // Show individual orders
                      (data.daily || []).map((d: any) => (
                        <TableRow
                          key={d.orderId}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleRowClick(d.orderId)}
                        >
                          <TableCell className="whitespace-nowrap font-medium">{d.orderNumber}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{d.customerName}</span>
                              <span className="text-xs text-muted-foreground">{d.customerEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatDateLabel(d.date)}</TableCell>
                          <TableCell>{formatCurrency(d.revenue)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      // Show aggregated data
                      (data.daily || []).map((d: any) => (
                        <TableRow
                          key={d.date}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleDayClick(d.date)}
                        >
                          <TableCell className="whitespace-nowrap">{formatDateLabel(d.date)}</TableCell>
                          <TableCell>{formatCurrency(d.revenue)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {d.orders}
                              <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regional" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="w-full sm:w-[200px]">
                <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); setSelectedCity("ALL"); }}>
                  <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="ALL">All States</SelectItem>
                    {filters.states.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[200px]">
                <Select value={selectedCity} onValueChange={setSelectedCity} disabled={selectedState === "ALL"}>
                  <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="ALL">All Cities</SelectItem>
                    {selectedState !== "ALL" && (filters.citiesByState[selectedState] || []).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Regional Distribution</CardTitle>
                  <CardDescription>Sales by {selectedState === 'ALL' ? 'State' : 'City'}</CardDescription>
                </CardHeader>
                <CardContent>
                  {regionLoading ? (
                    <Skeleton className="w-full h-[300px]" />
                  ) : (
                    <div className="h-[300px]">
                      {regionData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">No data found</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={regionData.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="region" width={100} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(val: number) => [val, 'Orders']} />
                            <Bar dataKey="orders" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                  <CardDescription>Top regions by revenue</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Region</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regionLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          </TableRow>
                        ))
                      ) : regionData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">No regional data found</TableCell>
                        </TableRow>
                      ) : (
                        regionData.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>{r.region}</TableCell>
                            <TableCell>{r.orders}</TableCell>
                            <TableCell>{formatCurrency(r.revenue)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            {/* Map Placeholder or Actual Map would go here. I'm starting with Charts for reliability */}
          </TabsContent>

          <TabsContent value="logs">
            <SalesLogs salesChannelId={salesChannelId} />
          </TabsContent>

          <TabsContent value="independent-reps">
            <IndependentSalesRepsReport
              range={range}
              from={from}
              to={to}
              salesChannelId={salesChannelId}
              onOrderClick={handleRowClick}
            />
          </TabsContent>
        </Tabs>
      </div>

      <EditOrderDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        order={editingOrder}
        onSuccess={() => {
          // Re-fetch data to reflect changes if needed
          // We can just keep the current view or refetch the current range
          // For now, simpler to leave as is or we can trigger a re-fetch if we abstract the fetch logic
        }}
      />

      <Dialog open={showDayDetailsDialog} onOpenChange={setShowDayDetailsDialog}>
        <DialogContent className="w-[95vw] sm:max-w-[1400px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-1">
              <span>Orders for {(() => {
                const parts = selectedDayDate.split('-');
                if (parts.length === 3) {
                  return format(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])), 'dd MMM yyyy');
                }
                return selectedDayDate;
              })()}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {(() => {
                  const parts = selectedDayDate.split('-');
                  if (parts.length === 3) {
                    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    const prev = new Date(d); prev.setDate(prev.getDate() - 1);
                    return `(${format(prev, 'dd MMM')} 4:30 PM - ${format(d, 'dd MMM')} 4:30 PM PST)`;
                  }
                  return '';
                })()}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto mt-4">
            {dayDetailsLoading ? (
              <div className="flex items-center justify-center p-8">Loading orders...</div>
            ) : dayOrders.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">No orders found for this day.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <span
                          className="text-primary hover:underline cursor-pointer"
                          onClick={() => handleRowClick(order.id)}
                        >
                          {order.orderNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{order.shippingAddress?.firstName} {order.shippingAddress?.lastName}</span>
                          <span className="text-xs text-muted-foreground">{order.customer?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>{formatCurrency(Number(order.totalAmount))}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {getPaymentMethodDisplay(order)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(dayOrders.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0))}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SendReportDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onSend={handleSendEmailReport}
        title="Send Sales Report"
        description="Enter the email address where you want to receive the filtered sales report."
      />
    </DashboardLayout>
  );
}
