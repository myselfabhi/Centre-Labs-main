"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ProtectedRoute } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, Check, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { api, resolveImageUrl } from "@/lib/api";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type FilterTab = "all" | "low-stock" | "out-of-stock";

interface InventoryItem {
    id: string;
    productId: string;
    productName: string;
    productImage: string | null;
    variantName: string;
    sku: string;
    committed: number;
    available: number;
    onHand: number;
    lowStockThreshold: number;
    barcode: string;
    sellWhenOutOfStock: boolean;
    price: number;
    regularPrice: number;
    salePrice: number | null;
}

interface EditedValues {
    [key: string]: {
        committed?: number;
        available?: number;
        onHand?: number;
    };
}

export default function InventoryPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
    const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editedValues, setEditedValues] = useState<EditedValues>({});
    const [saving, setSaving] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 10;

    // Total counts for badges (across all pages)
    const [totalCounts, setTotalCounts] = useState({
        all: 0,
        lowStock: 0,
        outOfStock: 0,
    });

    // Committed orders dialog state
    const [showCommittedDialog, setShowCommittedDialog] = useState(false);
    const [committedOrders, setCommittedOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [selectedVariantInfo, setSelectedVariantInfo] = useState<{ name: string; sku: string } | null>(null);

    // Fetch inventory data
    useEffect(() => {
        const fetchInventory = async () => {
            setLoading(true);
            try {
                const response = await api.getInventoryManagement({
                    search: searchQuery || undefined,
                    filter: activeFilter,
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                });

                if (response.success && response.data) {
                    // Sanitize data: convert negative values to absolute values
                    const sanitizedData = response.data.map((item: InventoryItem) => ({
                        ...item,
                        committed: Math.max(0, Math.abs(item.committed || 0)),
                        available: Math.max(0, Math.abs(item.available || 0)),
                        onHand: Math.max(0, Math.abs(item.onHand || 0)),
                    }));

                    setInventoryData(sanitizedData);

                    // Update pagination info
                    if ((response as any).pagination) {
                        setTotalPages((response as any).pagination.pages);
                        setTotalItems((response as any).pagination.total);
                    }

                    // Update total counts for badges
                    if ((response as any).counts) {
                        setTotalCounts((response as any).counts);
                    }
                }
            } catch (error) {
                console.error("Error fetching inventory:", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search - reduced to 150ms for faster response
        const timeoutId = setTimeout(() => {
            fetchInventory();
        }, 150);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, activeFilter, currentPage]);

    // Reset to page 1 when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeFilter]);

    const handleRowClick = (productId: string) => {
        router.push(`/inventory/${productId}`);
    };

    const handleValueChange = (itemId: string, field: 'committed' | 'available' | 'onHand', value: number) => {
        setEditedValues(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value,
            },
        }));
    };

    const hasChanges = (itemId: string) => {
        return editedValues[itemId] !== undefined;
    };

    const handleCancel = (itemId: string) => {
        setEditedValues(prev => {
            const newEdited = { ...prev };
            delete newEdited[itemId];
            return newEdited;
        });
    };

    const handleSave = async (item: InventoryItem) => {
        const changes = editedValues[item.id];
        if (!changes) return;

        setSaving(item.id);
        try {
            // Ensure all values are non-negative
            const newCommitted = Math.max(0, Math.abs(changes.committed ?? item.committed));
            const newAvailable = Math.max(0, Math.abs(changes.available ?? item.available));
            const newOnHand = Math.max(0, Math.abs(changes.onHand ?? item.onHand));

            // Call the backend API to update inventory
            const response = await api.updateVariantInventory(item.id, {
                onHand: newOnHand,
                committed: newCommitted,
                reason: "Manual adjustment from inventory management page",
            });

            if (response.success) {
                // Clear edited values for this item
                setEditedValues(prev => {
                    const newEdited = { ...prev };
                    delete newEdited[item.id];
                    return newEdited;
                });

                toast.success("Inventory updated successfully");

                // Refresh the data to get updated status and move items to correct tabs
                try {
                    const refreshResponse = await api.getInventoryManagement({
                        search: searchQuery || undefined,
                        filter: activeFilter,
                        page: currentPage,
                        limit: ITEMS_PER_PAGE,
                    });

                    if (refreshResponse.success && refreshResponse.data) {
                        // Sanitize data: convert negative values to absolute values
                        const sanitizedData = refreshResponse.data.map((item: InventoryItem) => ({
                            ...item,
                            committed: Math.max(0, Math.abs(item.committed || 0)),
                            available: Math.max(0, Math.abs(item.available || 0)),
                            onHand: Math.max(0, Math.abs(item.onHand || 0)),
                        }));

                        setInventoryData(sanitizedData);

                        // Update pagination info
                        if ((refreshResponse as any).pagination) {
                            setTotalPages((refreshResponse as any).pagination.pages);
                            setTotalItems((refreshResponse as any).pagination.total);
                        }

                        // Update total counts for badges
                        if ((refreshResponse as any).counts) {
                            setTotalCounts((refreshResponse as any).counts);
                        }
                    }
                } catch (refreshError) {
                    console.error("Error refreshing inventory:", refreshError);
                }
            } else {
                toast.error("Failed to update inventory");
            }
        } catch (error) {
            console.error("Error saving inventory:", error);
            toast.error("Failed to update inventory. Please try again.");
        } finally {
            setSaving(null);
        }
    };

    const getStockStatus = (available: number, threshold: number) => {
        if (available === 0) return { label: "Out of stock", variant: "destructive" as const };
        if (available <= threshold) return { label: "Low stock", variant: "secondary" as const };
        return { label: "In stock", variant: "default" as const };
    };

    const generateNumberOptions = (max: number = 1000) => {
        return Array.from({ length: max + 1 }, (_, i) => i);
    };

    const handleCommittedClick = async (item: InventoryItem) => {
        setLoadingOrders(true);
        setShowCommittedDialog(true);
        setSelectedVariantInfo({ name: `${item.productName} - ${item.variantName}`, sku: item.sku });
        try {
            const response = await api.getVariantCommittedOrders(item.id);
            if (response.success && response.data) {
                setCommittedOrders(response.data);
            }
        } catch (error) {
            console.error("Error fetching committed orders:", error);
            toast.error("Failed to load committed orders");
        } finally {
            setLoadingOrders(false);
        }
    };

    const allCount = totalItems;
    const lowStockCount = inventoryData.filter(
        (i) => i.available > 0 && i.available <= i.lowStockThreshold
    ).length;
    const outOfStockCount = inventoryData.filter((i) => i.available === 0).length;

    return (
        <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'STAFF']}>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                            <p className="text-muted-foreground">Manage your product inventory and stock levels</p>
                        </div>
                    </div>

                    {/* Filters and Search */}
                    <div className="flex items-center justify-between gap-4">
                        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
                            <TabsList>
                                <TabsTrigger value="all">
                                    All
                                    <Badge variant="secondary" className="ml-2">
                                        {totalCounts.all}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="low-stock">
                                    Low Stock
                                    <Badge variant="secondary" className="ml-2">
                                        {totalCounts.lowStock}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="out-of-stock">
                                    Out of Stock
                                    <Badge variant="destructive" className="ml-2">
                                        {totalCounts.outOfStock}
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="relative w-96">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search products by name or SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Inventory Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Committed</TableHead>
                                    <TableHead className="text-right">Available</TableHead>
                                    <TableHead className="text-right">On Hand</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : inventoryData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                            <p className="text-muted-foreground">No products found</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    inventoryData.map((item) => {
                                        const status = getStockStatus(item.available, item.lowStockThreshold);
                                        const currentCommitted = editedValues[item.id]?.committed ?? item.committed;
                                        const currentAvailable = editedValues[item.id]?.available ?? item.available;
                                        const currentOnHand = editedValues[item.id]?.onHand ?? item.onHand;

                                        return (
                                            <TableRow
                                                key={item.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleRowClick(item.id)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                                                        {item.productImage ? (
                                                            <img
                                                                src={resolveImageUrl(item.productImage)}
                                                                alt={item.productName}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Package className="h-5 w-5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{item.productName}</div>
                                                        {item.variantName && (
                                                            <div className="text-sm text-muted-foreground">{item.variantName}</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{item.sku}</TableCell>

                                                {/* Committed */}
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <span
                                                        className="underline cursor-pointer hover:text-primary transition-colors"
                                                        onClick={() => handleCommittedClick(item)}
                                                    >
                                                        {currentCommitted}
                                                    </span>
                                                </TableCell>

                                                {/* Available */}
                                                <TableCell className="text-right">
                                                    <span className="underline cursor-pointer">
                                                        {currentAvailable}
                                                    </span>
                                                </TableCell>

                                                {/* On Hand Input */}
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="9999"
                                                            value={currentOnHand}
                                                            onChange={(e) => handleValueChange(item.id, 'onHand', parseInt(e.target.value) || 0)}
                                                            className="w-24 ml-auto text-right"
                                                        />
                                                        {editedValues[item.id]?.onHand !== undefined && (
                                                            <div className="absolute top-full right-0 mt-1 flex gap-1 z-10 bg-white border rounded-md shadow-lg p-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleCancel(item.id)}
                                                                    disabled={saving === item.id}
                                                                    className="h-7 px-2 text-xs"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={() => handleSave(item)}
                                                                    disabled={saving === item.id}
                                                                    className="h-7 px-2 text-xs gap-1"
                                                                >
                                                                    <Check className="h-3 w-3" />
                                                                    {saving === item.id ? "Saving..." : "Save"}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <Badge variant={status.variant}>{status.label}</Badge>
                                                </TableCell>

                                                {/* Actions Column */}
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRowClick(item.id);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} products
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        // Show first page, last page, current page, and pages around current
                                        if (
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
                                            return (
                                                <Button
                                                    key={page}
                                                    variant={currentPage === page ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(page)}
                                                    className="w-10"
                                                >
                                                    {page}
                                                </Button>
                                            );
                                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                                            return <span key={page} className="px-2">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Committed Orders Dialog */}
                <Dialog open={showCommittedDialog} onOpenChange={setShowCommittedDialog}>
                    <DialogContent className="w-[95vw] sm:max-w-[1400px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Committed Orders</DialogTitle>
                            <DialogDescription>
                                Orders holding inventory for {selectedVariantInfo?.name} (SKU: {selectedVariantInfo?.sku})
                            </DialogDescription>
                        </DialogHeader>

                        {loadingOrders ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                            </div>
                        ) : committedOrders.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                <p>No committed orders found</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order Number</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {committedOrders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{order.customerName}</div>
                                                        <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                        order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                                                            order.status === 'LABEL_CREATED' ? 'bg-purple-100 text-purple-800' :
                                                                order.status === 'ON_HOLD' ? 'bg-orange-100 text-orange-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {order.status.replace('_', ' ')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{order.quantity}</TableCell>
                                                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.push(`/orders/${order.id}`)}
                                                        className="gap-1"
                                                    >
                                                        View
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </DashboardLayout >
        </ProtectedRoute >
    );
}
