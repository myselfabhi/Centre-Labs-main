"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Package,
    User,
    CreditCard,
    Truck,
    MapPin,
    Phone,
    Mail,
    Calendar,
    DollarSign,
    ShoppingCart,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Tag,
    RotateCcw
} from "lucide-react";
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sku?: string;
}

interface OrderDetails {
    id: string;
    orderNumber: string;
    customer: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
    };
    status: string;
    paymentStatus: string;
    shippingStatus: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
    shippingAddress?: {
        name: string;
        street: string;
        address2?: string;
        company?: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    billingAddress?: {
        name: string;
        street: string;
        address2?: string;
        company?: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    paymentMethod?: {
        type: string;
        last4?: string;
        brand?: string;
    };
    payments?: Array<{
        id: string;
        paymentMethod: string;
        provider?: string;
        transactionId?: string;
        amount: number;
        currency: string;
        status: string;
        paidAt?: string;
    }>;
    notes?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
}

interface ViewOrderDetailsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string;
}

const StatusBadge = ({ status }: { status: string }) => {
    const getStatusConfig = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return { variant: 'secondary' as const, icon: Clock, label: 'Pending' };
            case 'processing':
                return { variant: 'default' as const, icon: AlertCircle, label: 'Processing' };
            case 'label_created':
                return { variant: 'default' as const, icon: Tag, label: 'Label Printed' };
            case 'shipped':
                return { variant: 'default' as const, icon: Truck, label: 'Shipped' };
            case 'delivered':
            case 'completed':
                return { variant: 'default' as const, icon: CheckCircle, label: 'Delivered' };
            case 'cancelled':
                return { variant: 'destructive' as const, icon: XCircle, label: 'Cancelled' };
            case 'refunded':
                return { variant: 'outline' as const, icon: RotateCcw, label: 'Refunded' };
            default:
                return { variant: 'secondary' as const, icon: Clock, label: status };
        }
    };

    const config = getStatusConfig(status);
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
};

const PaymentBadge = ({ status }: { status: string }) => {
    const getPaymentConfig = (status: string) => {
        switch (status.toLowerCase()) {
            case 'paid':
                return { variant: 'default' as const, className: 'bg-green-100 text-green-800' };
            case 'pending':
                return { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' };
            case 'failed':
                return { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' };
            case 'refunded':
                return { variant: 'outline' as const, className: 'bg-gray-100 text-gray-800' };
            default:
                return { variant: 'secondary' as const, className: '' };
        }
    };

    const config = getPaymentConfig(status);

    return (
        <Badge variant={config.variant} className={config.className}>
            {status}
        </Badge>
    );
};

export function ViewOrderDetails({ open, onOpenChange, orderId }: ViewOrderDetailsProps) {
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && orderId) {
            loadOrderDetails();
        }
    }, [open, orderId]);

    const loadOrderDetails = async () => {
        setLoading(true);
        try {
            const response = await api.getOrder(orderId);

            if (response.success && response.data) {
                const order = response.data;

                // Transform the API response to match our OrderDetails interface
                const normalizePaymentStatus = (status?: string) => {
                    if (!status) return 'pending';
                    switch (status.toUpperCase()) {
                        case 'COMPLETED':
                            return 'paid';
                        case 'PENDING':
                            return 'pending';
                        case 'FAILED':
                            return 'failed';
                        case 'REFUNDED':
                            return 'refunded';
                        case 'CANCELLED':
                            return 'cancelled';
                        default:
                            return status.toLowerCase();
                    }
                };

                const payments = (order.payments || []).map((p: any) => ({
                    id: p.id,
                    paymentMethod: p.paymentMethod,
                    provider: p.provider,
                    transactionId: p.transactionId,
                    amount: Number(p.amount || 0),
                    currency: p.currency || 'USD',
                    status: normalizePaymentStatus(p.status),
                    paidAt: p.paidAt || undefined,
                }));

                const overallPaymentStatus = payments.find(p => p.status === 'paid')
                    ? 'paid'
                    : (payments.length > 0 ? payments[0].status : 'pending');

                const orderDetails: OrderDetails = {
                    id: order.id,
                    orderNumber: order.orderNumber || order.id,
                    customer: {
                        id: order.customer?.id || '',
                        firstName: order.customer?.firstName || '',
                        lastName: order.customer?.lastName || '',
                        email: order.customer?.email || '',
                        phone: order.customer?.mobile || ''
                    },
                    status: order.status?.toLowerCase() || 'pending',
                    paymentStatus: overallPaymentStatus,
                    shippingStatus: order.status?.toLowerCase() || 'pending',
                    items: order.items?.map(item => ({
                        id: item.id,
                        productId: item.variant?.product?.id || '',
                        productName: item.variant?.product?.name || 'Unknown Product',
                        variantName: item.variant?.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        sku: item.variant?.sku
                    })) || [],
                    subtotal: order.subtotal || 0,
                    tax: order.taxAmount || 0,
                    shipping: order.shippingAmount || 0,
                    discount: order.discountAmount || 0,
                    total: order.totalAmount || 0,
                    currency: "USD",
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                    shippingAddress: order.shippingAddress ? {
                        name: `${order.shippingAddress.firstName || ''} ${order.shippingAddress.lastName || ''}`.trim() || 'N/A',
                        street: order.shippingAddress.address1 || '',
                        address2: order.shippingAddress.address2 || '',
                        company: order.shippingAddress.company || '',
                        city: order.shippingAddress.city || '',
                        state: order.shippingAddress.state || '',
                        zipCode: order.shippingAddress.postalCode || '',
                        country: order.shippingAddress.country || ''
                    } : undefined,
                    billingAddress: order.billingAddress ? {
                        name: `${order.billingAddress.firstName || ''} ${order.billingAddress.lastName || ''}`.trim() || 'N/A',
                        street: order.billingAddress.address1 || '',
                        address2: order.billingAddress.address2 || '',
                        company: order.billingAddress.company || '',
                        city: order.billingAddress.city || '',
                        state: order.billingAddress.state || '',
                        zipCode: order.billingAddress.postalCode || '',
                        country: order.billingAddress.country || ''
                    } : undefined,
                    paymentMethod: order.payments?.[0] ? {
                        type: (order.payments[0].provider === 'manual' || order.payments[0].paymentMethod === 'BANK_TRANSFER') ? 'Manual' : (order.payments[0].paymentMethod || 'card'),
                        last4: undefined,
                        brand: (order.payments[0].provider === 'manual') ? undefined : (order.payments[0].provider || undefined)
                    } : undefined,
                    payments,
                    notes: order.notes?.[0]?.note,
                    trackingNumber: order.shipments?.[0]?.trackingNumber,
                    estimatedDelivery: undefined
                };

                setOrderDetails(orderDetails);
            } else {
                toast.error("Failed to load order details");
            }
        } catch (error) {
            console.error("Error loading order details:", error);
            toast.error("Failed to load order details");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: orderDetails?.currency || 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-[96vw] sm:w-auto max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading order details...</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!orderDetails) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-[96vw] sm:w-auto max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                    </DialogHeader>
                    <div className="text-center py-12">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Order not found</h3>
                        <p className="text-muted-foreground">The requested order could not be found.</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[96vw] sm:w-auto max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Order Details - {orderDetails.orderNumber}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="items">Items</TabsTrigger>
                        <TabsTrigger value="shipping">Shipping</TabsTrigger>
                        <TabsTrigger value="payment">Payment</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        {/* Order Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" />
                                    Order Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Order Status</p>
                                        <div className="mt-1">
                                            <StatusBadge status={orderDetails.status} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Payment Status</p>
                                        <div className="mt-1">
                                            <PaymentBadge status={orderDetails.paymentStatus} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Shipping Status</p>
                                        <div className="mt-1">
                                            <StatusBadge status={orderDetails.shippingStatus} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Total Items</p>
                                        <p className="text-lg font-semibold">{orderDetails.items.length}</p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Order Date</p>
                                        <p className="font-medium">{formatDate(orderDetails.createdAt)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Last Updated</p>
                                        <p className="font-medium">{formatDate(orderDetails.updatedAt)}</p>
                                    </div>
                                    {orderDetails.trackingNumber && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Tracking Number</p>
                                            <p className="font-mono text-sm">{orderDetails.trackingNumber}</p>
                                        </div>
                                    )}
                                    {orderDetails.estimatedDelivery && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                                            <p className="font-medium">{formatDate(orderDetails.estimatedDelivery)}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customer Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Customer Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Name</p>
                                            <p className="font-medium">
                                                {orderDetails.customer.firstName} {orderDetails.customer.lastName}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Email</p>
                                            <p className="font-medium flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                {orderDetails.customer.email}
                                            </p>
                                        </div>
                                        {orderDetails.customer.phone && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Phone</p>
                                                <p className="font-medium flex items-center gap-2">
                                                    <Phone className="h-4 w-4" />
                                                    {orderDetails.customer.phone}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Financial Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Financial Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(orderDetails.subtotal)}</span>
                                    </div>
                                    {orderDetails.tax > 0 && (
                                        <div className="flex justify-between">
                                            <span>Tax</span>
                                            <span>{formatCurrency(orderDetails.tax)}</span>
                                        </div>
                                    )}
                                    {orderDetails.shipping > 0 && (
                                        <div className="flex justify-between">
                                            <span>Shipping</span>
                                            <span>{formatCurrency(orderDetails.shipping)}</span>
                                        </div>
                                    )}
                                    {orderDetails.discount > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>Discount</span>
                                            <span>-{formatCurrency(orderDetails.discount)}</span>
                                        </div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between font-semibold text-lg">
                                        <span>Total</span>
                                        <span>{formatCurrency(orderDetails.total)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="items" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Order Items
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {orderDetails.items.map((item, index) => (
                                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                                        <Package className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{item.productName}</p>
                                                        {item.variantName && (
                                                            <p className="text-sm text-muted-foreground">
                                                                Variant: {item.variantName}
                                                            </p>
                                                        )}
                                                        {item.sku && (
                                                            <p className="text-sm text-muted-foreground">
                                                                SKU: {item.sku}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {item.quantity} × {formatCurrency(item.unitPrice)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="shipping" className="space-y-6">
                        {orderDetails.shippingAddress && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Truck className="h-5 w-5" />
                                        Shipping Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1.5 text-sm">
                                        <div className="flex">
                                            <span className="text-muted-foreground w-20 shrink-0 font-medium">Name:</span>
                                            <span className="font-semibold">{orderDetails.shippingAddress.name}</span>
                                        </div>
                                        {orderDetails.shippingAddress.company && (
                                            <div className="flex">
                                                <span className="text-muted-foreground w-20 shrink-0 font-medium">Company:</span>
                                                <span className="font-medium">{orderDetails.shippingAddress.company}</span>
                                            </div>
                                        )}
                                        <div className="flex">
                                            <span className="text-muted-foreground w-20 shrink-0 font-medium">Address:</span>
                                            <div className="flex flex-col">
                                                <span>{orderDetails.shippingAddress.street}</span>
                                                {orderDetails.shippingAddress.address2 && (
                                                    <span className="text-muted-foreground">{orderDetails.shippingAddress.address2}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <span className="text-muted-foreground w-20 shrink-0 font-medium">Location:</span>
                                            <span className="text-muted-foreground">
                                                {orderDetails.shippingAddress.city}, {orderDetails.shippingAddress.state} {orderDetails.shippingAddress.zipCode}
                                            </span>
                                        </div>
                                        <div className="flex">
                                            <span className="text-muted-foreground w-20 shrink-0 font-medium">Country:</span>
                                            <span className="text-muted-foreground">{orderDetails.shippingAddress.country}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {orderDetails.billingAddress && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Billing Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1.5 text-sm">
                                        <div className="flex">
                                            <span className="text-muted-foreground w-20 shrink-0 font-medium">Name:</span>
                                            <span className="font-semibold">{orderDetails.billingAddress.name}</span>
                                        </div>
                                        {orderDetails.billingAddress.company && (
                                            <div className="flex">
                                                <span className="text-muted-foreground w-20 shrink-0 font-medium">Company:</span>
                                                <span className="font-medium">{orderDetails.billingAddress.company}</span>
                                            </div>
                                        )}
                                        <div className="flex">
                                            <span className="text-muted-foreground w-20 shrink-0 font-medium">Address:</span>
                                            <div className="flex flex-col">
                                                <span>{orderDetails.billingAddress.street}</span>
                                                {orderDetails.billingAddress.address2 && (
                                                    <span className="text-muted-foreground">{orderDetails.billingAddress.address2}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <span className="text-muted-foreground w-20 shrink-0 font-medium">Location:</span>
                                            <span className="text-muted-foreground">
                                                {orderDetails.billingAddress.city}, {orderDetails.billingAddress.state} {orderDetails.billingAddress.zipCode}
                                            </span>
                                        </div>
                                        <div className="flex">
                                            <span className="text-muted-foreground w-20 shrink-0 font-medium">Country:</span>
                                            <span className="text-muted-foreground">{orderDetails.billingAddress.country}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="payment" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Payment Status</p>
                                        <PaymentBadge status={orderDetails.paymentStatus} />
                                    </div>
                                    {orderDetails.paymentMethod && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Payment Method</p>
                                            <p className="font-medium">
                                                {orderDetails.paymentMethod.type}
                                                {orderDetails.paymentMethod.brand ? ` · ${orderDetails.paymentMethod.brand}` : ''}
                                                {orderDetails.paymentMethod.last4 ? ` · •••• ${orderDetails.paymentMethod.last4}` : ''}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {orderDetails.payments && orderDetails.payments.length > 0 && (
                                    <div className="space-y-3">
                                        {orderDetails.payments.map((p) => (
                                            <div key={p.id} className="flex items-center justify-between p-3 border rounded">
                                                <div className="flex-1">
                                                    <div className="font-medium">
                                                        {(p.provider === 'manual' || p.paymentMethod === 'BANK_TRANSFER') ? 'Manual' : p.paymentMethod + (p.provider ? ` · ${p.provider}` : '')}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {p.transactionId ? `Txn: ${p.transactionId}` : 'No transaction ID'}
                                                        {p.paidAt ? ` · ${new Date(p.paidAt).toLocaleString()}` : ''}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge variant={p.status === 'paid' ? 'default' : (p.status === 'pending' ? 'secondary' : (p.status === 'failed' ? 'destructive' : 'outline'))}>
                                                        {p.status}
                                                    </Badge>
                                                    <span className="text-sm font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency || 'USD' }).format(p.amount)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {orderDetails.notes && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Order Notes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{orderDetails.notes}</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
} 