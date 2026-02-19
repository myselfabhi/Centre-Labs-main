'use client';

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ProtectedRoute } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { TaxRateDialog } from "@/components/settings/tax-rate-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function TaxesSettingsPage() {
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [taxLoading, setTaxLoading] = useState(false);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState<string | null>(null);

  const fetchTaxRates = async () => {
    setTaxLoading(true);
    try {
      const res = await api.get("/tax-rates");
      if (res.success) setTaxRates(res.data);
      else toast.error("Failed to load tax rates");
    } catch (e) {
      toast.error("Failed to load tax rates");
    } finally {
      setTaxLoading(false);
    }
  };
  useEffect(() => { fetchTaxRates(); }, []);

  const handleAddTax = () => { setEditingTax(null); setShowTaxDialog(true); };
  const handleEditTax = (tax: any) => { setEditingTax(tax); setShowTaxDialog(true); };
  const handleDeleteTax = async (id: string) => {
    setTaxToDelete(id);
    setDeleteDialogOpen(true);
  };
  const confirmDeleteTax = async () => {
    if (!taxToDelete) return;
    try {
      await api.delete(`/tax-rates/${taxToDelete}`);
      toast.success("Tax rate deleted");
      fetchTaxRates();
    } catch (e) {
      toast.error("Failed to delete tax rate");
    } finally {
      setDeleteDialogOpen(false);
      setTaxToDelete(null);
    }
  };
  const cancelDeleteTax = () => {
    setDeleteDialogOpen(false);
    setTaxToDelete(null);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Tax Settings</h1>
              <p className="text-muted-foreground">Configure tax rates and rules for your store</p>
            </div>
            <Button>Save Changes</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tax Configuration</CardTitle>
              <CardDescription>Configure tax rates and rules for your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable taxes</Label>
                  <p className="text-sm text-muted-foreground">Charge taxes on orders</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Prices include tax</Label>
                  <p className="text-sm text-muted-foreground">Display prices with tax included</p>
                </div>
                <Switch />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tax-calculation">Tax calculation method</Label>
                <Select defaultValue="destination">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="destination">Based on shipping address</SelectItem>
                    <SelectItem value="origin">Based on store address</SelectItem>
                    <SelectItem value="billing">Based on billing address</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Rate (%)</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxLoading ? (
                    <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
                  ) : taxRates.length === 0 ? (
                    <TableRow><TableCell colSpan={6}>No tax rates found.</TableCell></TableRow>
                  ) : taxRates.filter((tax: any) => tax.isActive).length === 0 ? (
                    <TableRow><TableCell colSpan={6}>No active tax rates found.</TableCell></TableRow>
                  ) : taxRates.filter((tax: any) => tax.isActive).map((tax: any) => (
                    <TableRow key={tax.id}>
                      <TableCell>{tax.country}</TableCell>
                      <TableCell>{tax.state || '-'}</TableCell>
                      <TableCell>{tax.rate}</TableCell>
                      <TableCell>{tax.type}</TableCell>
                      <TableCell>{tax.isActive ? 'Active' : 'Inactive'}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEditTax(tax)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteTax(tax.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button className="mt-4" onClick={handleAddTax}><Plus className="h-4 w-4 mr-2" />Add Tax Rate</Button>
            </CardContent>
          </Card>
          {showTaxDialog && (
            <TaxRateDialog
              open={showTaxDialog}
              onClose={() => setShowTaxDialog(false)}
              onSuccess={() => { setShowTaxDialog(false); fetchTaxRates(); }}
              tax={editingTax}
            />
          )}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Tax Rate</DialogTitle>
              </DialogHeader>
              <div>Are you sure you want to delete this tax rate? This action cannot be undone.</div>
              <DialogFooter>
                <Button variant="outline" onClick={cancelDeleteTax}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDeleteTax}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
} 