"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPrimitive } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Users, ExternalLink, Calendar as CalendarIcon } from "lucide-react";
import { api, formatCurrency, Order } from "@/lib/api";
import { OrderDateFilter } from "@/components/orders/order-date-filter";
import { EditOrderDialog } from "@/components/orders/edit-order-dialog";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerInsightsPage() {
  const [range, setRange] = useState("last_30_days");
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [salesChannelId, setSalesChannelId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({ segments: [], topCustomers: [] });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSummary, setCustomerSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const fetchCustomerSummary = async (customerId: string) => {
    try {
      setSummaryLoading(true);
      const res = await api.getCustomerSummary(customerId);
      if (res.success) setCustomerSummary(res.data);
    } catch (e) {
      console.error("Failed to fetch customer summary", e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleEditOrder = async (orderId: string) => {
    try {
      const res = await api.getOrder(orderId);
      if (res.success && res.data) {
        setEditingOrder(res.data);
      } else {
        toast.error("Failed to load order details");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
    }
  };

  const handleOrderUpdated = () => {
    setEditingOrder(null);
    if (selectedCustomerId) {
      fetchCustomerSummary(selectedCustomerId);
    }
    toast.success("Order updated successfully");
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const res = await api.hardDeleteOrder(orderId);
      if (res.success) {
        setEditingOrder(null);
        if (selectedCustomerId) {
          fetchCustomerSummary(selectedCustomerId);
        }
        toast.success("Order deleted successfully");
      }
    } catch (error) {
      console.error("Failed to delete order:", error);
      toast.error("Failed to delete order");
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerSummary(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);


  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        let rangeToSend = range;
        let fromToSend = from;
        let toToSend = to;

        // Handle "1 Day" filter - rely on backend PST logic
        if (range === 'day' && from) {
          rangeToSend = 'custom';
          fromToSend = from;
          toToSend = from;
        }

        const res = await api.getCustomerInsights(
          rangeToSend as any,
          fromToSend || undefined,
          toToSend || undefined,
          debouncedSearch || undefined,
          undefined, // managerId
          salesChannelId
        );
        console.log("[CustomerInsights] API response:", res);
        if (res.success && res.data) setData(res.data);
        else {
          toast.error(res.error || "Failed to load customer insights");
          setData({ segments: [], topCustomers: [] });
        }
      } catch (e: any) {
        console.error("[CustomerInsights] API error:", e);
        toast.error(e?.message || "Failed to load customer insights");
        setData({ segments: [], topCustomers: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, [range, from, to, debouncedSearch, salesChannelId]);

  const segmentChart = useMemo(() => {
    const total = (data.segments || []).reduce((s: number, x: any) => s + x._count?.id || 0, 0) || 1;
    const palette = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

    // Aggregate data
    const aggregated: Record<string, number> = {
      'Wholesale': 0,
      'Enterprise': 0
    };

    (data.segments || []).forEach((s: any) => {
      const count = s._count?.id || 0;
      if (s.customerType === 'B2C' || s.customerType === 'B2B') {
        aggregated['Wholesale'] += count;
      } else if (s.customerType === 'ENTERPRISE_1' || s.customerType === 'ENTERPRISE_2') {
        aggregated['Enterprise'] += count;
      } else if (s.customerType !== 'ENTERPRISE') {
        // Handle other types if any (excluding legacy ENTERPRISE)
        const name = s.customerType.replace('_', ' ');
        if (!aggregated[name]) aggregated[name] = 0;
        aggregated[name] += count;
      }
    });

    return Object.entries(aggregated)
      .filter(([_, value]) => value > 0)
      .map(([name, value], idx) => ({
        name,
        value,
        color: palette[idx % palette.length]
      }));
  }, [data]);

  const csv = useMemo(() => {
    const header = "name,email,sales_rep,orders,revenue,customerType,since";
    const rows = (data.topCustomers || [])
      .filter((c: any) => c.customerType !== 'ENTERPRISE') // legacy filter (kept)
      .map((c: any) => {
        let displayType = c.customerType;
        if (c.customerType === 'B2C' || c.customerType === 'B2B') {
          displayType = 'Wholesale';
        } else if (c.customerType === 'ENTERPRISE_1' || c.customerType === 'ENTERPRISE_2') {
          displayType = 'Enterprise';
        }
        const salesRep = c.salesRep ? `${c.salesRep.name} (${c.salesRep.email})` : 'N/A';
        return `${c.name},${c.email},"${salesRep}",${c.orders},${c.revenue},${displayType},${c.since}`;
      });
    return [header, ...rows].join("\n");
  }, [data]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_insights_${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Customer Insights</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Segments, value, and top customers</p>
          </div>
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
            <Button variant="outline" onClick={downloadCsv} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>By revenue</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sales Rep</TableHead>
                    <TableHead>Customer Type</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : (() => {
                    const filteredCustomers = (data.topCustomers || []).filter((c: any) => c.customerType !== 'ENTERPRISE');
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

                    return paginatedCustomers.map((c: any, idx: number) => {
                      let displayType = c.customerType;
                      if (c.customerType === 'B2C' || c.customerType === 'B2B') {
                        displayType = 'Wholesale';
                      } else if (c.customerType === 'ENTERPRISE_1' || c.customerType === 'ENTERPRISE_2') {
                        displayType = 'Enterprise';
                      }
                      return (
                        <TableRow
                          key={c.id || idx}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedCustomerId(c.id)}
                        >
                          <TableCell>{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium text-primary hover:underline">{c.name}</TableCell>
                          <TableCell className="truncate max-w-[180px]" title={c.email}>{c.email}</TableCell>
                          <TableCell>
                            {c.salesRep ? (
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{c.salesRep.name}</span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={c.salesRep.email}>
                                  {c.salesRep.email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>{displayType}</TableCell>
                          <TableCell>{c.orders}</TableCell>
                          <TableCell>{formatCurrency(c.revenue)}</TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
              {(() => {
                const filteredCustomers = (data.topCustomers || []).filter((c: any) => c.customerType !== 'ENTERPRISE');
                const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

                if (totalPages <= 1) return null;

                return (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Segments</CardTitle>
              <CardDescription>Distribution by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 w-full">
                  {loading ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <Skeleton className="w-[220px] h-[220px] rounded-full" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={segmentChart} cx="50%" cy="50%" innerRadius={80} outerRadius={110} dataKey="value">
                          {segmentChart.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-4">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex flex-col p-4 rounded-2xl bg-muted/30 border border-border/50">
                        <Skeleton className="h-4 w-16 mb-2" />
                        <Skeleton className="h-8 w-12" />
                      </div>
                    ))
                  ) : segmentChart.map((s: any) => (
                    <div key={s.name} className="flex flex-col p-4 rounded-2xl bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-sm font-bold truncate">{s.name}</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-black text-primary">{s.value}</span>
                        <span className="text-[10px] font-bold text-muted-foreground">Customers</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
          <DialogContent className={cn("flex flex-col bg-background text-foreground", "w-[95vw] sm:w-auto sm:max-w-[1400px] max-h-[90vh] overflow-y-auto")}>
            <DialogHeader>
              <DialogTitle className={cn("text-2xl", summaryLoading && "sr-only")}>
                {summaryLoading ? "Loading Profile..." : `Customer Profile: ${customerSummary?.customer?.firstName} ${customerSummary?.customer?.lastName}`}
              </DialogTitle>
              {!summaryLoading && (
                <DialogDescription className="text-base text-muted-foreground">
                  {customerSummary?.customer?.email} • {customerSummary?.customer?.customerType === 'B2C' || customerSummary?.customer?.customerType === 'B2B' ? 'Wholesale' : 'Enterprise'}
                  {customerSummary?.customer?.salesRep && (
                    <span className="block mt-1 text-sm font-medium text-primary">
                      Assigned to: {customerSummary.customer.salesRep.name} ({customerSummary.customer.salesRep.email})
                    </span>
                  )}
                </DialogDescription>
              )}
            </DialogHeader>

            {summaryLoading ? (
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            ) : (
              <Tabs defaultValue="products" className="mt-8 flex flex-col h-full">
                <div className="w-full mb-8">
                  <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/50 p-1">
                    <TabsTrigger value="products" className="text-sm font-semibold h-full">Top Ordered Products</TabsTrigger>
                    <TabsTrigger value="orders" className="text-sm font-semibold h-full">Recent Orders</TabsTrigger>
                    <TabsTrigger value="growth" className="text-sm font-semibold h-full">Growth Analysis</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="products" className="mt-0 outline-none flex-1">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {(customerSummary?.topProducts || []).map((p: any, i: number) => (
                      <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all border border-transparent hover:border-border/40 group shadow-sm gap-4 overflow-hidden">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted/50 shrink-0 border border-border/20">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                              <Users className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors leading-tight mb-1" title={p.name}>{p.name}</p>
                          <p className="text-xs text-muted-foreground font-medium">{p.quantity} units total</p>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <span className="text-xl font-black text-primary tracking-tight whitespace-nowrap">{formatCurrency(p.revenue)}</span>
                        </div>
                      </div>
                    ))}
                    {(customerSummary?.topProducts || []).length === 0 && (
                      <div className="col-span-full text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-muted">
                        <p className="text-muted-foreground font-semibold">No product order history found for this customer.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="orders" className="mt-0 outline-none flex-1">
                  <div className="grid gap-6 sm:grid-cols-2">
                    {(customerSummary?.recentOrders || []).map((o: any) => (
                      <div key={o.id} className="flex flex-col border rounded-3xl p-6 hover:border-primary/40 transition-all bg-card/60 shadow-sm hover:shadow-xl group relative overflow-hidden">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                          <div className="space-y-1.5 min-w-[140px] flex-1">
                            <span className="font-mono text-xs font-bold bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-lg group-hover:text-primary group-hover:bg-primary/5 transition-colors block w-fit truncate">#{o.orderNumber}</span>
                            <p className="text-xs text-muted-foreground font-semibold pl-1 uppercase tracking-wider">{new Date(o.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                          </div>
                          <div className="text-right flex flex-col items-end shrink-0">
                            <p className="text-2xl font-black text-primary leading-none mb-2 whitespace-nowrap">{formatCurrency(o.totalAmount)}</p>
                            <span className="capitalize border px-3 py-1 rounded-full bg-primary/5 border-primary/20 text-primary font-bold text-[10px] tracking-wider inline-block">
                              {o.status.toLowerCase()}
                            </span>
                          </div>
                        </div>

                        <div className="mt-auto pt-5 border-t border-dashed border-border/80 flex items-end justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 mb-3">Order Composition</p>
                            <div className="flex flex-wrap gap-2">
                              {o.items.map((it: any, j: number) => (
                                <span key={j} className="text-[11px] bg-secondary/50 text-secondary-foreground px-3 py-2 rounded-xl font-bold border border-border/20 shadow-sm backdrop-blur-sm">
                                  {it.quantity}x {it.name} {it.variantName ? `(${it.variantName})` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditOrder(o.id)}
                            className="shrink-0 rounded-xl border-primary/20 hover:border-primary/50 hover:bg-primary/5 font-bold shadow-sm transition-all group/btn h-8 px-3 text-[11px] mt-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-primary group-hover/btn:scale-110 transition-transform" />
                            View Order
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(customerSummary?.recentOrders || []).length === 0 && (
                      <div className="col-span-full text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-muted">
                        <p className="text-muted-foreground font-semibold">No recent orders found for this customer.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="growth" className="mt-0 outline-none flex-1">
                  <Card className="border-none shadow-none bg-muted/10 rounded-3xl p-6">
                    <CardHeader className="px-0 pt-0 pb-6">
                      <CardTitle className="text-lg font-bold flex items-center justify-between">
                        Monthly Revenue Growth
                        <span className="text-xs font-medium text-muted-foreground bg-background px-3 py-1 rounded-full border border-border/50">Last 12 Months</span>
                      </CardTitle>
                    </CardHeader>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={customerSummary?.monthlyGrowth || []}
                          margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                        >
                          <defs>
                            <linearGradient id="colorRevenueCustomer" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis
                            dataKey="date"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={12}
                            minTickGap={20}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `$${v.toLocaleString()}`}
                            width={60}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border border-border/50 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                                    <div className="flex flex-col gap-1.5">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">{payload[0].payload.month}</p>
                                      <div className="flex flex-col">
                                        <p className="text-xl font-black text-primary tracking-tight">{formatCurrency(payload[0].value as number)}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                          <p className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">{payload[0].payload.orders} Total Orders</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorRevenueCustomer)"
                            animationDuration={1500}
                            activeDot={{
                              r: 6,
                              strokeWidth: 2,
                              stroke: "hsl(var(--background))",
                              fill: "#10b981"
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        <EditOrderDialog
          order={editingOrder}
          open={!!editingOrder}
          onOpenChange={(open) => !open && setEditingOrder(null)}
          onSuccess={handleOrderUpdated}
          onDelete={handleDeleteOrder}
        />
      </div>
    </DashboardLayout >
  );
}
