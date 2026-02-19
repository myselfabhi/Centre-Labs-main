"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Settings,
    Store,
    CreditCard,
    Truck,
    Users,
    Bell,
    Shield,
    Mail,
    Globe,
    Download,
    Upload,
    Save,
    Plus,
    Edit,
    Trash2
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { TaxRateDialog } from "./tax-rate-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Country, State, City } from 'country-state-city';

export function SettingsContent() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("general");
    // Tax rates state
    const [taxRates, setTaxRates] = useState<any[]>([]);
    const [taxLoading, setTaxLoading] = useState(false);
    const [showTaxDialog, setShowTaxDialog] = useState(false);
    const [editingTax, setEditingTax] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [taxToDelete, setTaxToDelete] = useState<string | null>(null);

    // Add state and effect to fetch email templates
    const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<any>(null);

    // Store information state
    const [storeInfo, setStoreInfo] = useState<any>(null);
    const [storeLoading, setStoreLoading] = useState(false);
    const [storeSaving, setStoreSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);

    // Country/State/City selections for Store Address
    const [storeCountry, setStoreCountry] = useState('US');
    const [storeState, setStoreState] = useState('');
    const [storeCity, setStoreCity] = useState('');

    // Country/State/City data
    const countries = Country.getAllCountries();
    const storeStates = storeCountry ? State.getStatesOfCountry(storeCountry) : [];
    const storeCities = storeCountry && storeState ? City.getCitiesOfState(storeCountry, storeState) : [];

    // Fetch tax rates from backend
    const fetchTaxRates = async () => {
        setTaxLoading(true);
        try {
            const res = await api.get("/tax-rates");
            console.log("[Settings] /tax-rates response:", res);
            if (res.success) setTaxRates(res.data);
            else {
                toast.error("Failed to load tax rates");
                console.error("[Settings] Failed to load tax rates:", res.error);
            }
        } catch (e) {
            toast.error("Failed to load tax rates");
            console.error("[Settings] Exception while loading tax rates:", e);
        } finally {
            setTaxLoading(false);
        }
    };

    const fetchEmailTemplates = async () => {
        setTemplatesLoading(true);
        try {
            const res = await api.get("/email-templates");
            if (res.success) setEmailTemplates(res.data || []);
            else setEmailTemplates([]);
        } catch (e) {
            setEmailTemplates([]);
        } finally {
            setTemplatesLoading(false);
        }
    };

    // Fetch store information
    const fetchStoreInfo = async () => {
        setStoreLoading(true);
        try {
            const res = await api.get("/settings/store/info");
            if (res.success) {
                setStoreInfo(res.data);

                // Initialize country/state/city selections
                if (res.data.country) {
                    setStoreCountry(res.data.country);
                }
                if (res.data.state) {
                    setStoreState(res.data.state);
                }
                if (res.data.city) {
                    setStoreCity(res.data.city);
                }
            } else {
                toast.error("Failed to load store information");
            }
        } catch (e) {
            toast.error("Failed to load store information");
            console.error("Error fetching store info:", e);
        } finally {
            setStoreLoading(false);
        }
    };

    // Save store information
    const saveStoreInfo = async (data: any) => {
        setStoreSaving(true);
        try {
            // Include country/state/city selections in the data
            const dataWithSelections = {
                ...data,
                country: storeCountry,
                state: storeState,
                city: storeCity,
            };

            const res = await api.put("/settings/store/info", dataWithSelections);
            if (res.success) {
                setStoreInfo(res.data);
                toast.success("Store information updated successfully");
            } else {
                toast.error(res.error || "Failed to update store information");
            }
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Failed to update store information");
            console.error("Error saving store info:", e);
        } finally {
            setStoreSaving(false);
        }
    };

    // Upload logo
    const uploadLogo = async (file: File) => {
        setLogoUploading(true);
        try {
            // Validate file size (2MB max)
            if (file.size > 2 * 1024 * 1024) {
                toast.error("File size must be less than 2MB");
                setLogoUploading(false);
                return;
            }

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                toast.error("Only JPG, PNG, SVG, and WebP images are allowed");
                setLogoUploading(false);
                return;
            }

            // Create FormData and upload file
            const formData = new FormData();
            formData.append('logo', file);

            console.log('[Settings] Uploading logo file:', { name: file.name, size: file.size, type: file.type });

            const res = await api.postFormData("/settings/store/logo/upload", formData);
            if (res.success) {
                setStoreInfo(res.data);
                toast.success("Logo uploaded successfully");
                console.log('[Settings] Logo uploaded successfully:', res.data.logoUrl);
            } else {
                toast.error(res.error || "Failed to update logo");
            }
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Failed to update logo");
            console.error("Error uploading logo:", e);
        } finally {
            setLogoUploading(false);
        }
    };

    useEffect(() => {
        fetchTaxRates();
        fetchEmailTemplates();
        fetchStoreInfo();
    }, []);

    useEffect(() => { fetchEmailTemplates(); }, []);

    // Add/Edit/Delete handlers
    const handleAddTax = () => { setEditingTax(null); setShowTaxDialog(true); };
    const handleEditTax = (tax: any) => { setEditingTax(tax); setShowTaxDialog(true); };

    // Email template handlers
    const handleAddEmailTemplate = () => {
        console.log("Navigate to email templates page");
        router.push("/settings/email-templates");
    };
    const handleEditEmailTemplate = (template: any) => {
        console.log("Navigate to email templates page with template:", template);
        router.push(`/settings/email-templates/${template.type}/edit`);
    };

    const handleDeleteEmailTemplate = (template: any) => {
        setTemplateToDelete(template);
        setDeleteTemplateDialogOpen(true);
    };

    const confirmDeleteTemplate = async () => {
        if (!templateToDelete) return;

        try {
            const response = await api.delete(`/email-templates/${templateToDelete.id}`);
            if (response.success) {
                toast.success("Email template deleted successfully");
                fetchEmailTemplates(); // Refresh the list
            } else {
                toast.error(response.error || "Failed to delete email template");
            }
        } catch (error: any) {
            console.error("Error deleting template:", error);
            if (error.response?.data?.error === 'Validation failed' && error.response?.data?.details) {
                const errorMessages = error.response.data.details.map((detail: any) => `${detail.field}: ${detail.message}`).join(', ');
                toast.error(`Validation failed: ${errorMessages}`);
            } else {
                toast.error(error.response?.data?.error || "Failed to delete email template");
            }
        } finally {
            setDeleteTemplateDialogOpen(false);
            setTemplateToDelete(null);
        }
    };

    const cancelDeleteTemplate = () => {
        setDeleteTemplateDialogOpen(false);
        setTemplateToDelete(null);
    };
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your store configuration and preferences
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {/* <Button variant="outline" className="w-full sm:w-auto">
                        <Download className="h-4 w-4 mr-2" />
                        Export Settings
                    </Button> */}
                    <Button className="w-full sm:w-auto">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Settings Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="w-full overflow-x-auto">
                    <TabsList className="w-max min-w-full h-auto p-1 flex gap-2 sm:gap-3 md:gap-4 bg-muted rounded-lg sm:justify-between">
                        <TabsTrigger value="general" className="flex-shrink-0 text-xs sm:text-sm md:text-base whitespace-nowrap px-3 sm:px-4 md:px-5 py-2 sm:flex-1">General</TabsTrigger>
                        {/* <TabsTrigger value="payments" className="flex-shrink-0 text-xs sm:text-sm md:text-base whitespace-nowrap px-3 sm:px-4 md:px-5 py-2 sm:flex-1">Payments</TabsTrigger> */}
                        {/* <TabsTrigger value="shipping" className="flex-shrink-0 text-xs sm:text-sm md:text-base whitespace-nowrap px-3 sm:px-4 md:px-5 py-2 sm:flex-1">Shipping</TabsTrigger> */}
                        <TabsTrigger value="taxes" className="flex-shrink-0 text-xs sm:text-sm md:text-base whitespace-nowrap px-3 sm:px-4 md:px-5 py-2 sm:flex-1">Taxes</TabsTrigger>
                        <TabsTrigger value="notifications" className="flex-shrink-0 text-xs sm:text-sm md:text-base whitespace-nowrap px-3 sm:px-4 md:px-5 py-2 sm:flex-1">Notifications</TabsTrigger>
                        {/* <TabsTrigger value="users" className="flex-shrink-0 text-xs sm:text-sm md:text-base whitespace-nowrap px-3 sm:px-4 md:px-5 py-2 sm:flex-1">Users</TabsTrigger> */}
                    </TabsList>
                </div>

                {/* General Settings */}
                <TabsContent value="general" className="space-y-6">
                    {storeLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-muted-foreground">Loading store information...</div>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-6 md:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Store className="h-5 w-5" />
                                            Store Information
                                        </CardTitle>
                                        <CardDescription>
                                            Basic information about your store
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="store-name">Store Name</Label>
                                            <Input
                                                id="store-name"
                                                type="text"
                                                value={storeInfo?.name || ''}
                                                onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="store-description">Description</Label>
                                            <Textarea
                                                id="store-description"
                                                value={storeInfo?.description || ''}
                                                onChange={(e) => setStoreInfo({ ...storeInfo, description: e.target.value })}
                                                rows={3}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="store-email">Contact Email</Label>
                                            <Input
                                                id="store-email"
                                                type="email"
                                                value={storeInfo?.email || ''}
                                                onChange={(e) => setStoreInfo({ ...storeInfo, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="store-phone">Phone Number</Label>
                                            <Input
                                                id="store-phone"
                                                type="text"
                                                value={storeInfo?.phone || ''}
                                                onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                                                placeholder="Enter phone number"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Globe className="h-5 w-5" />
                                            Store Address
                                        </CardTitle>
                                        <CardDescription>
                                            Your business address and location
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="address-line1">Address Line 1</Label>
                                            <Input
                                                id="address-line1"
                                                type="text"
                                                value={storeInfo?.addressLine1 || ''}
                                                onChange={(e) => setStoreInfo({ ...storeInfo, addressLine1: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="address-line2">Address Line 2</Label>
                                            <Input
                                                id="address-line2"
                                                type="text"
                                                value={storeInfo?.addressLine2 || ''}
                                                onChange={(e) => setStoreInfo({ ...storeInfo, addressLine2: e.target.value })}
                                                placeholder="Suite, apartment, etc."
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="country">Country</Label>
                                                <Select
                                                    value={storeCountry}
                                                    onValueChange={(value) => {
                                                        setStoreCountry(value);
                                                        setStoreState('');
                                                        setStoreCity('');
                                                        setStoreInfo({ ...storeInfo, country: value, state: '', city: '' });
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-60">
                                                        {countries.map((country) => (
                                                            <SelectItem key={country.isoCode} value={country.isoCode}>
                                                                {country.flag} {country.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="state">State</Label>
                                                <Select
                                                    value={storeState}
                                                    onValueChange={(value) => {
                                                        setStoreState(value);
                                                        setStoreCity('');
                                                        const state = storeStates.find(s => s.isoCode === value);
                                                        setStoreInfo({ ...storeInfo, state: state?.name || value, city: '' });
                                                    }}
                                                    disabled={storeStates.length === 0}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={storeStates.length === 0 ? "Select country first" : "Select state"} />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-60">
                                                        {storeStates.map((state) => (
                                                            <SelectItem key={state.isoCode} value={state.isoCode}>
                                                                {state.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="city">City</Label>
                                                <Select
                                                    value={storeCity}
                                                    onValueChange={(value) => {
                                                        setStoreCity(value);
                                                        setStoreInfo({ ...storeInfo, city: value });
                                                    }}
                                                    disabled={storeCities.length === 0}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={storeCities.length === 0 ? "Select state first" : "Select city"} />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-60">
                                                        {storeCities.map((city) => (
                                                            <SelectItem key={city.name} value={city.name}>
                                                                {city.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="zip">ZIP Code</Label>
                                            <Input
                                                id="zip"
                                                type="text"
                                                value={storeInfo?.postalCode || ''}
                                                onChange={(e) => setStoreInfo({ ...storeInfo, postalCode: e.target.value })}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Store Logo</CardTitle>
                                    <CardDescription>
                                        Upload your store logo (recommended size: 200x200px)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-20 w-20">
                                            <AvatarImage src="/logo.png" alt="Store Logo" />
                                            <AvatarFallback>CR</AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-2">
                                            <input
                                                type="file"
                                                id="logo-upload"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        uploadLogo(file);
                                                    }
                                                }}
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => document.getElementById('logo-upload')?.click()}
                                                disabled={logoUploading}
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                {logoUploading ? 'Uploading...' : 'Upload New Logo'}
                                            </Button>
                                            <p className="text-sm text-muted-foreground">
                                                JPG, PNG, or SVG. Max file size 2MB.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Sales Channels Card */}
                            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={() => router.push('/settings/sales-channels')}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe className="h-5 w-5" />
                                        Sales Channels
                                    </CardTitle>
                                    <CardDescription>
                                        Manage channel partners, pricing, and integrations (Odoo sync)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="outline" className="w-full">
                                        Manage Sales Channels
                                    </Button>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end">
                                <Button
                                    onClick={() => saveStoreInfo(storeInfo)}
                                    disabled={storeSaving}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {storeSaving ? 'Saving...' : 'Save Store Information'}
                                </Button>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Payment Settings */}
                <TabsContent value="payments" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Payment Gateways
                            </CardTitle>
                            <CardDescription>
                                Configure payment methods for your store
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">S</span>
                                        </div>
                                        <div>
                                            <h4 className="font-medium">Stripe</h4>
                                            <p className="text-sm text-muted-foreground">Accept credit cards and digital payments</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default">Active</Badge>
                                        <Switch defaultChecked />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-6 bg-blue-500 rounded flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">PP</span>
                                        </div>
                                        <div>
                                            <h4 className="font-medium">PayPal</h4>
                                            <p className="text-sm text-muted-foreground">PayPal payments and digital wallet</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">Inactive</Badge>
                                        <Switch />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-6 bg-green-600 rounded flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">$</span>
                                        </div>
                                        <div>
                                            <h4 className="font-medium">Bank Transfer</h4>
                                            <p className="text-sm text-muted-foreground">Direct bank transfer for large orders</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default">Active</Badge>
                                        <Switch defaultChecked />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Stripe Configuration</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="stripe-public">Publishable Key</Label>
                                    <Input id="stripe-public" placeholder="pk_test_..." type="password" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="stripe-secret">Secret Key</Label>
                                    <Input id="stripe-secret" placeholder="sk_test_..." type="password" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="stripe-webhook">Webhook Endpoint</Label>
                                    <Input id="stripe-webhook" placeholder="whsec_..." type="password" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Payment Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="currency">Default Currency</Label>
                                    <Select defaultValue="USD">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Capture payments immediately</Label>
                                        <p className="text-sm text-muted-foreground">Charge customers when order is placed</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Enable test mode</Label>
                                        <p className="text-sm text-muted-foreground">Use test API keys for development</p>
                                    </div>
                                    <Switch />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Shipping Settings */}
                <TabsContent value="shipping" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                Shipping Zones
                            </CardTitle>
                            <CardDescription>
                                Configure shipping rates for different regions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <h4 className="font-medium">United States</h4>
                                        <p className="text-sm text-muted-foreground">Free shipping over $100</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm">
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <h4 className="font-medium">Canada</h4>
                                        <p className="text-sm text-muted-foreground">$15.00 flat rate</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm">
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Shipping Zone
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Shipping Options</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Enable real-time rates</Label>
                                        <p className="text-sm text-muted-foreground">Calculate shipping costs from carriers</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Require signature</Label>
                                        <p className="text-sm text-muted-foreground">For orders over certain amount</p>
                                    </div>
                                    <Switch />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="signature-threshold">Signature threshold</Label>
                                    <Input id="signature-threshold" placeholder="$500.00" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Package Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="default-weight">Default Package Weight (lbs)</Label>
                                    <Input id="default-weight" defaultValue="1.0" />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="package-length">Length (in)</Label>
                                        <Input id="package-length" defaultValue="10" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="package-width">Width (in)</Label>
                                        <Input id="package-width" defaultValue="8" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="package-height">Height (in)</Label>
                                        <Input id="package-height" defaultValue="6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Tax Settings */}
                <TabsContent value="taxes" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tax Configuration</CardTitle>
                            <CardDescription>
                                Configure tax rates and rules for your store
                            </CardDescription>
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

                    {/* Tax Rates Table */}
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
                    {/* Tax Rate Dialog (Add/Edit) */}
                    {showTaxDialog && (
                        <TaxRateDialog
                            open={showTaxDialog}
                            onClose={() => setShowTaxDialog(false)}
                            onSuccess={() => { setShowTaxDialog(false); fetchTaxRates(); }}
                            tax={editingTax}
                        />
                    )}


                </TabsContent>

                {/* Notification Settings */}
                <TabsContent value="notifications" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Email Notifications
                            </CardTitle>
                            <CardDescription>
                                Configure when to send email notifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Order confirmations</Label>
                                    <p className="text-sm text-muted-foreground">Send when order is placed</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Shipping notifications</Label>
                                    <p className="text-sm text-muted-foreground">Send when order ships</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Low stock alerts</Label>
                                    <p className="text-sm text-muted-foreground">Send when inventory is low</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>New customer welcome</Label>
                                    <p className="text-sm text-muted-foreground">Send welcome email to new customers</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                Email Templates
                                <Button onClick={handleAddEmailTemplate} size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Manage Templates
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {templatesLoading ? (
                                <div className="text-center py-4">
                                    <p className="text-muted-foreground">Loading templates...</p>
                                </div>
                            ) : emailTemplates.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground mb-4">No email templates configured</p>
                                    <Button onClick={handleAddEmailTemplate} variant="outline">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create First Template
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {emailTemplates.map((template) => (
                                        <div key={template.id} className="p-3 border rounded-lg hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-sm">{template.name}</h4>
                                                    <Badge variant={template.isActive ? "default" : "secondary"} className="text-xs">
                                                        {template.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">{template.subject}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditEmailTemplate(template)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteEmailTemplate(template)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* User Management */}
                <TabsContent value="users" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Team Members
                            </CardTitle>
                            <CardDescription>
                                Manage admin users and their permissions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Last Active</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>AD</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">Admin User</div>
                                                    <div className="text-sm text-muted-foreground">admin@centreresearch.com</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="default">Super Admin</Badge>
                                        </TableCell>
                                        <TableCell>2 minutes ago</TableCell>
                                        <TableCell>
                                            <Badge variant="default">Active</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm">Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>JD</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">John Doe</div>
                                                    <div className="text-sm text-muted-foreground">john@centreresearch.com</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">Staff</Badge>
                                        </TableCell>
                                        <TableCell>1 hour ago</TableCell>
                                        <TableCell>
                                            <Badge variant="default">Active</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm">Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                            <Button variant="outline" className="w-full mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Invite Team Member
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Roles & Permissions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <h4 className="font-medium">Super Admin</h4>
                                        <p className="text-sm text-muted-foreground">Full access to all features</p>
                                    </div>
                                    <Button variant="outline" size="sm">Edit Permissions</Button>
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <h4 className="font-medium">Staff</h4>
                                        <p className="text-sm text-muted-foreground">Limited access to orders and products</p>
                                    </div>
                                    <Button variant="outline" size="sm">Edit Permissions</Button>
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <h4 className="font-medium">Read Only</h4>
                                        <p className="text-sm text-muted-foreground">View-only access to dashboard</p>
                                    </div>
                                    <Button variant="outline" size="sm">Edit Permissions</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            {/* Delete Confirmation Dialog */}
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

            {/* Delete Template Confirmation Dialog */}
            <Dialog open={deleteTemplateDialogOpen} onOpenChange={setDeleteTemplateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Email Template</DialogTitle>
                    </DialogHeader>
                    <div>
                        Are you sure you want to delete the email template "{templateToDelete?.name}"?
                        This action cannot be undone and may affect email functionality.
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelDeleteTemplate}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteTemplate}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
