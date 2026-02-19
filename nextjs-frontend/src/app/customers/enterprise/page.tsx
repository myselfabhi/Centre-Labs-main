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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import { api, Customer } from '@/lib/api';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function EnterpriseCustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
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

            // Fetch both Enterprise 1 and Enterprise 2 customers
            const [ent1Response, ent2Response] = await Promise.all([
                api.getCustomers({
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    search: searchTerm || undefined,
                    customerType: 'ENTERPRISE_1',
                    isApproved: true,
                    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
                }),
                api.getCustomers({
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    search: searchTerm || undefined,
                    customerType: 'ENTERPRISE_2',
                    isApproved: true,
                    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
                })
            ]);

            // Combine results
            const allCustomers = [
                ...(ent1Response.success && ent1Response.data ? ent1Response.data.customers : []),
                ...(ent2Response.success && ent2Response.data ? ent2Response.data.customers : [])
            ];

            const totalEnt1 = ent1Response.success && ent1Response.data ? ent1Response.data.pagination.total : 0;
            const totalEnt2 = ent2Response.success && ent2Response.data ? ent2Response.data.pagination.total : 0;
            const combinedTotal = totalEnt1 + totalEnt2;

            setCustomers(allCustomers);
            setTotalCustomers(combinedTotal);
            setTotalPages(Math.ceil(combinedTotal / ITEMS_PER_PAGE));
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [currentPage, searchTerm, statusFilter]);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
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
            const response = await api.deleteCustomer(customerId);
            if (response.success) {
                fetchCustomers();
                toast.success('Customer deactivated successfully');
            }
        } catch (error) {
            console.error('Failed to delete customer:', error);
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
            Type: 'Enterprise',
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
        try {
            console.log('Starting export with filters:', { searchTerm, statusFilter });

            const [ent1Res, ent2Res] = await Promise.all([
                api.getCustomers({
                    page: 1,
                    limit: 10000,
                    search: searchTerm || undefined,
                    customerType: 'ENTERPRISE_1',
                    isApproved: true,
                    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
                }),
                api.getCustomers({
                    page: 1,
                    limit: 10000,
                    search: searchTerm || undefined,
                    customerType: 'ENTERPRISE_2',
                    isApproved: true,
                    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
                })
            ]);

            console.log('Enterprise 1 Response:', ent1Res);
            console.log('Enterprise 2 Response:', ent2Res);

            const allCustomers = [
                ...(ent1Res?.success && ent1Res?.data?.customers ? ent1Res.data.customers : []),
                ...(ent2Res?.success && ent2Res?.data?.customers ? ent2Res.data.customers : [])
            ];

            console.log('All customers for export:', allCustomers);
            console.log('Exporting customers count:', allCustomers.length);

            if (allCustomers.length === 0) {
                toast.error('No customers to export');
                return;
            }

            const wb = exportRowsToExcel(allCustomers);
            XLSX.writeFile(wb, `customers-enterprise-all-${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success(`Exported ${allCustomers.length} customers successfully`);
        } catch (e) {
            console.error('Export error:', e);
            toast.error('Failed to export customers');
        }
    };

    return (
        <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'STAFF', 'SALES_REP', 'SALES_MANAGER']}>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Enterprise Customers</h1>
                            <p className="text-muted-foreground">
                                Manage your Enterprise customers
                            </p>
                        </div>
                        <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Customer
                        </Button>
                    </div>

                    {/* Filters */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Filters</CardTitle>
                            <CardDescription>Search and filter enterprise customers</CardDescription>
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
                            <CardTitle>Enterprise Customers List</CardTitle>
                            <CardDescription>
                                {loading ? 'Loading...' : `Showing ${customers.length} of ${totalCustomers} enterprise customers`}
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
