'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Package,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  CheckSquare,
  Mail
} from 'lucide-react';
import { Order } from '@/lib/api';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { getToken } from '@/lib/api';
import { RecordPaymentDialog } from './record-payment-dialog';
import { OrderDetailsDialog } from './order-details-dialog';
import { CustomerDetailsDialog } from './customer-details-dialog';
import { StatusHistoryDialog } from './status-history-dialog';
import { OrderItemsDialog } from './order-items-dialog';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
  onUpdateStatus: (order: Order) => void;
  onViewDetails?: (orderId: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
  totalOrders?: number;
  onExportAll?: () => void;
  onEmailReport?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'LABEL_CREATED':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'SHIPPED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'ON_HOLD':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusLabel = (status: string) => {
  const labels: { [key: string]: string } = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    LABEL_CREATED: 'Label Printed',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
    ON_HOLD: 'On Hold',
  };
  return labels[status] || status.replace('_', ' ');
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'FAILED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

function ordersToExcel(orders: Order[]) {
  const exportData = orders.map(order => ({
    'Order ID': order.orderNumber || order.id,
    'Customer Name': order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest',
    'Customer Email': order.customer?.email || 'N/A',
    'Status': order.status,
    'Payment Status': order.payments && order.payments.length > 0 ? order.payments[0].status : 'PENDING',
    'Total Amount': `$${Number(order.totalAmount || 0).toFixed(2)}`,
    'Items Count': order.items?.length || 0,
    'Created Date': order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss') : '',
    'Updated Date': order.updatedAt ? format(new Date(order.updatedAt), 'yyyy-MM-dd HH:mm:ss') : '',
    'Note': order.notes && Array.isArray(order.notes) && order.notes.length > 0 ? order.notes[0].note : '',
    'Sales Channel': order.salesChannel?.companyName || (order.partnerOrderId ? 'Partner Order' : 'Centre Research'),
    'Partner Order ID': order.partnerOrderId || 'N/A'
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  return wb;
}

export function OrdersTable({
  orders,
  loading,
  onEdit,
  onDelete,
  onUpdateStatus,
  onViewDetails,
  currentPage,
  totalPages,
  onPageChange,
  onRefresh,
  totalOrders,
  onExportAll,
  onEmailReport,
}: OrdersTableProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<null | 'delete' | 'export'>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

  // Dialog states
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const [statusHistoryOpen, setStatusHistoryOpen] = useState(false);
  const [orderItemsOpen, setOrderItemsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleDelete = (orderId: string) => {
    setDeletingId(orderId);
    onDelete(orderId);
    setDeletingId(null);
  };

  const handleRecordPayment = (order: Order) => {
    setSelectedOrderForPayment(order);
    setPaymentDialogOpen(true);
  };

  const allSelected = orders.length > 0 && selected.length === orders.length;
  const toggleSelectAll = () => {
    if (allSelected) setSelected([]);
    else setSelected(orders.map(o => o.id));
  };
  const toggleSelect = (id: string) => {
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;

    try {
      const result = await api.bulkDeleteOrders(selected);
      if (result.success) {
        toast.success(`Successfully deleted ${result.data?.deletedCount || selected.length} order(s)`);
        setSelected([]);
        setBulkAction(null);
        // Refresh the orders list
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(result.error || 'Failed to delete orders');
      }
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast.error(error.message || 'Failed to delete orders');
    }
  };

  const handleBulkExport = () => {
    const selectedOrders = orders.filter(o => selected.includes(o.id));
    const wb = ordersToExcel(selectedOrders);
    const fileName = `orders-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setBulkAction(null);
    setSelected([]);
  };

  const handleExportAll = () => {
    const wb = ordersToExcel(orders);
    const fileName = `all-orders-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Sales Rep</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium text-muted-foreground">No orders found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by creating your first order.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        {/* Table Header with Export Buttons */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border-b bg-muted/30">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : `Showing ${orders.length} of ${totalOrders || orders.length} orders`}
            </div>
            {selected.length > 0 && (
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                <span className="text-sm font-medium">{selected.length} selected</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {selected.length > 0 && (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setBulkAction('delete'); setConfirmOpen(true); }}
                  className="h-8 flex-1 md:flex-none"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="whitespace-nowrap">Delete Selected</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkExport}
                  className="h-8 flex-1 md:flex-none"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  <span className="whitespace-nowrap">Export Selected</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected([])}
                  className="h-8 flex-1 md:flex-none"
                >
                  <span className="whitespace-nowrap">Clear</span>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onEmailReport}
              className="h-8 flex-1 md:flex-none"
            >
              <Mail className="h-4 w-4 mr-2" />
              <span className="whitespace-nowrap">Email Report</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportAll || handleExportAll}
              className="h-8 flex-1 md:flex-none"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              <span className="whitespace-nowrap">Export All</span>
            </Button>
          </div>
        </div>

        <Table className="min-w-[800px] sm:min-w-[900px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Sales Rep</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(order.id)}
                    onCheckedChange={() => toggleSelect(order.id)}
                  />
                </TableCell>
                <TableCell
                  className="font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    // Open Edit Order dialog instead of read-only details
                    onEdit?.(order);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">#{order.orderNumber}</span>
                    {order.notes && Array.isArray(order.notes) && order.notes.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {order.notes[0].note.length > 30
                          ? `${order.notes[0].note.substring(0, 30)}...`
                          : order.notes[0].note}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    if (order.customer) {
                      setSelectedOrder(order);
                      setCustomerDetailsOpen(true);
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {order.customer?.firstName?.[0]}{order.customer?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate max-w-[100px] sm:max-w-[120px] lg:max-w-[140px]">
                        {order.customer ?
                          `${order.customer.firstName} ${order.customer.lastName}` :
                          'Guest'
                        }
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[140px] lg:max-w-[180px]">
                        {order.customer?.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {order.customer?.salesAssignments?.[0]?.salesRep?.user ? (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {`${order.customer.salesAssignments[0].salesRep.user.firstName} ${order.customer.salesAssignments[0].salesRep.user.lastName}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {order.customer.salesAssignments[0].salesRep.user.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedOrder(order);
                    setStatusHistoryOpen(true);
                  }}
                >
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPaymentStatusColor(
                    order.payments && order.payments.length > 0
                      ? order.payments[0].status
                      : 'PENDING'
                  )}>
                    {order.payments && order.payments.length > 0
                      ? order.payments[0].status
                      : 'PENDING'}
                  </Badge>
                </TableCell>

                <TableCell
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedOrder(order);
                    setOrderItemsOpen(true);
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{order.items?.length || 0}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(order.totalAmount)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">
                      {order.salesChannel?.companyName || 'Centre Labs'}
                    </span>
                    {order.partnerOrderId && (
                      <span className="text-[10px] text-muted-foreground">
                        ID: {order.partnerOrderId}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy') : 'Unknown'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 px-2">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none min-w-[100px]"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none min-w-[100px]"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={selectedOrderForPayment}
        onSuccess={() => {
          onRefresh?.();
        }}
      />

      {/* Dialog Components */}
      {selectedOrder && (
        <>
          <OrderDetailsDialog
            order={selectedOrder}
            open={orderDetailsOpen}
            onClose={() => setOrderDetailsOpen(false)}
          />

          <CustomerDetailsDialog
            customer={selectedOrder.customer}
            open={customerDetailsOpen}
            onClose={() => setCustomerDetailsOpen(false)}
          />

          <StatusHistoryDialog
            order={selectedOrder}
            open={statusHistoryOpen}
            onClose={() => setStatusHistoryOpen(false)}
          />



          <OrderItemsDialog
            order={selectedOrder}
            open={orderItemsOpen}
            onClose={() => setOrderItemsOpen(false)}
          />
        </>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selected.length} selected order{selected.length === 1 ? '' : 's'}?
              This action cannot be undone. Orders that have been delivered or have payments cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selected.length} Order{selected.length === 1 ? '' : 's'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}