"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPrimitive } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Package } from "lucide-react";
import { api, formatCurrency, resolveImageUrl } from "@/lib/api";
import { OrderDateFilter } from "@/components/orders/order-date-filter";
import Image from "next/image";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductPerformancePage() {
  const [range, setRange] = useState("last_30_days");
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);
  const [salesChannelId, setSalesChannelId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({ top: [] });
  const [rankingTab, setRankingTab] = useState("revenue"); // "revenue" or "units"

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        let rangeToSend = range;
        let fromToSend = from;
        let toToSend = to;

        // Handle "1 Day" filter - 16:30 previous to 16:30 selected
        if (range === 'day' && from) {
          rangeToSend = 'custom';
          fromToSend = from;
          toToSend = from;
        }

        const res = await api.getProductPerformance(
          rangeToSend as any,
          fromToSend || undefined,
          toToSend || undefined,
          salesChannelId
        );
        console.log("[ProductPerformance] API response:", res);
        if (res.success && res.data) setData(res.data);
        else {
          toast.error(res.error || "Failed to load product performance");
          setData({ top: [] });
        }
      } catch (e: any) {
        console.error("[ProductPerformance] API error:", e);
        toast.error(e?.message || "Failed to load product performance");
        setData({ top: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, [range, from, to, salesChannelId]);

  const top10 = (data.top || []).slice(0, 10);
  const colors = [
    "#2563eb", "#7c3aed", "#16a34a", "#dc2626", "#f59e0b",
    "#0ea5e9", "#14b8a6", "#ef4444", "#8b5cf6", "#10b981",
  ];

  const revenueByProduct = top10.map((d: any) => ({ name: d.name, revenue: d.revenue }));
  const salesByProduct = top10.map((d: any) => ({ name: d.name, sales: d.sales }));
  const revenueTotal = top10.reduce((s: number, d: any) => s + (Number(d.revenue) || 0), 0) || 1;
  const revenueShare = top10.map((d: any) => ({ name: d.name, value: Number(d.revenue) || 0 }));

  const csv = useMemo(() => {
    const header = "product,variant,revenue,sales,stock";
    const rows = (data.top || []).map((d: any) => `${d.name},${d.variantName || ''},${d.revenue},${d.sales},${d.stock}`);
    return [header, ...rows].join("\n");
  }, [data]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product_performance_${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Product Performance</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Best performing products by sales and revenue</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <OrderDateFilter
              range={range}
              setRange={setRange}
              from={from}
              setFrom={setFrom}
              to={to}
              setTo={setTo}
              salesChannelId={salesChannelId}
              onSalesChannelChange={setSalesChannelId}
              className="w-full sm:w-auto"
            />
            <Button variant="outline" onClick={downloadCsv} disabled={loading || (data.top || []).length === 0} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue by Product</CardTitle>
              <CardDescription>Top {top10.length} products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {loading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByProduct} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        tickFormatter={(v) => (v?.length > 10 ? v.slice(0, 10) + "…" : v)}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={{ stroke: 'var(--border)' }}
                      />
                      <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={{ stroke: 'var(--border)' }} />
                      <Tooltip
                        formatter={(v) => [formatCurrency(Number(v) || 0), "Revenue"]}
                        contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)' }}
                        labelStyle={{ color: 'var(--popover-foreground)' }}
                        itemStyle={{ color: 'var(--popover-foreground)' }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Share</CardTitle>
              <CardDescription>Top products share of total</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="w-[180px] h-[180px] rounded-full" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revenueShare} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                        {revenueShare.map((entry: any, idx: number) => (
                          <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [formatCurrency(Number(v) || 0), n as string]}
                        contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)' }}
                        labelStyle={{ color: 'var(--popover-foreground)' }}
                        itemStyle={{ color: 'var(--popover-foreground)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Units Sold by Product</CardTitle>
            <CardDescription>Top {top10.length} products by units</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {loading ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByProduct} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tickFormatter={(v) => (v?.length > 16 ? v.slice(0, 16) + "…" : v)}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={{ stroke: 'var(--border)' }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)' }}
                      labelStyle={{ color: 'var(--popover-foreground)' }}
                      itemStyle={{ color: 'var(--popover-foreground)' }}
                    />
                    <Bar dataKey="sales" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>View products ranked by revenue or units sold</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Tabs value={rankingTab} onValueChange={setRankingTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                <TabsTrigger value="revenue">Ranked by Revenue</TabsTrigger>
                <TabsTrigger value="units">Ranked by Units Sold</TabsTrigger>
              </TabsList>

              <TabsContent value="revenue" className="mt-0">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : (data.top || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No results found for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...(data.top || [])].sort((a: any, b: any) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0)).map((row: any, idx: number) => (
                        <TableRow key={`${row.variantId}-${idx}`}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {row.image ? (
                                <Image src={resolveImageUrl(row.image)} alt="" width={28} height={28} className="rounded" />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div className="truncate max-w-[260px]" title={row.name}>{row.name}</div>
                            </div>
                          </TableCell>
                          <TableCell className="truncate max-w-[220px]" title={row.variantName || ''}>{row.variantName || '-'}</TableCell>
                          <TableCell>{formatCurrency(row.revenue)}</TableCell>
                          <TableCell>{row.sales}</TableCell>
                          <TableCell>{row.stock}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="units" className="mt-0">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Units Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : (data.top || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No results found for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...(data.top || [])].sort((a: any, b: any) => (Number(b.sales) || 0) - (Number(a.sales) || 0)).map((row: any, idx: number) => (
                        <TableRow key={`${row.variantId}-${idx}`}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {row.image ? (
                                <Image src={resolveImageUrl(row.image)} alt="" width={28} height={28} className="rounded" />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div className="truncate max-w-[260px]" title={row.name}>{row.name}</div>
                            </div>
                          </TableCell>
                          <TableCell className="truncate max-w-[220px]" title={row.variantName || ''}>{row.variantName || '-'}</TableCell>
                          <TableCell>{row.sales}</TableCell>
                          <TableCell>{formatCurrency(row.revenue)}</TableCell>
                          <TableCell>{row.stock}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


