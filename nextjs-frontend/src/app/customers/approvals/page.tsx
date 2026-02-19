"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ProtectedRoute } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, User, Mail, Phone, Calendar, Search, Building, Crown, MoreHorizontal, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { Pagination } from '@/components/ui/pagination';

interface PendingCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  city?: string;
  zip?: string;
  customerType: 'B2C' | 'B2B' | 'ENTERPRISE_1' | 'ENTERPRISE_2';
  createdAt: string;
  isActive: boolean;
  isApproved: boolean;
  emailVerified?: boolean;
}

export default function CustomerApprovalsPage() {
  const [pendingCustomers, setPendingCustomers] = useState<PendingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedCustomer, setSelectedCustomer] = useState<PendingCustomer | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const fetchPendingCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm || undefined,
      };

      if (statusFilter === 'pending') {
        params.approvalStatus = 'PENDING';
      } else if (statusFilter === 'approved') {
        params.approvalStatus = 'APPROVED';
      } else if (statusFilter === 'rejected') {
        params.approvalStatus = 'DEACTIVATED';
      }

      const response = await api.getCustomers(params);

      if (response && response.success && response.data) {
        setPendingCustomers(response.data.customers || []);
        setTotalItems(response.data.pagination.total);
        setTotalPages(response.data.pagination.pages);

        // Update stats from the backend response
        if (response.data.stats) {
          setStats({
            pending: response.data.stats.pending || 0,
            approved: response.data.stats.approved || 0,
            rejected: response.data.stats.rejected || 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCustomers();
  }, [statusFilter, currentPage, searchTerm]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  // Removed fetchAllCustomers as stats are now fetched with main list

  const handleApproval = async (customerId: string, approved: boolean) => {
    try {
      console.log('Starting approval process:', { customerId, approved });
      setProcessing(customerId);

      const updateData = {
        isApproved: approved,
        isActive: approved, // Also activate the account if approved
      };

      console.log('Sending update data:', updateData);

      const response = await api.updateCustomer(customerId, updateData);

      console.log('API response:', response);

      if (response.success) {
        toast.success(
          approved
            ? 'Customer account approved successfully'
            : 'Customer account rejected successfully'
        );

        console.log('Approval successful, refreshing data...');

        // Optimistically update dialog state to reflect new status immediately
        setSelectedCustomer((prev) => prev && prev.id === customerId
          ? { ...prev, isApproved: approved, isActive: approved }
          : prev
        );

        // Refresh the customer list
        await fetchPendingCustomers();

        // Close dialog if approved (it will disappear from pending list)
        if (approved) {
          setSelectedCustomer(null);
        }
      } else {
        console.error('API returned error:', response.error);
        toast.error(response.error || 'Operation failed');
      }
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      toast.error(error?.response?.data?.error || error?.message || 'Failed to update customer');
    } finally {
      setProcessing(null);
    }
  };

  const handleViewDetails = (customer: PendingCustomer) => {
    setSelectedCustomer(customer);
  };

  const getCustomerTypeBadge = (type: string) => {
    const variants: { [key: string]: { variant: "default" | "secondary" | "destructive" | "outline", label: string, icon: any } } = {
      B2C: { variant: "outline", label: "Wholesale", icon: Building },
      B2B: { variant: "secondary", label: "Wholesale", icon: Building },
      ENTERPRISE_1: { variant: "default", label: "Enterprise", icon: Crown },
      ENTERPRISE_2: { variant: "default", label: "Enterprise", icon: Crown },
    };

    const config = variants[type] || { variant: "outline", label: type, icon: User };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const filteredCustomers = pendingCustomers;

  // Calculate stats for pending, approved, and rejected
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // Removed loadStats effect as stats are now fetched with main list

  // Calculate customer type counts for filters
  const typeCounts = {
    total: pendingCustomers.length,
    b2c: pendingCustomers.filter(c => c.customerType === 'B2C').length,
    b2b: pendingCustomers.filter(c => c.customerType === 'B2B').length,
    e1: pendingCustomers.filter(c => c.customerType === 'ENTERPRISE_1').length,
    e2: pendingCustomers.filter(c => c.customerType === 'ENTERPRISE_2').length,
  };

  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'STAFF']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Customer Account Approvals</h1>
              <p className="text-muted-foreground">
                Review and approve pending customer account registrations
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">
                  Accounts waiting for review
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Accounts</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejected Accounts</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Approvals</CardTitle>
                <Badge variant="outline" className="h-4 px-2 text-xs">System</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalItems}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Search and filter pending approvals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or mobile..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals Table */}
          <Card>
            <CardHeader>
              <CardTitle>Approvals List</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1} to ${Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of ${totalItems} ${statusFilter} records`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">
                    {statusFilter === 'all' ? 'No Customers Found' :
                      statusFilter === 'approved' ? 'No Approved Accounts' :
                        statusFilter === 'rejected' ? 'No Rejected Accounts' : 'No Pending Approvals'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all'
                      ? "Try adjusting your search or filters"
                      : statusFilter === 'all' ? "No customer accounts found in the system." :
                        "All customer accounts have been reviewed and processed."}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage src={`/avatars/${customer.id}.jpg`} />
                                <AvatarFallback>
                                  {getInitials(customer.firstName, customer.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {[customer.firstName, customer.lastName].filter(Boolean).join(' ')}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {customer.id}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">{customer.email}</div>
                              <div className="text-sm text-muted-foreground">{customer.mobile}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(customer.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {customer.isApproved ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Approved
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {!customer.isApproved && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setSelectedCustomer(customer)}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Review & Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setSelectedCustomer(customer)}
                                      className="text-red-600"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Review & Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {customer.isApproved && (
                                  <DropdownMenuItem
                                    onClick={() => handleApproval(customer.id, false)}
                                    disabled={processing === customer.id}
                                    className="text-red-600"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Revoke Approval
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="py-4 border-t px-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Details Dialog */}
          <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Customer Details</DialogTitle>
                <DialogDescription>
                  Review customer information before making approval decision
                </DialogDescription>
              </DialogHeader>
              {selectedCustomer && (
                <div className="space-y-4">
                  {/** Local state to force Tier 2 (B2B) default in UI */}
                  {(() => {
                    // use a ref in closure to inject state without rerender loops
                    return null;
                  })()}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <p className="text-sm font-medium">{[selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{selectedCustomer.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-sm">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email Verification</label>
                      <div className="mt-1">
                        {selectedCustomer.emailVerified ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Verified</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Unverified</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Mobile</label>
                      <p className="text-sm">{selectedCustomer.mobile}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Customer Type</label>
                      {/* Bind to actual customer type and allow changing */}
                      <Select
                        value={selectedCustomer.customerType}
                        onValueChange={async (value) => {
                          try {
                            setProcessing(selectedCustomer.id);

                            const updateData = {
                              customerType: value as 'B2C' | 'B2B' | 'ENTERPRISE_1' | 'ENTERPRISE_2',
                            };

                            const response = await api.updateCustomer(selectedCustomer.id, updateData);

                            if (response.success) {
                              toast.success('Customer type updated successfully');

                              // Update the selected customer with new data
                              setSelectedCustomer({
                                ...selectedCustomer,
                                customerType: value as 'B2C' | 'B2B' | 'ENTERPRISE_1' | 'ENTERPRISE_2'
                              });

                              // Refresh the customer list
                              await fetchPendingCustomers();
                            } else {
                              toast.error(response.error || 'Failed to update customer type');
                            }
                          } catch (error: any) {
                            console.error('Failed to update customer type:', error);
                            toast.error(error?.response?.data?.error || error?.message || 'Failed to update customer type');
                          } finally {
                            setProcessing(null);
                          }
                        }}
                        disabled={processing === selectedCustomer.id}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select customer tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="B2C">Wholesale</SelectItem>
                          <SelectItem value="ENTERPRISE_1">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">
                        {selectedCustomer.isApproved ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending Approval
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Registration Date</label>
                      <p className="text-sm">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account Active</label>
                      <p className="text-sm">
                        {selectedCustomer.isActive ? (
                          <span className="text-green-600 font-medium">✓ Active</span>
                        ) : (
                          <span className="text-red-600 font-medium">✗ Inactive</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">City</label>
                      <p className="text-sm">{selectedCustomer.city || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">ZIP Code</label>
                      <p className="text-sm">{selectedCustomer.zip || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                      Close
                    </Button>
                    {!selectedCustomer.isApproved ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleApproval(selectedCustomer.id, false)}
                          disabled={processing === selectedCustomer.id}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleApproval(selectedCustomer.id, true)}
                          disabled={processing === selectedCustomer.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleApproval(selectedCustomer.id, false)}
                        disabled={processing === selectedCustomer.id}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Revoke Approval
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
