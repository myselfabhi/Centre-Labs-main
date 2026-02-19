'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, Calendar, DollarSign, MapPin, Eye, ExternalLink } from 'lucide-react';
import { Customer, Order, api } from '@/lib/api';

interface CustomerOrdersDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrderStatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: 'Pending', variant: 'secondary' },
    CONFIRMED: { label: 'Confirmed', variant: 'default' },
    PROCESSING: { label: 'Processing', variant: 'default' },
    SHIPPED: { label: 'Shipped', variant: 'default' },
    DELIVERED: { label: 'Delivered', variant: 'default' },
    CANCELLED: { label: 'Cancelled', variant: 'destructive' },
    RETURNED: { label: 'Returned', variant: 'outline' },
  };
  
  const config = statusMap[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: 'Pending', variant: 'secondary' },
    PAID: { label: 'Paid', variant: 'default' },
    FAILED: { label: 'Failed', variant: 'destructive' },
    REFUNDED: { label: 'Refunded', variant: 'outline' },
    PARTIAL: { label: 'Partial', variant: 'outline' },
  };
  
  const config = statusMap[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export function CustomerOrdersDialog({ customer, open, onOpenChange }: CustomerOrdersDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer && open) {
      setLoading(true);
      setError(null);
      
      // Fetch orders for this customer
      api.getOrders({ customerId: customer.id, limit: 100 })
        .then(response => {
          if (response.success) {
            setOrders(response.data?.orders || []);
          } else {
            setError(response.error || 'Failed to fetch orders');
          }
        })
        .catch(error => {
          console.error('Error fetching customer orders:', error);
          setError('Failed to fetch orders');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [customer, open]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleViewOrder = (orderId: string) => {
    // Navigate to orders page with order ID parameter to open order details dialog
    window.location.href = `/orders?orderId=${orderId}`;
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`/avatars/${customer.id}.jpg`} />
              <AvatarFallback>
                {getInitials(customer.firstName, customer.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-semibold">
                {customer.firstName} {customer.lastName}'s Orders
              </div>
              <div className="text-sm text-muted-foreground">
                {orders.length} order{orders.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading orders...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <Package className="h-8 w-8 mr-2" />
            <span>{error}</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No orders found</p>
            <p className="text-sm">This customer hasn't placed any orders yet.</p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {/* Orders Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Orders Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {orders.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Orders</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0))}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Spent</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {orders.filter(order => order.status === 'DELIVERED').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Delivered</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {orders.filter(order => order.status === 'PENDING').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Orders Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Order History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.orderNumber || order.id.slice(-8)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={order.status} />
                          </TableCell>
                          <TableCell>
                            <PaymentStatusBadge status={order.payments?.[0]?.status || 'PENDING'} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(order.totalAmount || 0)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order._count?.items || 0} item{(order._count?.items || 0) !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order.id)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recent Orders Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Recent Orders Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              Order #{order.orderNumber || order.id.slice(-8)}
                            </span>
                            <OrderStatusBadge status={order.status} />
                            <PaymentStatusBadge status={order.payments?.[0]?.status || 'PENDING'} />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="ml-2 font-medium">
                              {formatCurrency(order.totalAmount || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Items:</span>
                            <span className="ml-2">
                              {order._count?.items || 0} item{(order._count?.items || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Shipping:</span>
                            <span className="ml-2">
                              {order.shippingAddress?.city || 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        {order.notes && order.notes.length > 0 && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <span className="font-medium">Notes:</span> {order.notes[0]?.note || 'N/A'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
