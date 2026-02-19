"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ProtectedRoute } from "@/contexts/auth-context";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function SalesChannelsPage() {
    const router = useRouter();
    const [channels, setChannels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchChannels = async () => {
        setLoading(true);
        try {
            const res = await api.get("/sales-channels");
            if (res.success) {
                setChannels(res.data);
            } else {
                toast.error("Failed to load sales channels");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load sales channels");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChannels();
    }, []);

    const getStatusBadge = (status: string) => {
        if (status === "ACTIVE") {
            return (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    Active
                </Badge>
            );
        }
        return <Badge variant="secondary">Paused</Badge>;
    };

    const getTypeLabel = (type: string) => {
        // Map backend enums to UI labels if needed, or just capitalize
        if (type === "OWN") return "Own Ecommerce";
        if (type === "PARTNER") return "Channel Partner";
        return type;
    };

    const getFulfillmentLabel = (model: string) => {
        if (model === "OWN_ECOMMERCE") return "Own Ecommerce";
        if (model === "DROPSHIP") return "Dropship";
        return model;
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click navigation
        setSelectedChannelId(id);
        setConfirmDeleteOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedChannelId) return;

        try {
            setIsDeleting(true);
            toast.loading("Deleting channel...");
            const res = await api.delete(`/sales-channels/${selectedChannelId}`);
            if (res.success) {
                toast.success("Channel deleted successfully");
                fetchChannels();
            } else {
                toast.error(res.error || "Failed to delete channel");
            }
        } catch (e: any) {
            toast.error("Error: " + e.message);
        } finally {
            setIsDeleting(false);
            setConfirmDeleteOpen(false);
            setSelectedChannelId(null);
        }
    };

    return (
        <ProtectedRoute requiredPermissions={[{ module: 'settings', action: 'READ' }]}>
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Sales Channels</h1>
                            <p className="text-muted-foreground">
                                Manage external sales channels and partners.
                            </p>
                        </div>
                        <Button onClick={() => router.push("/settings/sales-channels/new")}>
                            <Plus className="mr-2 h-4 w-4" /> Add Channel
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Active Channels</CardTitle>
                            <CardDescription>
                                List of all connected sales channels and their current status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company Name</TableHead>
                                        <TableHead>Channel Type</TableHead>
                                        <TableHead>Contact Info</TableHead>
                                        <TableHead>Fulfillment</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Manage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                                    <span className="text-muted-foreground">Loading channels...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : channels.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                No channels found. Click "Add Channel" to create your first partner connection.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        channels.map((channel) => (
                                            <TableRow
                                                key={channel.id}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => router.push(`/settings/sales-channels/${channel.id}`)}
                                            >
                                                <TableCell className="font-medium">
                                                    {channel.companyName}
                                                    {channel.isDefault && <Badge variant="outline" className="ml-2 text-[10px]">Default</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal">
                                                        {getTypeLabel(channel.type)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-sm">
                                                        <span className="font-medium">{channel.contactPerson}</span>
                                                        <span className="text-xs text-muted-foreground">{channel.contactNumber}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {getFulfillmentLabel(channel.fulfillmentModel)}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(channel.status)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/settings/sales-channels/${channel.id}`);
                                                            }}
                                                        >
                                                            <Settings className="h-4 w-4 mr-2" />
                                                            Configure
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={(e) => handleDeleteClick(channel.id, e)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationDialog
                    open={confirmDeleteOpen}
                    onOpenChange={setConfirmDeleteOpen}
                    onConfirm={handleConfirmDelete}
                    title="Delete Sales Channel"
                    description="Are you sure you want to delete this sales channel? This will remove all associated pricing but keep existing orders. This action cannot be undone."
                    confirmText="Delete Channel"
                    cancelText="Cancel"
                    variant="destructive"
                    isLoading={isDeleting}
                />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
