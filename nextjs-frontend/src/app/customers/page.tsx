'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ProtectedRoute } from '@/contexts/auth-context';
import { CustomersTable } from '@/components/customers/customers-table';
import { CreateCustomerDialog } from '@/components/customers/create-customer-dialog';
import { EditCustomerDialog } from '@/components/customers/edit-customer-dialog';
import { CustomerAddressDialog } from '@/components/customers/customer-address-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Users, UserCheck, UserX, Building, Crown, Mail } from 'lucide-react';
import { api, Customer } from '@/lib/api';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusStats, setStatusStats] = useState<{ active: number; inactive: number; pendingApproval?: number; b2c: number; b2b: number; e1: number; e2: number } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [addressCustomer, setAddressCustomer] = useState<Customer | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    customerId: string | null;
    customerName: string;
    isLoading: boolean;
  }>({
    open: false,
    customerId: null,
    customerName: '',
    isLoading: false,
  });

  const ITEMS_PER_PAGE = 10;

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Handle combined filter types
      let customerTypeParam: string | undefined;
      if (typeFilter === 'WHOLESALE') {
        // For wholesale, we'll fetch all and filter client-side
        customerTypeParam = undefined;
      } else if (typeFilter === 'ENTERPRISE') {
        // For enterprise, we'll fetch all and filter client-side
        customerTypeParam = undefined;
      } else if (typeFilter !== 'all') {
        customerTypeParam = typeFilter;
      }

      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm || undefined,
        customerType: customerTypeParam,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        isApproved: true,
      };

      const response = await api.getCustomers(params);

      if (response.success && response.data) {
        let list = (response.data.customers || [])
          .filter(c => c.isApproved);

        // Apply client-side filtering for combined types
        if (typeFilter === 'WHOLESALE') {
          list = list.filter(c => c.customerType === 'B2C' || c.customerType === 'B2B');
        } else if (typeFilter === 'ENTERPRISE') {
          list = list.filter(c => c.customerType === 'ENTERPRISE_1' || c.customerType === 'ENTERPRISE_2');
        } else if (typeFilter !== 'all') {
          list = list.filter(c => c.customerType === typeFilter);
        } else {
          // For 'all', show only the 4 main customer types
          list = list.filter(c => c.customerType === 'B2C' || c.customerType === 'B2B' || c.customerType === 'ENTERPRISE_1' || c.customerType === 'ENTERPRISE_2');
        }

        setCustomers(list);
        // Use backend totals and stats for accuracy across pagination
        const pagination = (response.data as any).pagination;
        setTotalCustomers(pagination?.total ?? list.length);
        setTotalPages(pagination?.pages ?? Math.ceil(list.length / ITEMS_PER_PAGE));
        const statsBlock: any = (response.data as any).stats;
        if (statsBlock) setStatusStats(statsBlock);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, searchTerm, typeFilter, statusFilter]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleCustomerCreated = () => {
    setShowCreateDialog(false);
    fetchCustomers();
    toast.success('Customer created successfully');
  };

  const handleCustomerUpdated = () => {
    setEditingCustomer(null);
    fetchCustomers();
    toast.success('Customer updated successfully');
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      // For deactivation, prefer setting isApproved=false which will map to DEACTIVATED and inactive
      const response = await api.updateCustomer(customerId, { isApproved: false });
      if (response.success) {
        fetchCustomers();
        toast.success('Customer deactivated successfully');
      }
    } catch (error) {
      console.error('Failed to deactivate customer:', error);
      toast.error('Failed to deactivate customer');
    }
  };

  const handleHardDeleteCustomer = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    setDeleteDialog({
      open: true,
      customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      isLoading: false,
    });
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteDialog.customerId) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await api.hardDeleteCustomer(deleteDialog.customerId);
      if (response.success) {
        fetchCustomers();
        toast.success('Customer permanently deleted successfully');
      } else {
        toast.error(response.error || 'Failed to delete customer');
      }
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error(error?.response?.data?.error || error?.message || 'Failed to delete customer');
    } finally {
      setDeleteDialog({
        open: false,
        customerId: null,
        customerName: '',
        isLoading: false,
      });
    }
  };

  const handleManageAddresses = (customer: Customer) => {
    setAddressCustomer(customer);
  };

  const handleAddressesUpdated = () => {
    setAddressCustomer(null);
    fetchCustomers();
    toast.success('Customer addresses updated successfully');
  };

  const exportRowsToExcel = (rows: Customer[]) => {
    const data = rows.map((c) => ({
      ID: c.id,
      'First Name': c.firstName,
      'Last Name': c.lastName,
      Email: c.email,
      Mobile: (c as any).mobile || '',
      Type: (c.customerType === 'B2C' || c.customerType === 'B2B') ? 'Wholesale' :
        (c.customerType === 'ENTERPRISE_1' || c.customerType === 'ENTERPRISE_2') ? 'Enterprise' :
          c.customerType,
      Active: c.isActive ? 'Yes' : 'No',
      Approved: c.isApproved ? 'Yes' : 'No',
      Created: new Date(c.createdAt as any).toLocaleString(),
      Orders: c._count?.orders || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    return wb;
  };

  const handleExportAll = async () => {
    let page = 1;
    const limit = 100;
    let pages = 1;
    const all: Customer[] = [];
    try {
      do {
        const res: any = await api.getCustomers({
          page,
          limit,
          search: searchTerm || undefined,
          customerType: typeFilter !== 'all' ? typeFilter : undefined,
          isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        });
        if (res?.success && res?.data) {
          all.push(...(res.data.customers || []));
          const pagination = res.data.pagination || {};
          pages = pagination.pages || 1;
        } else {
          break;
        }
        page += 1;
      } while (page <= pages);
    } catch (e) { }
    const wb = exportRowsToExcel(all);
    XLSX.writeFile(wb, `customers-all-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // const handleSendBlackFridayEmail = async () => {
  //   setSendingBlackFridayEmail(true);
  //   try {
  //     const response = await api.post('/black-friday/send', {});
  //     
  //     if (response.success) {
  //       toast.success('Black Friday emails sent successfully!');
  //     } else {
  //       toast.error(response.error || 'Failed to send Black Friday emails');
  //     }
  //   } catch (error: any) {
  //     console.error('Error sending Black Friday emails:', error);
  //     toast.error(error?.response?.data?.error || error?.message || 'Failed to send Black Friday emails');
  //   } finally {
  //     setSendingBlackFridayEmail(false);
  //   }
  // };

  // Calculate stats
  const stats = {
    total: totalCustomers,
    active: statusStats?.active ?? customers.filter(c => c.isActive).length,
    inactive: statusStats?.inactive ?? customers.filter(c => !c.isActive).length,
    pendingApproval: statusStats?.pendingApproval ?? 0,
    b2c: statusStats?.b2c ?? customers.filter(c => c.customerType === 'B2C').length,
    b2b: statusStats?.b2b ?? customers.filter(c => c.customerType === 'B2B').length,
    e1: statusStats?.e1 ?? customers.filter(c => c.customerType === 'ENTERPRISE_1').length,
    e2: statusStats?.e2 ?? customers.filter(c => c.customerType === 'ENTERPRISE_2').length,
  };

  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'STAFF', 'SALES_REP', 'SALES_MANAGER']}>
      <DashboardLayout>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Customers</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Manage customer database and relationships
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* <Button 
                onClick={handleSendBlackFridayEmail} 
                disabled={sendingBlackFridayEmail}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Mail className="mr-2 h-4 w-4" />
                {sendingBlackFridayEmail ? 'Sending...' : 'Send Black Friday Email'}
              </Button> */}
              <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>
          </div>

          {/* Stats Cards - split into two rows for better responsiveness */}
          <div className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
                  <UserCheck className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.active}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Inactive</CardTitle>
                  <UserX className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.inactive}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Pending Approval</CardTitle>
                  <Badge variant="secondary" className="h-4 px-2 text-xs">Pending</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{stats.pendingApproval}</div>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Wholesale</CardTitle>
                  <Building className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.b2c + stats.b2b}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Enterprise</CardTitle>
                  <Crown className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-amber-600">{stats.e1 + stats.e2}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Search and filter customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers by name, email, or mobile..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={handleTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={handleStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customers List</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `Showing ${customers.length} of ${totalCustomers} customers`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomersTable
                customers={customers}
                loading={loading}
                onEdit={setEditingCustomer}
                onDelete={handleDeleteCustomer}
                onHardDelete={handleHardDeleteCustomer}
                onManageAddresses={handleManageAddresses}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onExportAll={handleExportAll}
              />
            </CardContent>
          </Card>

          {/* Dialogs */}
          <CreateCustomerDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSuccess={handleCustomerCreated}
          />

          <EditCustomerDialog
            customer={editingCustomer}
            open={!!editingCustomer}
            onOpenChange={(open) => !open && setEditingCustomer(null)}
            onSuccess={handleCustomerUpdated}
          />

          <CustomerAddressDialog
            customer={addressCustomer}
            open={!!addressCustomer}
            onOpenChange={(open) => !open && setAddressCustomer(null)}
            onSuccess={handleAddressesUpdated}
          />

          <ConfirmationDialog
            open={deleteDialog.open}
            onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
            onConfirm={confirmDeleteCustomer}
            title="Delete Customer"
            description={`Are you sure you want to permanently delete ${deleteDialog.customerName}? This action cannot be undone and will remove all customer data including addresses, reviews, and favorites.`}
            confirmText="Delete Customer"
            cancelText="Cancel"
            variant="destructive"
            isLoading={deleteDialog.isLoading}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
