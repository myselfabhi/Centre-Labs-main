'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { api, formatCurrency, SalesRepPerformance, SalesRepPerformanceResponse } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPaymentMethodDisplay } from "@/lib/payment-utils";

interface IndependentSalesRepsReportProps {
    range: string;
    from: Date | null;
    to: Date | null;
    salesChannelId?: string;
    onOrderClick: (orderId: string) => void;
}

export function IndependentSalesRepsReport({ range, from, to, salesChannelId, onOrderClick }: IndependentSalesRepsReportProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SalesRepPerformanceResponse | null>(null);
    const [selectedRep, setSelectedRep] = useState<SalesRepPerformance | null>(null);

    const fetchPerformance = async () => {
        setLoading(true);
        try {
            const res = await api.getSalesRepPerformance(
                range as any,
                from || undefined,
                to || undefined,
                true // independent
            );

            if (res.success && res.data) {
                setData(res.data);
                if (res.data.reps && res.data.reps.length > 0) {
                    setSelectedRep(res.data.reps[0]);
                } else {
                    setSelectedRep(null);
                }
            } else {
                toast.error(res.error || "Failed to load performance data");
            }
        } catch (error) {
            console.error("Performance fetch error:", error);
            toast.error("Error loading performance data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPerformance();
    }, [range, from, to]);

    const handleExport = () => {
        if (!data || !data.reps) return;

        try {
            const exportData = data.reps.map(rep => ({
                'Rep Name': `${rep.user.firstName} ${rep.user.lastName}`,
                'Email': rep.user.email,
                'Revenue': Number(rep.metrics.totalRevenue || 0).toFixed(2),
                'Orders': rep.metrics.totalOrders || 0,
                'Avg Order Value': Number(rep.metrics.averageOrderValue || 0).toFixed(2),
                'Customers': rep.metrics.assignedCustomers || 0,
                'Active Customers': rep.metrics.activeCustomers || 0
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Independent Reps');

            const filename = `independent-reps-performance-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            XLSX.writeFile(wb, filename);
            toast.success("Export successful");
        } catch (e) {
            console.error("Export failed:", e);
            toast.error("Export failed");
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Independent Rep Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{formatCurrency(data?.totals.totalRevenue || 0)}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{data?.totals.totalOrders || 0}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Reps</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{data?.totals.repsActive || 0}</div>}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Independent Sales Reps</CardTitle>
                            <CardDescription>Performance of sales reps not linked to any manager</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data || data.reps.length === 0}>
                            <Download className="h-4 w-4 mr-2" />
                            Export Excel
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sales Representative</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                    <TableHead className="text-right">Orders</TableHead>
                                    <TableHead className="text-right">AOV</TableHead>
                                    <TableHead className="text-right">Customers</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : !data || data.reps.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No performance data found for independent reps.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.reps.map((rep) => (
                                        <TableRow
                                            key={rep.salesRepId}
                                            className={cn(
                                                "group cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-transparent",
                                                selectedRep?.salesRepId === rep.salesRepId ? "bg-primary/10 border-l-primary" : ""
                                            )}
                                            onClick={() => setSelectedRep(rep)}
                                        >
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className={cn("font-medium", selectedRep?.salesRepId === rep.salesRepId ? "text-primary" : "")}>
                                                        {rep.user.firstName} {rep.user.lastName}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{rep.user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(rep.metrics.totalRevenue)}</TableCell>
                                            <TableCell className="text-right">{rep.metrics.totalOrders}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(rep.metrics.averageOrderValue)}</TableCell>
                                            <TableCell className="text-right">{rep.metrics.assignedCustomers}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {selectedRep && (
                <Card>
                    <CardHeader>
                        <CardTitle>Sales Log: {selectedRep.user.firstName} {selectedRep.user.lastName}</CardTitle>
                        <CardDescription>Recent orders for the selected period</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">S.No</TableHead>
                                        <TableHead>Order #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!selectedRep.recentOrders || selectedRep.recentOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No orders found for this rep in the selected period.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        selectedRep.recentOrders.map((order, index) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>
                                                    <Button variant="link" className="p-0 h-auto" onClick={() => onOrderClick(order.id)}>
                                                        {order.orderNumber}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>{order.customerName}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {order.status.toLowerCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{getPaymentMethodDisplay(order as any)}</TableCell>
                                                <TableCell>{format(new Date(order.createdAt), 'MMM d, yyyy')}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                                {selectedRep.recentOrders && selectedRep.recentOrders.length > 0 && (
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-right font-bold">Total</TableCell>
                                            <TableCell className="text-right font-bold">
                                                {formatCurrency(selectedRep.metrics.totalRevenue)}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                )}
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
