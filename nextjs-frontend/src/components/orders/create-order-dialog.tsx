'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Trash2, Search, Package, User, CreditCard, ChevronDown, Check, Loader2 } from 'lucide-react';
import { api, Customer, Product, ProductVariant, Address, Promotion, TaxRate, getCustomCountries, getCustomStates, getCustomCities } from '@/lib/api';
import { toast } from 'sonner';
import { Country, State, City } from 'country-state-city';
import { cn } from '@/lib/utils';
interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DEFAULT_COUNTRY_CODE = "United States";

const sanitizePhone = (value: string) =>
  value.replace(/\D/g, "").slice(0, 10);

// Helper function to get customer type display name
const getCustomerTypeDisplayName = (customerType: string | undefined): string => {
  switch (customerType) {
    case 'B2C':
    case 'B2B':
      return 'Wholesale';
    case 'ENTERPRISE_1':
    case 'ENTERPRISE_2':
      return 'Enterprise';
    default:
      return 'Wholesale';
  }
};

interface OrderItem {
  variantId: string;
  variant?: ProductVariant & {
    product?: Product;
    inventory?: {
      id: string;
      locationId: string;
      quantity: number;
      reservedQty: number;
    }[];
    segmentPrices?: {
      id: string;
      customerType: 'B2C' | 'B2B' | 'ENTERPRISE_1' | 'ENTERPRISE_2' | 'WHOLESALE';
      regularPrice: number;
      salePrice?: number;
    }[];
    bulkPrices?: {
      id: string;
      minQty: number;
      maxQty?: number;
      price: number;
    }[];
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  bulkUnitPrice?: number;
  bulkTotalPrice?: number;
}

export function CreateOrderDialog({ open, onOpenChange, onSuccess }: CreateOrderDialogProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<Promotion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [couponSearchOpen, setCouponSearchOpen] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingBillingAddress, setEditingBillingAddress] = useState<Address | null>(null);
  const [editingShippingAddress, setEditingShippingAddress] = useState<Address | null>(null);
  const [billingAddressForm, setBillingAddressForm] = useState<Partial<Address>>({});
  const [shippingAddressForm, setShippingAddressForm] = useState<Partial<Address>>({});
  const [isCreatingBillingAddress, setIsCreatingBillingAddress] = useState(false);
  const [isCreatingShippingAddress, setIsCreatingShippingAddress] = useState(false);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<Address | null>(null);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<Address | null>(null);
  const [billingCountryCode, setBillingCountryCode] = useState<string>(DEFAULT_COUNTRY_CODE);
  const [billingStateCode, setBillingStateCode] = useState<string>('');
  const [shippingCountryCode, setShippingCountryCode] = useState<string>(DEFAULT_COUNTRY_CODE);
  const [shippingStateCode, setShippingStateCode] = useState<string>('');
  const [billingAddressId, setBillingAddressId] = useState<string>('new');
  const [shippingAddressId, setShippingAddressId] = useState<string>('new');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'valid' | 'invalid' | 'checking'>('idle');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [applicableTaxRate, setApplicableTaxRate] = useState<TaxRate | null>(null);
  const [taxRateLoading, setTaxRateLoading] = useState(false);
  const [applicableShippingRate, setApplicableShippingRate] = useState<any | null>(null);
  const [shippingRateLoading, setShippingRateLoading] = useState(false);
  const couponInputRef = useRef<HTMLInputElement>(null);

  // Custom location states
  const [customCountries, setCustomCountries] = useState<string[]>([]);
  const [customBillingStates, setCustomBillingStates] = useState<string[]>([]);
  const [customBillingCities, setCustomBillingCities] = useState<string[]>([]);
  const [customShippingStates, setCustomShippingStates] = useState<string[]>([]);
  const [customShippingCities, setCustomShippingCities] = useState<string[]>([]);

  // Add new location dialog
  const [addLocationDialog, setAddLocationDialog] = useState<{
    open: boolean;
    type: 'state' | 'city' | null;
    target: 'billing' | 'shipping';
    country: string;
    state?: string;
  }>({
    open: false,
    type: null,
    target: 'billing',
    country: '',
    state: ''
  });
  const [newLocationName, setNewLocationName] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  // ----------------------------------------------------------------------
  // CUSTOM LOCATION LOGIC
  // ----------------------------------------------------------------------
  // Load custom countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await getCustomCountries();
        if (response.success && response.data) {
          setCustomCountries(response.data);
        }
      } catch (error) {
        console.error('Failed to load custom countries:', error);
      }
    };
    loadCountries();
  }, []);

  // Make sure to load states/cities when form updates
  useEffect(() => {
    const loadStates = async () => {
      const country = billingAddressForm.country;
      if (!country) { setCustomBillingStates([]); return; }
      try {
        const response = await getCustomStates(country);
        if (response.success && response.data) {
          setCustomBillingStates(response.data);
        }
      } catch (e) { setCustomBillingStates([]); }
    };
    loadStates();
  }, [billingAddressForm.country]);

  useEffect(() => {
    const loadCities = async () => {
      const country = billingAddressForm.country;
      const state = billingAddressForm.state;
      if (!country || !state) { setCustomBillingCities([]); return; }
      try {
        const response = await getCustomCities(country, state);
        if (response.success && response.data) {
          setCustomBillingCities(response.data);
        }
      } catch (e) { setCustomBillingCities([]); }
    };
    loadCities();
  }, [billingAddressForm.country, billingAddressForm.state]);

  useEffect(() => {
    const loadStates = async () => {
      const country = shippingAddressForm.country;
      if (!country) { setCustomShippingStates([]); return; }
      try {
        const response = await getCustomStates(country);
        if (response.success && response.data) {
          setCustomShippingStates(response.data);
        }
      } catch (e) { setCustomShippingStates([]); }
    };
    loadStates();
  }, [shippingAddressForm.country]);

  useEffect(() => {
    const loadCities = async () => {
      const country = shippingAddressForm.country;
      const state = shippingAddressForm.state;
      if (!country || !state) { setCustomShippingCities([]); return; }
      try {
        const response = await getCustomCities(country, state);
        if (response.success && response.data) {
          setCustomShippingCities(response.data);
        }
      } catch (e) { setCustomShippingCities([]); }
    };
    loadCities();
  }, [shippingAddressForm.country, shippingAddressForm.state]);

  const handleAddLocation = (target: 'billing' | 'shipping', type: 'state' | 'city') => {
    let country = target === 'billing' ? (billingAddressForm.country || "United States") : (shippingAddressForm.country || "United States");
    let state = target === 'billing' ? billingAddressForm.state : shippingAddressForm.state;

    setAddLocationDialog({
      open: true,
      type,
      target,
      country,
      state: type === 'city' ? state : undefined
    });
    setNewLocationName('');
  };

  const handleSaveLocation = async () => {
    if (!newLocationName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setSavingLocation(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const newValue = newLocationName.trim();
      const target = addLocationDialog.target;
      const type = addLocationDialog.type;

      if (target === 'billing') {
        if (type === 'state') {
          setBillingAddressForm(prev => ({ ...prev, state: newValue, city: '' }));
        } else {
          setBillingAddressForm(prev => ({ ...prev, city: newValue }));
        }
      } else {
        if (type === 'state') {
          setShippingAddressForm(prev => ({ ...prev, state: newValue, city: '' }));
        } else {
          setShippingAddressForm(prev => ({ ...prev, city: newValue }));
        }
      }

      toast.success(`${type === 'state' ? 'State' : 'City'} added`);
      setAddLocationDialog(prev => ({ ...prev, open: false }));
      setNewLocationName('');
    } finally {
      setSavingLocation(false);
    }
  };

  // Load customers and products
  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchProducts();
      fetchAvailableCoupons();
    }
  }, [open]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerSearchTerm.trim()) {
        fetchCustomers(customerSearchTerm.trim());
      } else {
        fetchCustomers();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (customerSearchOpen && !target.closest('.customer-dropdown-container')) {
        setCustomerSearchOpen(false);
      }
    };

    if (customerSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [customerSearchOpen]);

  // Filter customers based on search term - use local filtering as fallback
  useEffect(() => {
    if (customerSearchTerm) {
      // If we have a search term, filter locally as well (in case API search didn't work)
      const filtered = customers.filter(customer => {
        const searchLower = customerSearchTerm.toLowerCase();
        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase().trim();
        return (
          customer.firstName?.toLowerCase().includes(searchLower) ||
          customer.lastName?.toLowerCase().includes(searchLower) ||
          customer.email?.toLowerCase().includes(searchLower) ||
          customer.mobile?.includes(customerSearchTerm) ||
          fullName.includes(searchLower)
        );
      });
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [customerSearchTerm, customers]);

  // Sync shipping address with billing when "Same as Billing" is checked
  useEffect(() => {
    if (!sameAsBilling) return;
    setShippingAddressForm({ ...billingAddressForm });
    setShippingCountryCode(billingCountryCode);
    setShippingStateCode(billingStateCode);
    setShippingAddressId(billingAddressId);
  }, [sameAsBilling, billingAddressForm, billingCountryCode, billingStateCode, billingAddressId]);

  const fetchCustomers = async (search?: string) => {
    try {
      const response = await api.getCustomers({ limit: 100, search: search || undefined });
      if (response.success && response.data) {
        const fetchedCustomers = response.data.customers || [];
        setCustomers(fetchedCustomers);
        // If we have a search term, the API should return filtered results
        // But we'll also apply local filtering as a fallback
        if (search) {
          const filtered = fetchedCustomers.filter(customer => {
            const searchLower = search.toLowerCase();
            const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase().trim();
            return (
              customer.firstName?.toLowerCase().includes(searchLower) ||
              customer.lastName?.toLowerCase().includes(searchLower) ||
              customer.email?.toLowerCase().includes(searchLower) ||
              customer.mobile?.includes(search) ||
              fullName.includes(searchLower)
            );
          });
          setFilteredCustomers(filtered);
        } else {
          setFilteredCustomers(fetchedCustomers);
        }
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const fetchAvailableCoupons = async () => {
    try {
      const response = await api.getPromotions({ isActive: true, limit: 100 });
      if (response.success && response.data) {
        // Handle both possible response structures
        const coupons = Array.isArray(response.data) ? response.data : response.data.data || [];
        // Filter for currently valid coupons
        const now = new Date();
        const validCoupons = coupons.filter((coupon: Promotion) => {
          const isNotExpired = !coupon.expiresAt || new Date(coupon.expiresAt) >= now;
          const isStarted = !coupon.startsAt || new Date(coupon.startsAt) <= now;
          const hasUsageLeft = !coupon.usageLimit || coupon.usageCount < coupon.usageLimit;
          return coupon.isActive && isNotExpired && isStarted && hasUsageLeft;
        });
        setAvailableCoupons(validCoupons);
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.getProducts({
        limit: 100,
        status: 'ACTIVE',
        include: {
          variants: {
            include: {
              inventory: true,
              // @ts-ignore
              segmentPrices: true,
              bulkPrices: {
                orderBy: { minQty: 'asc' }
              }
            }
          }
        }
      });

      // Debug logging
      console.log('Products API response:', response);

      // Validate inventory data
      const productsWithInventory = (response.success && response.data?.products || []).map((product: Product) => ({
        ...product,
        variants: product.variants?.map((variant: ProductVariant) => ({
          ...variant,
          inventory: variant.inventory || []
        }))
      }));

      console.log('Products with validated inventory:', productsWithInventory);
      setProducts(productsWithInventory);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    }
  };

  // Helper functions to resolve country and state names (from ISO or Name)
  const resolveCountryIso = (countryValue: string): string => {
    if (!countryValue) return "United States";
    // Check if it's an ISO code
    const byIso = Country.getAllCountries().find(c => c.isoCode === countryValue);
    if (byIso) return byIso.name;
    // Check if it's a name (case insensitive)
    const byName = Country.getAllCountries().find(c => c.name.toLowerCase() === countryValue.toLowerCase());
    if (byName) return byName.name;
    // Return original if no match
    return countryValue;
  };

  const resolveStateIso = (countryName: string, stateValue: string): string => {
    if (!countryName || !stateValue) return "";

    // Find country iso from name
    const country = Country.getAllCountries().find(c => c.name === countryName || c.isoCode === countryName);
    if (!country) return stateValue; // Can't resolve without country

    const states = State.getStatesOfCountry(country.isoCode);
    const byIso = states.find(s => s.isoCode === stateValue);
    if (byIso) return byIso.name;
    const byName = states.find(s => s.name.toLowerCase() === stateValue.toLowerCase());
    if (byName) return byName.name;

    return stateValue;
  };

  const applyBillingAddress = (address: Address | null, customer?: Customer | null) => {
    const currentCustomer = customer || selectedCustomer;
    if (address) {
      console.log('Applying billing address:', address);
      const cName = resolveCountryIso(address.country || "United States");
      const sName = resolveStateIso(cName, address.state || "");

      setBillingAddressForm({
        firstName: address.firstName || currentCustomer?.firstName || "",
        lastName: address.lastName || currentCustomer?.lastName || "",
        address1: address.address1 || "",
        address2: address.address2 || "",
        city: address.city || "",
        state: sName,
        postalCode: address.postalCode || "",
        country: cName,
        phone: sanitizePhone(address.phone || ""),
      });
      setBillingCountryCode(cName);
      setBillingStateCode(sName);
      setSelectedBillingAddress(address);
    } else {
      setBillingAddressForm({
        firstName: currentCustomer?.firstName || "",
        lastName: currentCustomer?.lastName || "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "United States",
        phone: "",
      });
      setBillingCountryCode("United States");
      setBillingStateCode("");
      setSelectedBillingAddress(null);
    }
  };

  const applyShippingAddress = (address: Address | null, customer?: Customer | null) => {
    const currentCustomer = customer || selectedCustomer;
    if (address) {
      console.log('Applying shipping address:', address);
      const cName = resolveCountryIso(address.country || "United States");
      const sName = resolveStateIso(cName, address.state || "");

      setShippingAddressForm({
        firstName: address.firstName || currentCustomer?.firstName || "",
        lastName: address.lastName || currentCustomer?.lastName || "",
        address1: address.address1 || "",
        address2: address.address2 || "",
        city: address.city || "",
        state: sName,
        postalCode: address.postalCode || "",
        country: cName,
        phone: sanitizePhone(address.phone || ""),
      });
      setShippingCountryCode(cName);
      setShippingStateCode(sName);
      setSelectedShippingAddress(address);

      fetchApplicableTaxRate(address);
      const currentSubtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      fetchApplicableShippingRate(address, currentSubtotal);
    } else {
      setShippingAddressForm({
        firstName: currentCustomer?.firstName || "",
        lastName: currentCustomer?.lastName || "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "United States",
        phone: "",
      });
      setShippingCountryCode("United States");
      setShippingStateCode("");
      setSelectedShippingAddress(null);
    }
  };

  const handleBillingSelect = async (value: string) => {
    if (value === "new") {
      setBillingAddressId("new");
      applyBillingAddress(null, selectedCustomer);
      return;
    }
    const selected = selectedCustomer?.addresses?.find((a) => a.id === value) || null;
    if (selected) {
      console.log('Selected billing address:', selected);
      setBillingAddressId(value);
      applyBillingAddress(selected, selectedCustomer);

      // Immediately save the selected address
      if (selectedCustomer) {
        try {
          await api.updateAddress(selectedCustomer.id, value, {
            firstName: selected.firstName,
            lastName: selected.lastName,
            address1: selected.address1,
            address2: selected.address2,
            city: selected.city,
            state: selected.state,
            postalCode: selected.postalCode,
            country: selected.country,
            phone: selected.phone,
          });
          toast.success('Billing address selected and saved');
        } catch (error) {
          console.error('Failed to save billing address:', error);
          toast.success('Billing address selected');
        }
      }
    }
  };

  // Auto-save billing address when fields change (debounced)
  useEffect(() => {
    if (!selectedCustomer || billingAddressId === 'new') return;

    const timer = setTimeout(async () => {
      // Only save if address has valid data
      if (!billingAddressForm.firstName || !billingAddressForm.lastName || !billingAddressForm.address1 ||
        !billingAddressForm.city || !billingAddressForm.state || !billingAddressForm.postalCode || !billingAddressForm.country) {
        return;
      }

      try {
        // Auto-save the updated address
        await api.updateAddress(selectedCustomer.id, billingAddressId, billingAddressForm);
      } catch (error) {
        console.error('Failed to auto-save billing address:', error);
      }
    }, 1500); // Debounce for 1.5 seconds

    return () => clearTimeout(timer);
  }, [billingAddressForm, billingAddressId, selectedCustomer]);

  const handleShippingSelect = async (value: string) => {
    if (value === "new") {
      setShippingAddressId("new");
      applyShippingAddress(null, selectedCustomer);
      return;
    }
    const selected = selectedCustomer?.addresses?.find((a) => a.id === value) || null;
    if (selected) {
      console.log('Selected shipping address:', selected);
      setShippingAddressId(value);
      applyShippingAddress(selected, selectedCustomer);

      // Immediately save the selected address
      if (selectedCustomer) {
        try {
          await api.updateAddress(selectedCustomer.id, value, {
            firstName: selected.firstName,
            lastName: selected.lastName,
            address1: selected.address1,
            address2: selected.address2,
            city: selected.city,
            state: selected.state,
            postalCode: selected.postalCode,
            country: selected.country,
            phone: selected.phone,
          });
          toast.success('Shipping address selected and saved');
        } catch (error) {
          console.error('Failed to save shipping address:', error);
          toast.success('Shipping address selected');
        }
      }
    }
  };

  // Auto-save shipping address when fields change (debounced)
  useEffect(() => {
    if (!selectedCustomer || sameAsBilling || shippingAddressId === 'new') return;

    const timer = setTimeout(async () => {
      // Only save if address has valid data
      if (!shippingAddressForm.firstName || !shippingAddressForm.lastName || !shippingAddressForm.address1 ||
        !shippingAddressForm.city || !shippingAddressForm.state || !shippingAddressForm.postalCode || !shippingAddressForm.country) {
        return;
      }

      try {
        // Auto-save the updated address
        await api.updateAddress(selectedCustomer.id, shippingAddressId, shippingAddressForm);
      } catch (error) {
        console.error('Failed to auto-save shipping address:', error);
      }
    }, 1500); // Debounce for 1.5 seconds

    return () => clearTimeout(timer);
  }, [shippingAddressForm, shippingAddressId, selectedCustomer, sameAsBilling]);

  const handleSameAsBillingChange = async (checked: boolean) => {
    setSameAsBilling(checked);
    if (checked) {
      // Copy billing address to shipping
      setShippingAddressId(billingAddressId);
      setShippingCountryCode(billingCountryCode);
      setShippingStateCode(billingStateCode);
      setShippingAddressForm({ ...billingAddressForm });

      // Auto-save the shipping address with billing address data
      if (!selectedCustomer) return;

      try {
        setLoading(true);
        let response;

        if (billingAddressId === 'new') {
          // If billing address is new, we need to save it first
          const billingResponse = await api.createAddress(selectedCustomer.id, {
            ...billingAddressForm,
            type: 'BILLING',
            isDefault: !selectedCustomer.addresses?.some(a => a.type === 'BILLING'),
          } as any);

          if (!billingResponse.success) {
            toast.error('Failed to save billing address');
            setLoading(false);
            return;
          }

          // Now create shipping address with same data
          response = await api.createAddress(selectedCustomer.id, {
            ...billingAddressForm,
            type: 'SHIPPING',
            isDefault: !selectedCustomer.addresses?.some(a => a.type === 'SHIPPING'),
          } as any);

          // Refresh customer data
          const customerResponse = await api.getCustomer(selectedCustomer.id);
          if (customerResponse.success && customerResponse.data) {
            setSelectedCustomer(customerResponse.data);
          }
        } else {
          // Billing address already exists, create shipping address with same data
          response = await api.createAddress(selectedCustomer.id, {
            ...billingAddressForm,
            type: 'SHIPPING',
            isDefault: !selectedCustomer.addresses?.some(a => a.type === 'SHIPPING'),
          } as any);

          // Refresh customer data
          const customerResponse = await api.getCustomer(selectedCustomer.id);
          if (customerResponse.success && customerResponse.data) {
            setSelectedCustomer(customerResponse.data);
          }
        }

        if (response?.success && response.data) {
          const updatedAddress = response.data;
          setShippingAddressId(updatedAddress.id);
          applyShippingAddress(updatedAddress, selectedCustomer);
          toast.success('Shipping address synced with billing address');
        } else {
          toast.error('Failed to sync shipping address');
        }
      } catch (error) {
        console.error('Failed to auto-save shipping address:', error);
        toast.error('Failed to sync shipping address');
      } finally {
        setLoading(false);
      }
    } else {
      // Reset shipping address to new
      setShippingAddressId("new");
      applyShippingAddress(null, selectedCustomer);
    }
  };

  const formatAddressLabel = (address: Address): string => {
    const firstName = address.firstName || "";
    const lastName = address.lastName || "";
    const summaryParts = [address.address1, address.city, address.state].filter(Boolean);
    const summary = summaryParts.join(", ");
    const typeLabel = address.type === "BILLING" ? "Billing" : address.type === "SHIPPING" ? "Shipping" : "";
    const defaultLabel = address.isDefault ? " (Default)" : "";
    return `${typeLabel}${typeLabel ? " • " : ""}${firstName} ${lastName} — ${summary}${defaultLabel}`;
  };

  const billingAddressOptions = (selectedCustomer?.addresses || []).filter(
    (a) => a.type === "BILLING"
  ).length > 0
    ? (selectedCustomer?.addresses || []).filter((a) => a.type === "BILLING")
    : (selectedCustomer?.addresses || []);

  const shippingAddressOptions = (selectedCustomer?.addresses || []).filter(
    (a) => a.type === "SHIPPING"
  ).length > 0
    ? (selectedCustomer?.addresses || []).filter((a) => a.type === "SHIPPING")
    : (selectedCustomer?.addresses || []);

  const handleCustomerSelect = async (customerId: string) => {
    setCustomerSearchOpen(false);
    setCustomerSearchTerm('');
    setCustomerLoading(true);

    try {
      // Fetch full customer data with addresses
      const customerResponse = await api.getCustomer(customerId);
      if (customerResponse.success && customerResponse.data) {
        const customer = customerResponse.data;
        setSelectedCustomer(customer);

        // When customer changes, update prices of existing items based on their segment
        if (customer?.customerType && orderItems.length > 0) {
          setOrderItems(orderItems.map(item => {
            // Map B2B to B2C and ENTERPRISE_2 to ENTERPRISE_1 for pricing
            const effectiveCustomerType = customer.customerType === 'B2B'
              ? 'B2C'
              : customer.customerType === 'ENTERPRISE_2'
                ? 'ENTERPRISE_1'
                : customer.customerType;

            const segmentPrice = item.variant?.segmentPrices?.find(
              sp => sp.customerType === effectiveCustomerType
            );

            const newUnitPrice = segmentPrice
              ? (segmentPrice.salePrice || segmentPrice.regularPrice)
              : (item.variant?.salePrice || item.variant?.regularPrice || 0);

            return {
              ...item,
              unitPrice: newUnitPrice,
              totalPrice: item.quantity * newUnitPrice
            };
          }));
        }

        // Apply addresses after customer is set
        if (customer?.addresses && customer.addresses.length > 0) {
          // Auto-select billing address
          const billingAddress = customer.addresses.find(a => a.type === 'BILLING' && a.isDefault)
            || customer.addresses.find(a => a.type === 'BILLING')
            || customer.addresses[0];

          // Auto-select shipping address
          const shippingAddress = customer.addresses.find(a => a.type === 'SHIPPING' && a.isDefault)
            || customer.addresses.find(a => a.type === 'SHIPPING')
            || customer.addresses[0];

          // Apply addresses with customer data
          if (billingAddress) {
            setBillingAddressId(billingAddress.id);
            applyBillingAddress(billingAddress, customer);
          } else {
            setBillingAddressId('new');
            applyBillingAddress(null, customer);
          }

          if (shippingAddress) {
            setShippingAddressId(shippingAddress.id);
            applyShippingAddress(shippingAddress, customer);
          } else {
            setShippingAddressId('new');
            applyShippingAddress(null, customer);
          }
        } else {
          setBillingAddressId('new');
          setShippingAddressId('new');
          applyBillingAddress(null, customer);
          applyShippingAddress(null, customer);
        }
      } else {
        // Fallback to customer from list if API call fails
        const customer = customers.find(c => c.id === customerId);
        setSelectedCustomer(customer || null);
        if (customer?.addresses && customer.addresses.length > 0) {
          const billingAddress = customer.addresses.find(a => a.type === 'BILLING' && a.isDefault)
            || customer.addresses.find(a => a.type === 'BILLING')
            || customer.addresses[0];
          const shippingAddress = customer.addresses.find(a => a.type === 'SHIPPING' && a.isDefault)
            || customer.addresses.find(a => a.type === 'SHIPPING')
            || customer.addresses[0];

          if (billingAddress) {
            setBillingAddressId(billingAddress.id);
            applyBillingAddress(billingAddress, customer);
          } else {
            setBillingAddressId('new');
            applyBillingAddress(null, customer);
          }

          if (shippingAddress) {
            setShippingAddressId(shippingAddress.id);
            applyShippingAddress(shippingAddress, customer);
          } else {
            setShippingAddressId('new');
            applyShippingAddress(null, customer);
          }
        } else {
          setBillingAddressId('new');
          setShippingAddressId('new');
          applyBillingAddress(null, customer);
          applyShippingAddress(null, customer);
        }
      }
    } catch (error) {
      console.error('Failed to fetch customer details:', error);
      // Fallback to customer from list
      const customer = customers.find(c => c.id === customerId);
      setSelectedCustomer(customer || null);
      setBillingAddressId('new');
      setShippingAddressId('new');
      applyBillingAddress(null, customer || null);
      applyShippingAddress(null, customer || null);
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleSaveBillingAddress = async () => {
    if (!selectedCustomer) return;

    // Validate required fields
    if (!billingAddressForm.firstName || !billingAddressForm.lastName || !billingAddressForm.address1 ||
      !billingAddressForm.city || !billingAddressForm.state || !billingAddressForm.postalCode || !billingAddressForm.country) {
      toast.error('Please fill in all required address fields');
      return;
    }

    try {
      setLoading(true);
      let response;

      if (billingAddressId === 'new') {
        // Create new address
        response = await api.createAddress(selectedCustomer.id, {
          ...billingAddressForm,
          type: 'BILLING',
          isDefault: !selectedCustomer.addresses?.some(a => a.type === 'BILLING'),
        } as any);
      } else if (billingAddressId) {
        // Update existing address
        response = await api.updateAddress(selectedCustomer.id, billingAddressId, billingAddressForm);
      } else {
        toast.error('Invalid address state');
        return;
      }

      if (response.success && response.data) {
        // Refresh customer data to get updated addresses
        const customerResponse = await api.getCustomer(selectedCustomer.id);
        if (customerResponse.success && customerResponse.data) {
          const updatedCustomer = customerResponse.data;
          setSelectedCustomer(updatedCustomer);

          // Find the newly created/updated address
          const updatedAddress = updatedCustomer.addresses?.find(a => a.id === response.data?.id);
          if (updatedAddress) {
            // Re-apply the address to populate all fields including country/state codes
            // This will also set billingAddressId to the new address ID
            applyBillingAddress(updatedAddress, updatedCustomer);

            // Ensure the Select component shows the selected address
            // The applyBillingAddress function already sets billingAddressId, but we ensure it's set here too
            setBillingAddressId(updatedAddress.id);
          }
        }
        setEditingBillingAddress(null);
        setIsCreatingBillingAddress(false);
        toast.success(billingAddressId === 'new' ? 'Billing address created successfully' : 'Billing address updated successfully');
      } else {
        toast.error(response.error || `Failed to ${billingAddressId === 'new' ? 'create' : 'update'} billing address`);
      }
    } catch (error) {
      console.error('Failed to save billing address:', error);
      toast.error(`Failed to ${billingAddressId === 'new' ? 'create' : 'update'} billing address`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShippingAddress = async () => {
    if (!selectedCustomer) return;

    // Validate required fields
    if (!shippingAddressForm.firstName || !shippingAddressForm.lastName || !shippingAddressForm.address1 ||
      !shippingAddressForm.city || !shippingAddressForm.state || !shippingAddressForm.postalCode || !shippingAddressForm.country) {
      toast.error('Please fill in all required address fields');
      return;
    }

    try {
      setLoading(true);
      let response;

      if (shippingAddressId === 'new') {
        // Create new address
        response = await api.createAddress(selectedCustomer.id, {
          ...shippingAddressForm,
          type: 'SHIPPING',
          isDefault: !selectedCustomer.addresses?.some(a => a.type === 'SHIPPING'),
        } as any);
      } else if (shippingAddressId) {
        // Update existing address
        response = await api.updateAddress(selectedCustomer.id, shippingAddressId, shippingAddressForm);
      } else {
        toast.error('Invalid address state');
        return;
      }

      if (response.success && response.data) {
        // Refresh customer data to get updated addresses
        const customerResponse = await api.getCustomer(selectedCustomer.id);
        if (customerResponse.success && customerResponse.data) {
          const updatedCustomer = customerResponse.data;
          setSelectedCustomer(updatedCustomer);

          // Find the newly created/updated address
          const updatedAddress = updatedCustomer.addresses?.find(a => a.id === response.data?.id);
          if (updatedAddress) {
            // Re-apply the address to populate all fields including country/state codes
            // This will also set shippingAddressId to the new address ID
            applyShippingAddress(updatedAddress, updatedCustomer);

            // Ensure the Select component shows the selected address
            // The applyShippingAddress function already sets shippingAddressId, but we ensure it's set here too
            setShippingAddressId(updatedAddress.id);
          }
        }
        setEditingShippingAddress(null);
        setIsCreatingShippingAddress(false);
        toast.success(shippingAddressId === 'new' ? 'Shipping address created successfully' : 'Shipping address updated successfully');
      } else {
        toast.error(response.error || `Failed to ${shippingAddressId === 'new' ? 'create' : 'update'} shipping address`);
      }
    } catch (error) {
      console.error('Failed to save shipping address:', error);
      toast.error(`Failed to ${shippingAddressId === 'new' ? 'create' : 'update'} shipping address`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrderItem = (variant: ProductVariant & { product?: Product }) => {
    // Debug logging
    console.log('Variant inventory:', variant.inventory);
    console.log('Variant with product:', variant);

    // Ensure product data is included - find from products list if not in variant
    let variantWithProduct = variant;
    if (!variant.product && variant.productId) {
      const product = products.find(p => p.id === variant.productId);
      if (product) {
        variantWithProduct = { ...variant, product };
      }
    }

    // Check if variant has available inventory
    const totalAvailable = variantWithProduct.inventory?.reduce((sum, inv) => {
      const available = Math.max(0, (inv.quantity || 0) - (inv.reservedQty || 0));
      console.log(`Location ${inv.locationId}: quantity=${inv.quantity}, reservedQty=${inv.reservedQty}, available=${available}`);
      return sum + available;
    }, 0) || 0;

    console.log('Total available:', totalAvailable);

    if (totalAvailable <= 0) {
      toast.error('This product is out of stock');
      return;
    }

    const existingItem = orderItems.find(item => item.variantId === variantWithProduct.id);

    if (existingItem) {
      // Check if increasing quantity is possible
      if (existingItem.quantity + 1 > totalAvailable) {
        toast.error('Not enough stock available');
        return;
      }

      setOrderItems(orderItems.map(item => {
        if (item.variantId === variantWithProduct.id) {
          const newQuantity = item.quantity + 1;

          // Check for bulk pricing based on new quantity
          let effectivePrice = item.unitPrice;
          const bulkPrices = item.variant?.bulkPrices;

          if (bulkPrices && Array.isArray(bulkPrices)) {
            const applicableBulk = bulkPrices.find((bp: any) => {
              const minQty = Number(bp.minQty);
              const maxQty = bp.maxQty ? Number(bp.maxQty) : Infinity;
              return newQuantity >= minQty && newQuantity <= maxQty;
            });

            if (applicableBulk) {
              effectivePrice = Number(applicableBulk.price);
            }
          }

          return { ...item, quantity: newQuantity, totalPrice: Math.max(0, newQuantity * effectivePrice) };
        }
        return item;
      }));
    } else {
      // Get price based on customer segment
      // Map B2B to B2C and ENTERPRISE_2 to ENTERPRISE_1 for pricing
      const effectiveCustomerType = selectedCustomer?.customerType === 'B2B'
        ? 'B2C'
        : selectedCustomer?.customerType === 'ENTERPRISE_2'
          ? 'ENTERPRISE_1'
          : selectedCustomer?.customerType;

      const segmentPrice = effectiveCustomerType && variantWithProduct.segmentPrices?.find(
        sp => sp.customerType === effectiveCustomerType
      );

      const unitPrice = segmentPrice
        ? (segmentPrice.salePrice || segmentPrice.regularPrice)
        : (variantWithProduct.salePrice || variantWithProduct.regularPrice);

      // Check for bulk pricing for quantity 1
      let effectivePrice = unitPrice;
      const bulkPrices = (variantWithProduct as any).bulkPrices;

      if (bulkPrices && Array.isArray(bulkPrices)) {
        const applicableBulk = bulkPrices.find((bp: any) => {
          const minQty = Number(bp.minQty);
          const maxQty = bp.maxQty ? Number(bp.maxQty) : Infinity;
          return 1 >= minQty && 1 <= maxQty;
        });

        if (applicableBulk) {
          effectivePrice = Number(applicableBulk.price);
        }
      }

      const newItem: OrderItem = {
        variantId: variantWithProduct.id,
        variant: variantWithProduct,
        quantity: 1,
        unitPrice,
        totalPrice: Math.max(0, effectivePrice),
      };
      setOrderItems([...orderItems, newItem]);
    }
  };

  const handleRemoveOrderItem = (variantId: string) => {
    setOrderItems(orderItems.filter(item => item.variantId !== variantId));
  };

  const handleUpdateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveOrderItem(variantId);
      return;
    }

    const item = orderItems.find(item => item.variantId === variantId);
    if (!item?.variant?.inventory) return;

    // Check if requested quantity is available
    const totalAvailable = item.variant.inventory.reduce((sum, inv) =>
      sum + Math.max(0, inv.quantity - inv.reservedQty), 0);

    if (quantity > totalAvailable) {
      toast.error('Not enough stock available');
      return;
    }

    setOrderItems(orderItems.map(item => {
      if (item.variantId === variantId) {
        // Check for bulk pricing based on new quantity
        let effectivePrice = item.unitPrice;
        const bulkPrices = item.variant?.bulkPrices;

        if (bulkPrices && Array.isArray(bulkPrices)) {
          const applicableBulk = bulkPrices.find((bp: any) => {
            const minQty = Number(bp.minQty);
            const maxQty = bp.maxQty ? Number(bp.maxQty) : Infinity;
            return quantity >= minQty && quantity <= maxQty;
          });

          if (applicableBulk) {
            effectivePrice = Number(applicableBulk.price);
          }
        }

        return { ...item, quantity, totalPrice: Math.max(0, quantity * effectivePrice) };
      }
      return item;
    }));
  };

  const handleUpdatePrice = (variantId: string, unitPrice: number) => {
    setOrderItems(orderItems.map(item =>
      item.variantId === variantId
        ? { ...item, unitPrice, totalPrice: Math.max(0, item.quantity * unitPrice) }
        : item
    ));
  };

  // Convert country and state names to ISO codes for tax rate lookup
  const getCountryStateIsoCodes = (countryName: string, stateName?: string) => {
    // First try to find by ISO code (e.g., "US")
    let country = Country.getAllCountries().find(c =>
      c.isoCode.toUpperCase() === countryName.toUpperCase()
    );

    // If not found by ISO code, try by full name (e.g., "United States")
    if (!country) {
      country = Country.getAllCountries().find(c =>
        c.name.toLowerCase() === countryName.toLowerCase()
      );
    }

    if (!country) {
      console.warn(`Country not found: ${countryName}`);
      return { countryCode: null, stateCode: null };
    }

    let stateCode = null;
    if (stateName) {
      // First try to find state by ISO code
      let state = State.getStatesOfCountry(country.isoCode).find(s =>
        s.isoCode.toUpperCase() === stateName.toUpperCase()
      );

      // If not found by ISO code, try by full name
      if (!state) {
        state = State.getStatesOfCountry(country.isoCode).find(s =>
          s.name.toLowerCase() === stateName.toLowerCase()
        );
      }

      stateCode = state?.isoCode || null;
      if (!state) {
        console.warn(`State not found: ${stateName} in ${countryName}`);
      }
    }

    return { countryCode: country.isoCode, stateCode };
  };

  // Fetch applicable tax rate based on shipping address
  const fetchApplicableTaxRate = async (address: Address) => {
    if (!address.country) return;

    setTaxRateLoading(true);
    try {
      // Convert country and state names to ISO codes
      const { countryCode, stateCode } = getCountryStateIsoCodes(address.country, address.state);

      if (!countryCode) {
        console.error('Could not find country code for:', address.country);
        setApplicableTaxRate(null);
        setTaxAmount(0);
        return;
      }

      console.log(`Looking up tax rate for: ${countryCode}, ${stateCode || 'no state'}`);

      const response = await api.getApplicableTaxRate(countryCode, stateCode || undefined);
      if (response.success && response.data) {
        console.log('Found tax rate:', response.data);
        setApplicableTaxRate(response.data);
        // Auto-calculate tax amount based on current subtotal
        const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const calculatedTax = subtotal * (response.data.rate / 100);
        setTaxAmount(calculatedTax);
      } else {
        console.log('No tax rate found for:', countryCode, stateCode);
        setApplicableTaxRate(null);
        setTaxAmount(0);
      }
    } catch (error) {
      console.error('Failed to fetch tax rate:', error);
      setApplicableTaxRate(null);
      setTaxAmount(0);
    } finally {
      setTaxRateLoading(false);
    }
  };

  // Fetch applicable shipping rate based on shipping address and order details
  const fetchApplicableShippingRate = async (address: Address, subtotal: number) => {
    if (!address.country || subtotal <= 0) return;

    setShippingRateLoading(true);
    try {
      // Convert country name to ISO code
      const { countryCode } = getCountryStateIsoCodes(address.country, address.state);

      if (!countryCode) {
        console.error('Could not find country code for:', address.country);
        setApplicableShippingRate(null);
        setShippingAmount(0);
        return;
      }

      console.log(`Looking up shipping rate for: ${countryCode}, subtotal: ${subtotal}`);

      const response = await api.getApplicableShippingRate(countryCode, subtotal);
      if (response.success && response.data) {
        console.log('Found shipping rate:', response.data);
        setApplicableShippingRate(response.data);
        setShippingAmount(response.data.finalRate || 0);
      } else {
        console.log('No shipping rate found for:', countryCode);
        setApplicableShippingRate(null);
        setShippingAmount(0);
      }
    } catch (error) {
      console.error('Error fetching shipping rate:', error);
      setApplicableShippingRate(null);
      setShippingAmount(0);
    } finally {
      setShippingRateLoading(false);
    }
  };

  const calculateCouponDiscount = async (coupon: Promotion, subtotal: number, shippingAmount: number): Promise<number> => {
    if (!coupon) return 0;

    // Check minimum order amount
    if (coupon.minOrderAmount && subtotal < parseFloat(coupon.minOrderAmount.toString())) {
      return 0;
    }

    // For BOGO and VOLUME_DISCOUNT, we need to call the backend for proper calculation
    if (coupon.type === 'BOGO' || coupon.type === 'VOLUME_DISCOUNT') {
      try {
        // Prepare order items data for backend calculation
        const orderItemsData = orderItems.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          variant: {
            productId: item.variant?.productId
          }
        }));

        // Call backend to calculate advanced promotion discount
        const response = await api.calculatePromotionDiscount({
          promotionCode: coupon.code,
          orderItems: orderItemsData,
          customerId: selectedCustomer?.id,
          subtotal,
          shippingAmount
        });

        if (response.success && response.data) {
          return response.data.discount || 0;
        }
      } catch (error) {
        console.error('Failed to calculate advanced promotion discount:', error);
        // Fallback to simple calculation below
      }
    }

    // Simple calculation for basic promotion types or fallback
    let discount = 0;

    switch (coupon.type) {
      case 'PERCENTAGE':
        discount = Math.round(subtotal * (parseFloat(coupon.value.toString()) / 100) * 100) / 100;
        break;
      case 'FIXED_AMOUNT':
        discount = parseFloat(coupon.value.toString());
        break;
      case 'FREE_SHIPPING':
        discount = shippingAmount;
        break;
      case 'BOGO':
        // Fallback simple BOGO logic if backend call fails
        const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

        // Default to Buy 2 Get 1 Free if no specific configuration
        const buyQty = 2;
        const getQty = 1;
        const freeItems = Math.floor(totalQuantity / buyQty) * getQty;

        if (freeItems > 0) {
          // Calculate discount based on cheapest items getting free
          const sortedItems = [...orderItems].sort((a, b) => a.unitPrice - b.unitPrice);
          let remainingFreeQty = freeItems;

          for (const item of sortedItems) {
            if (remainingFreeQty <= 0) break;
            const freeQtyForItem = Math.min(remainingFreeQty, item.quantity);
            discount += freeQtyForItem * item.unitPrice;
            remainingFreeQty -= freeQtyForItem;
          }
        }
        break;
      case 'VOLUME_DISCOUNT':
        // Fallback volume discount logic
        const totalQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQty >= 10) {
          discount = subtotal * 0.1; // 10% for 10+ items
        } else if (totalQty >= 5) {
          discount = subtotal * 0.05; // 5% for 5+ items
        }
        break;
      default:
        discount = 0;
    }

    // Apply maximum discount limit if set
    if (coupon.maxDiscount) {
      discount = Math.min(discount, parseFloat(coupon.maxDiscount.toString()));
    }

    // Don't exceed subtotal
    return Math.min(discount, subtotal);
  };

  const handleCouponSelect = async (coupon: Promotion | null) => {
    if (coupon) {
      setCouponCode(coupon.code);
      setAppliedCoupon(coupon);
      setCouponStatus('valid');

      // Calculate and apply discount
      const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const calculatedDiscount = await calculateCouponDiscount(coupon, subtotal, shippingAmount);
      setDiscountAmount(calculatedDiscount);

      toast.success(`Coupon "${coupon.code}" applied! Discount: $${calculatedDiscount.toFixed(2)}`);
    } else {
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponStatus('idle');
      setDiscountAmount(0);
    }
    setCouponSearchOpen(false);
  };

  const handleValidateCoupon = async () => {
    if (!couponCode) return;
    setCouponStatus('checking');
    setAppliedCoupon(null);
    try {
      const res = await api.validateCoupon(couponCode);
      if (res.success && res.data) {
        handleCouponSelect(res.data);
      } else {
        setCouponStatus('invalid');
        setAppliedCoupon(null);
        setDiscountAmount(0);
        toast.error(res.error || 'Invalid or expired coupon code');
      }
    } catch (e: any) {
      setCouponStatus('invalid');
      setAppliedCoupon(null);
      setDiscountAmount(0);
      toast.error(e.message || 'Invalid or expired coupon code');
    }
  };

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Recalculate discount when subtotal changes and coupon is applied
  useEffect(() => {
    const recalculateDiscount = async () => {
      if (appliedCoupon && subtotal > 0) {
        const newDiscount = await calculateCouponDiscount(appliedCoupon, subtotal, shippingAmount);
        // Fix floating point precision for discount
        setDiscountAmount(Math.round(newDiscount * 100) / 100);
      }
    };

    recalculateDiscount();
  }, [subtotal, shippingAmount, appliedCoupon]);

  // Recalculate shipping when subtotal changes and shipping address is available
  useEffect(() => {
    if (selectedShippingAddress && subtotal > 0) {
      fetchApplicableShippingRate(selectedShippingAddress, subtotal);
    }
  }, [subtotal, selectedShippingAddress]);

  // Recalculate tax when subtotal, discount, or shipping changes and tax rate is available
  useEffect(() => {
    if (applicableTaxRate && subtotal > 0) {
      // Tax should be calculated on (subtotal - discount + shipping) to match backend
      const taxableAmount = subtotal - discountAmount + shippingAmount;
      const calculatedTax = taxableAmount * (applicableTaxRate.rate / 100);
      // Fix floating point precision issues
      setTaxAmount(Math.round(calculatedTax * 100) / 100);
    }
  }, [subtotal, discountAmount, shippingAmount, applicableTaxRate]);

  // Fix floating point precision for total calculation
  const totalAmount = Math.round((subtotal - discountAmount + shippingAmount + taxAmount) * 100) / 100;

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (!billingAddressId || !shippingAddressId) {
      toast.error('Please select billing and shipping addresses');
      return;
    }

    if (billingAddressId === 'new' || shippingAddressId === 'new') {
      toast.error('Please save new addresses before creating order');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Validate inventory availability one final time
    for (const item of orderItems) {
      if (!item.variant?.inventory) {
        toast.error('Invalid product variant');
        return;
      }

      const totalAvailable = item.variant.inventory.reduce((sum, inv) =>
        sum + Math.max(0, inv.quantity - inv.reservedQty), 0);

      if (item.quantity > totalAvailable) {
        toast.error(`Not enough stock available for ${item.variant.product?.name} - ${item.variant.name}`);
        return;
      }
    }

    try {
      setLoading(true);

      const orderData = {
        customerId: selectedCustomer.id,
        billingAddressId: billingAddressId,
        shippingAddressId: shippingAddressId,
        items: orderItems.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice).toFixed(2),
        })),
        discountAmount: Number(discountAmount).toFixed(2),
        shippingAmount: Number(shippingAmount).toFixed(2),
        taxAmount: Number(taxAmount).toFixed(2),
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      };

      const response = await api.createOrder(orderData);

      if (response.success) {
        // Add note if provided
        if (notes.trim() && response.data) {
          await api.addOrderNote(response.data.id, notes.trim());
        }

        toast.success('Order created successfully');
        resetForm();
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Failed to create order:', error);

      // Show specific validation errors if available
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        toast.error(`Validation failed: ${validationErrors.map((e: any) => e.msg).join(', ')}`);
      } else {
        toast.error(error?.message || 'Failed to create order');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedCustomer(null);
    setSelectedBillingAddress(null);
    setSelectedShippingAddress(null);
    setOrderItems([]);
    setDiscountAmount(0);
    setShippingAmount(0);
    setTaxAmount(0);
    setNotes('');
    setCouponCode('');
    setCouponStatus('idle');
    setAppliedCoupon(null);
    setCouponSearchOpen(false);
    setCustomerSearchOpen(false);
    setCustomerSearchTerm('');
    setEditingBillingAddress(null);
    setEditingShippingAddress(null);
    setBillingAddressForm({});
    setShippingAddressForm({});
    setIsCreatingBillingAddress(false);
    setIsCreatingShippingAddress(false);
    setApplicableTaxRate(null);
    setTaxRateLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canProceedToStep2 = selectedCustomer && selectedBillingAddress && selectedShippingAddress;
  const canProceedToStep3 = orderItems.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={cn(
          "sm:max-w-[900px] flex flex-col bg-background text-foreground",
          customerSearchOpen ? "h-[95vh] max-h-[95vh]" : "h-auto max-h-[85vh]"
        )}>
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle>Create New Order</DialogTitle>
            <DialogDescription>
              Follow the steps to create a new order
            </DialogDescription>
          </DialogHeader>

          <div className={cn(
            "overflow-y-auto",
            customerSearchOpen ? "flex-1 min-h-0" : "flex-1 overflow-y-auto min-h-0"
          )}>
            <Tabs value={step.toString()} onValueChange={(value) => setStep(parseInt(value))}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="1" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="2" disabled={!canProceedToStep2} className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="3" disabled={!canProceedToStep3} className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Review
                </TabsTrigger>
              </TabsList>

              <TabsContent value="1" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Select Customer</CardTitle>
                    <CardDescription>Choose the customer for this order</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="relative customer-dropdown-container">
                        <Label htmlFor="customer">Customer</Label>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerSearchOpen}
                          className="w-full justify-between"
                          onClick={() => setCustomerSearchOpen(!customerSearchOpen)}
                        >
                          {selectedCustomer
                            ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} - ${selectedCustomer.email}`
                            : "Select a customer"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        {customerSearchOpen && (
                          <div
                            className="absolute z-[100] w-full bg-popover border rounded-md shadow-lg"
                            style={{
                              top: 'calc(100% + 4px)',
                              maxHeight: 'calc(95vh - 200px)',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden'
                            }}
                          >
                            <div className="flex-shrink-0 border-b p-2">
                              <Input
                                placeholder="Search customers by name, email, or phone..."
                                value={customerSearchTerm}
                                onChange={(e) => {
                                  setCustomerSearchTerm(e.target.value);
                                }}
                                className="h-9"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setCustomerSearchOpen(false);
                                  }
                                }}
                              />
                            </div>
                            <div
                              className="customer-list-scroll flex-1"
                              style={{
                                minHeight: 0,
                                overflowY: 'scroll',
                                overflowX: 'hidden'
                              }}
                            >
                              {filteredCustomers.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  {customerSearchTerm ? `No customers found for "${customerSearchTerm}"` : 'No customers found.'}
                                </div>
                              ) : (
                                <div className="p-1">
                                  {filteredCustomers.map((customer) => (
                                    <div
                                      key={customer.id}
                                      onClick={() => handleCustomerSelect(customer.id)}
                                      className={cn(
                                        "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                        selectedCustomer?.id === customer.id && "bg-accent text-accent-foreground"
                                      )}
                                    >
                                      <Check
                                        className={cn(
                                          "h-4 w-4",
                                          selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium">
                                          {customer.firstName} {customer.lastName}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          {customer.email} {customer.mobile && `• ${customer.mobile}`}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {customerLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Loading customer details...</p>
                          </div>
                        </div>
                      ) : selectedCustomer && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-4">
                            <h3 className="font-medium">Billing Address</h3>
                            {billingAddressOptions.length > 0 && (
                              <div className="space-y-2">
                                <Label htmlFor="billing-address-select">Select saved billing address</Label>
                                <Select value={billingAddressId} onValueChange={handleBillingSelect}>
                                  <SelectTrigger
                                    id="billing-address-select"
                                    className="w-full items-start text-left whitespace-normal break-words leading-tight min-h-[48px]"
                                  >
                                    <SelectValue placeholder="Choose an address" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px] overflow-y-auto w-[min(22rem,calc(100vw-2rem))]">
                                    {billingAddressOptions.map((address) => (
                                      <SelectItem
                                        key={address.id}
                                        value={address.id}
                                        className="whitespace-normal break-words leading-tight py-2 text-sm"
                                      >
                                        {formatAddressLabel(address)}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="new" className="whitespace-normal break-words leading-tight py-2 text-sm">
                                      + Add new address
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="billing-firstName">
                                    First Name <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="billing-firstName"
                                    value={billingAddressForm.firstName || ''}
                                    onChange={(e) => setBillingAddressForm({ ...billingAddressForm, firstName: e.target.value })}
                                    placeholder="Enter first name"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="billing-lastName">
                                    Last Name <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="billing-lastName"
                                    value={billingAddressForm.lastName || ''}
                                    onChange={(e) => setBillingAddressForm({ ...billingAddressForm, lastName: e.target.value })}
                                    placeholder="Enter last name"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="billing-address1">
                                  Address Line 1 <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="billing-address1"
                                  value={billingAddressForm.address1 || ''}
                                  onChange={(e) => setBillingAddressForm({ ...billingAddressForm, address1: e.target.value })}
                                  placeholder="Enter address"
                                />
                              </div>
                              <div>
                                <Label htmlFor="billing-address2">Address Line 2 (Optional)</Label>
                                <Input
                                  id="billing-address2"
                                  value={billingAddressForm.address2 || ''}
                                  onChange={(e) => setBillingAddressForm({ ...billingAddressForm, address2: e.target.value })}
                                  placeholder="Apartment, suite, etc."
                                />
                              </div>
                              <div>
                                <Label htmlFor="billing-country">
                                  Country <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                  value={billingAddressForm.country || "United States"}
                                  onValueChange={(value) => {
                                    setBillingAddressForm(prev => ({ ...prev, country: value, state: '', city: '' }));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {billingAddressForm.country && !customCountries.includes(billingAddressForm.country) && (
                                      <SelectItem value={billingAddressForm.country}>{billingAddressForm.country}</SelectItem>
                                    )}
                                    {customCountries.map((country) => (
                                      <SelectItem key={country} value={country}>
                                        {country}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="billing-state">
                                  State <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                  value={billingAddressForm.state || ''}
                                  onValueChange={(value) => {
                                    if (value === '__add_new__') {
                                      handleAddLocation('billing', 'state');
                                      return;
                                    }
                                    setBillingAddressForm(prev => ({ ...prev, state: value, city: '' }));
                                  }}
                                  disabled={!billingAddressForm.country}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select state" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__add_new__" className="text-blue-600 font-medium">+ Add New State</SelectItem>
                                    {billingAddressForm.state && !customBillingStates.includes(billingAddressForm.state) && (
                                      <SelectItem value={billingAddressForm.state}>{billingAddressForm.state}</SelectItem>
                                    )}
                                    {customBillingStates.map((state) => (
                                      <SelectItem key={state} value={state}>
                                        {state}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="billing-city">
                                  City <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                  value={billingAddressForm.city || ''}
                                  onValueChange={(value) => {
                                    if (value === '__add_new__') {
                                      handleAddLocation('billing', 'city');
                                      return;
                                    }
                                    setBillingAddressForm(prev => ({ ...prev, city: value }));
                                  }}
                                  disabled={!billingAddressForm.state}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select city" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__add_new__" className="text-blue-600 font-medium">+ Add New City</SelectItem>
                                    {billingAddressForm.city && !customBillingCities.includes(billingAddressForm.city) && (
                                      <SelectItem value={billingAddressForm.city}>{billingAddressForm.city}</SelectItem>
                                    )}
                                    {customBillingCities.map((city) => (
                                      <SelectItem key={city} value={city}>
                                        {city}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="billing-postalCode">
                                  Postal Code <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="billing-postalCode"
                                  value={billingAddressForm.postalCode || ''}
                                  onChange={(e) => setBillingAddressForm({ ...billingAddressForm, postalCode: e.target.value })}
                                  placeholder="Enter postal code"
                                />
                              </div>
                              <div>
                                <Label htmlFor="billing-phone">
                                  Phone Number <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex gap-2">
                                  <Select
                                    value={Country.getAllCountries().find(c => c.name === (billingAddressForm.country || "United States"))?.isoCode || "US"}
                                    onValueChange={(value) => {
                                      const countryName = Country.getAllCountries().find(c => c.isoCode === value)?.name || "United States";
                                      setBillingAddressForm(prev => ({ ...prev, country: countryName, state: '', city: '' }));
                                    }}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Country.getAllCountries().map((country) => (
                                        <SelectItem key={country.isoCode} value={country.isoCode}>
                                          {country.flag} {country.phonecode}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    id="billing-phone"
                                    value={billingAddressForm.phone || ''}
                                    onChange={(e) => setBillingAddressForm({ ...billingAddressForm, phone: sanitizePhone(e.target.value) })}
                                    placeholder="Enter phone number"
                                    className="flex-1"
                                    inputMode="numeric"
                                    pattern="\\d{10}"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 pt-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleSaveBillingAddress}
                                  disabled={loading}
                                >
                                  Save Address
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium">Shipping Address</h3>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id="same-as-billing"
                                  checked={sameAsBilling}
                                  onCheckedChange={handleSameAsBillingChange}
                                  aria-label="Toggle same as billing"
                                />
                                <Label htmlFor="same-as-billing" className="text-sm cursor-pointer select-none">
                                  Same as billing
                                </Label>
                              </div>
                            </div>
                            {shippingAddressOptions.length > 0 && (
                              <div className="space-y-2">
                                <Label htmlFor="shipping-address-select">Select saved shipping address</Label>
                                <Select value={shippingAddressId} onValueChange={handleShippingSelect} disabled={sameAsBilling}>
                                  <SelectTrigger
                                    id="shipping-address-select"
                                    className="w-full items-start text-left whitespace-normal break-words leading-tight min-h-[48px]"
                                  >
                                    <SelectValue placeholder="Choose an address" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px] overflow-y-auto w-[min(22rem,calc(100vw-2rem))]">
                                    {shippingAddressOptions.map((address) => (
                                      <SelectItem
                                        key={address.id}
                                        value={address.id}
                                        className="whitespace-normal break-words leading-tight py-2 text-sm"
                                      >
                                        {formatAddressLabel(address)}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="new" className="whitespace-normal break-words leading-tight py-2 text-sm">
                                      + Add new address
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="shipping-firstName">
                                    First Name <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="shipping-firstName"
                                    value={shippingAddressForm.firstName || ''}
                                    onChange={(e) => setShippingAddressForm({ ...shippingAddressForm, firstName: e.target.value })}
                                    placeholder="Enter first name"
                                    disabled={sameAsBilling}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="shipping-lastName">
                                    Last Name <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="shipping-lastName"
                                    value={shippingAddressForm.lastName || ''}
                                    onChange={(e) => setShippingAddressForm({ ...shippingAddressForm, lastName: e.target.value })}
                                    placeholder="Enter last name"
                                    disabled={sameAsBilling}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="shipping-address1">
                                  Address Line 1 <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="shipping-address1"
                                  value={shippingAddressForm.address1 || ''}
                                  onChange={(e) => setShippingAddressForm({ ...shippingAddressForm, address1: e.target.value })}
                                  placeholder="Enter address"
                                  disabled={sameAsBilling}
                                />
                              </div>
                              <div>
                                <Label htmlFor="shipping-address2">Address Line 2 (Optional)</Label>
                                <Input
                                  id="shipping-address2"
                                  value={shippingAddressForm.address2 || ''}
                                  onChange={(e) => setShippingAddressForm({ ...shippingAddressForm, address2: e.target.value })}
                                  placeholder="Apartment, suite, etc."
                                  disabled={sameAsBilling}
                                />
                              </div>
                              <div>
                                <Label htmlFor="shipping-country">
                                  Country <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                  value={shippingAddressForm.country || "United States"}
                                  onValueChange={(value) => {
                                    setShippingAddressForm(prev => ({ ...prev, country: value, state: '', city: '' }));
                                  }}
                                  disabled={sameAsBilling}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {shippingAddressForm.country && !customCountries.includes(shippingAddressForm.country) && (
                                      <SelectItem value={shippingAddressForm.country}>{shippingAddressForm.country}</SelectItem>
                                    )}
                                    {customCountries.map((country) => (
                                      <SelectItem key={country} value={country}>
                                        {country}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="shipping-state">
                                  State <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                  value={shippingAddressForm.state || ''}
                                  onValueChange={(value) => {
                                    if (value === '__add_new__') {
                                      handleAddLocation('shipping', 'state');
                                      return;
                                    }
                                    setShippingAddressForm(prev => ({ ...prev, state: value, city: '' }));
                                  }}
                                  disabled={sameAsBilling || !shippingAddressForm.country}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select state" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__add_new__" className="text-blue-600 font-medium">+ Add New State</SelectItem>
                                    {shippingAddressForm.state && !customShippingStates.includes(shippingAddressForm.state) && (
                                      <SelectItem value={shippingAddressForm.state}>{shippingAddressForm.state}</SelectItem>
                                    )}
                                    {customShippingStates.map((state) => (
                                      <SelectItem key={state} value={state}>
                                        {state}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="shipping-city">
                                  City <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                  value={shippingAddressForm.city || ''}
                                  onValueChange={(value) => {
                                    if (value === '__add_new__') {
                                      handleAddLocation('shipping', 'city');
                                      return;
                                    }
                                    setShippingAddressForm(prev => ({ ...prev, city: value }));
                                  }}
                                  disabled={sameAsBilling || !shippingAddressForm.state}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select city" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__add_new__" className="text-blue-600 font-medium">+ Add New City</SelectItem>
                                    {shippingAddressForm.city && !customShippingCities.includes(shippingAddressForm.city) && (
                                      <SelectItem value={shippingAddressForm.city}>{shippingAddressForm.city}</SelectItem>
                                    )}
                                    {customShippingCities.map((city) => (
                                      <SelectItem key={city} value={city}>
                                        {city}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="shipping-postalCode">
                                  Postal Code <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="shipping-postalCode"
                                  value={shippingAddressForm.postalCode || ''}
                                  onChange={(e) => setShippingAddressForm({ ...shippingAddressForm, postalCode: e.target.value })}
                                  placeholder="Enter postal code"
                                  disabled={sameAsBilling}
                                />
                              </div>
                              <div>
                                <Label htmlFor="shipping-phone">
                                  Phone Number <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex gap-2">
                                  <Select
                                    value={Country.getAllCountries().find(c => c.name === (shippingAddressForm.country || "United States"))?.isoCode || "US"}
                                    onValueChange={(value) => {
                                      const countryName = Country.getAllCountries().find(c => c.isoCode === value)?.name || "United States";
                                      setShippingAddressForm(prev => ({ ...prev, country: countryName, state: '', city: '' }));
                                    }}
                                    disabled={sameAsBilling}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Country.getAllCountries().map((country) => (
                                        <SelectItem key={country.isoCode} value={country.isoCode}>
                                          {country.flag} {country.phonecode}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    id="shipping-phone"
                                    value={shippingAddressForm.phone || ''}
                                    onChange={(e) => setShippingAddressForm({ ...shippingAddressForm, phone: sanitizePhone(e.target.value) })}
                                    placeholder="Enter phone number"
                                    className="flex-1"
                                    inputMode="numeric"
                                    pattern="\\d{10}"
                                    disabled={sameAsBilling}
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 pt-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleSaveShippingAddress}
                                  disabled={loading}
                                >
                                  Save Address
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={() => setStep(2)}
                        disabled={!canProceedToStep2}
                      >
                        Next: Add Products
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="2" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Products</CardTitle>
                    <CardDescription>Search and add products to the order</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="grid gap-4 max-h-60 overflow-y-auto">
                      {filteredProducts.map((product) => (
                        <div key={product.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{product.name}</h4>
                              <p className="text-sm text-muted-foreground">{product.description}</p>
                            </div>
                            <Badge variant="outline">{product.variants?.length || 0} variants</Badge>
                          </div>

                          {product.variants && product.variants.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {product.variants.map((variant) => {
                                // Debug logging
                                console.log('Rendering variant:', variant.name, 'inventory:', variant.inventory);

                                const totalAvailable = variant.inventory?.reduce((sum, inv) => {
                                  const available = Math.max(0, (inv.quantity || 0) - (inv.reservedQty || 0));
                                  console.log(`Location ${inv.locationId}: quantity=${inv.quantity}, reservedQty=${inv.reservedQty}, available=${available}`);
                                  return sum + available;
                                }, 0) || 0;

                                console.log('Total available for display:', totalAvailable);

                                // Get segment-specific price for display
                                // Map B2B to B2C and ENTERPRISE_2 to ENTERPRISE_1 for pricing
                                const effectiveCustomerType = selectedCustomer?.customerType === 'B2B'
                                  ? 'B2C'
                                  : selectedCustomer?.customerType === 'ENTERPRISE_2'
                                    ? 'ENTERPRISE_1'
                                    : selectedCustomer?.customerType;

                                const segmentPrice = effectiveCustomerType && variant.segmentPrices?.find(
                                  sp => sp.customerType === effectiveCustomerType
                                );

                                const displayPrice = segmentPrice
                                  ? (segmentPrice.salePrice || segmentPrice.regularPrice)
                                  : (variant.salePrice || variant.regularPrice);

                                // Get customer type display name
                                const customerTypeName = selectedCustomer?.customerType
                                  ? getCustomerTypeDisplayName(selectedCustomer.customerType)
                                  : '';

                                const priceText = segmentPrice && customerTypeName
                                  ? `$${displayPrice} (${customerTypeName} price)`
                                  : `$${displayPrice}`;

                                return (
                                  <div key={variant.id} className="flex items-center justify-between p-2 border rounded">
                                    <div className="flex-1">
                                      <div className="font-medium">{variant.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        SKU: {variant.sku} • {priceText}
                                        <span className="ml-2">
                                          {totalAvailable > 0 ? (
                                            <Badge variant="outline" className="ml-2">
                                              {totalAvailable} in stock
                                            </Badge>
                                          ) : (
                                            <Badge variant="destructive" className="ml-2">
                                              Out of stock
                                            </Badge>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddOrderItem(variant)}
                                      disabled={totalAvailable <= 0 || orderItems.some(item => item.variantId === variant.id)}
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setStep(1)}>
                        Back
                      </Button>
                      <Button
                        onClick={() => setStep(3)}
                        disabled={!canProceedToStep3}
                      >
                        Next: Review Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="3" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Review Order</CardTitle>
                    <CardDescription>Review and finalize the order details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Order Items */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Order Items</h4>
                      {orderItems.map((item) => {
                        // Get product name - try multiple sources
                        let productName = 'Product';
                        if (item.variant?.product?.name) {
                          productName = item.variant.product.name;
                        } else if (item.variant?.productId) {
                          const foundProduct = products.find(p => p.id === item.variant?.productId);
                          if (foundProduct?.name) {
                            productName = foundProduct.name;
                          }
                        }

                        // Also try to find product by checking all products and their variants
                        if (productName === 'Product') {
                          for (const product of products) {
                            const variant = product.variants?.find(v => v.id === item.variantId);
                            if (variant && product.name) {
                              productName = product.name;
                              break;
                            }
                          }
                        }

                        const variantName = item.variant?.name || 'Unknown Variant';

                        // Check for bulk pricing
                        const bulkPrices = item.variant?.bulkPrices;
                        let hasBulkPrice = false;
                        let bulkPrice = 0;

                        if (bulkPrices && Array.isArray(bulkPrices)) {
                          const applicableBulk = bulkPrices.find((bp: any) => {
                            const minQty = Number(bp.minQty);
                            const maxQty = bp.maxQty ? Number(bp.maxQty) : Infinity;
                            return item.quantity >= minQty && item.quantity <= maxQty;
                          });

                          if (applicableBulk) {
                            hasBulkPrice = true;
                            bulkPrice = Number(applicableBulk.price);
                          }
                        }

                        const displayPrice = hasBulkPrice ? bulkPrice : item.unitPrice;
                        const savings = hasBulkPrice ? (item.unitPrice - bulkPrice) * item.quantity : 0;

                        return (
                          <div key={item.variantId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded">
                            <div className="flex-1">
                              <div className="font-medium">
                                {productName} - {variantName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.variant?.sku && `SKU: ${item.variant.sku}`}
                              </div>
                              {hasBulkPrice && (
                                <div className="mt-1">
                                  <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                                    Bulk Price Applied
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(item.variantId, parseInt(e.target.value) || 0)}
                                className="w-16 text-center"
                                min="1"
                              />
                              <span className="text-sm">×</span>
                              {hasBulkPrice ? (
                                <div className="text-right min-w-[80px]">
                                  <div className="text-sm font-medium text-green-600">${bulkPrice.toFixed(2)}</div>
                                  <div className="text-xs text-muted-foreground line-through">${item.unitPrice.toFixed(2)}</div>
                                </div>
                              ) : (
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdatePrice(item.variantId, parseFloat(e.target.value) || 0)}
                                  className="w-20 text-center"
                                  min="0"
                                  step="0.01"
                                />
                              )}
                              <div className="text-right min-w-[80px]">
                                <span className="text-sm font-medium">${(item.totalPrice || 0).toFixed(2)}</span>
                                {hasBulkPrice && savings > 0 && (
                                  <div className="text-xs text-green-600">Save ${savings.toFixed(2)}</div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveOrderItem(item.variantId)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Summary */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Order Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Discount:</span>
                          <Input
                            type="number"
                            value={discountAmount.toFixed(2)}
                            onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                            className="w-24 text-right"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span>Shipping:</span>
                              {applicableShippingRate && (
                                <span className="text-xs text-muted-foreground">
                                  {applicableShippingRate.reason}
                                </span>
                              )}
                              {shippingRateLoading && (
                                <span className="text-xs text-muted-foreground">Loading shipping rate...</span>
                              )}
                              {!applicableShippingRate && !shippingRateLoading && selectedShippingAddress && (
                                <span className="text-xs text-muted-foreground">No shipping rate found</span>
                              )}
                            </div>
                            <Input
                              type="number"
                              value={shippingAmount.toFixed(2)}
                              onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                              className="w-24 text-right"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span>Tax:</span>
                              {applicableTaxRate && (
                                <span className="text-xs text-muted-foreground">
                                  {applicableTaxRate.country}{applicableTaxRate.state ? `, ${applicableTaxRate.state}` : ''} - {applicableTaxRate.rate}% ({applicableTaxRate.type})
                                </span>
                              )}
                              {taxRateLoading && (
                                <span className="text-xs text-muted-foreground">Loading tax rate...</span>
                              )}
                              {!applicableTaxRate && !taxRateLoading && selectedShippingAddress && (
                                <span className="text-xs text-muted-foreground">No tax rate found</span>
                              )}
                            </div>
                            <Input
                              type="number"
                              value={taxAmount.toFixed(2)}
                              onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                              className="w-24 text-right"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between font-medium text-lg pt-2 border-t">
                          <span>Total:</span>
                          <span>${totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Order Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any notes about this order..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Coupon Code</Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Popover open={couponSearchOpen} onOpenChange={setCouponSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={couponSearchOpen}
                              className="w-48 justify-between"
                            >
                              {appliedCoupon ? appliedCoupon.code : "Select coupon..."}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0">
                            <Command>
                              <CommandInput placeholder="Search coupons..." />
                              <CommandEmpty>No coupons found.</CommandEmpty>
                              <CommandGroup>
                                {availableCoupons.map((coupon) => {
                                  // Simple discount calculation for display (not async)
                                  let discount = 0;

                                  // --- Coupon Viability (Visibility) Check ---
                                  // Check if coupon is restricted to specific customers
                                  const isPrivate = coupon.isForIndividualCustomer || (coupon.specificCustomers && coupon.specificCustomers.length > 0);

                                  // If private, it is ONLY visible if the correct customer is selected
                                  const isCustomerAllowed = !isPrivate || (selectedCustomer && coupon.specificCustomers?.some(sc => sc.customerId === selectedCustomer.id));

                                  if (!isCustomerAllowed) {
                                    return null;
                                  }
                                  // -------------------------------------------

                                  const isEligible = !coupon.minOrderAmount || subtotal >= parseFloat(coupon.minOrderAmount.toString());

                                  if (isEligible) {
                                    switch (coupon.type) {
                                      case 'PERCENTAGE':
                                        discount = subtotal * (parseFloat(coupon.value.toString()) / 100);
                                        break;
                                      case 'FIXED_AMOUNT':
                                        discount = parseFloat(coupon.value.toString());
                                        break;
                                      case 'FREE_SHIPPING':
                                        discount = shippingAmount;
                                        break;
                                      case 'BOGO':
                                        discount = subtotal * 0.25; // Estimated discount for display
                                        break;
                                      case 'VOLUME_DISCOUNT':
                                        discount = subtotal * 0.1; // Estimated discount for display
                                        break;
                                    }

                                    if (coupon.maxDiscount) {
                                      discount = Math.min(discount, parseFloat(coupon.maxDiscount.toString()));
                                    }
                                    discount = Math.min(discount, subtotal);
                                  }

                                  return (
                                    <CommandItem
                                      key={coupon.id}
                                      value={coupon.code}
                                      onSelect={() => handleCouponSelect(coupon)}
                                      disabled={!isEligible}
                                      className={!isEligible ? 'opacity-50' : ''}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${appliedCoupon?.id === coupon.id ? "opacity-100" : "opacity-0"
                                          }`}
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{coupon.code}</span>
                                          <span className="text-sm text-green-600">
                                            {isEligible ? (
                                              coupon.type === 'BOGO' ? (
                                                <div className="text-right">
                                                  <div>{`~$${discount.toFixed(2)}`}</div>
                                                  <div className="text-xs text-gray-500">
                                                    {(() => {
                                                      const totalQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);
                                                      const buyQty = (coupon as any).buyQuantity || 2;
                                                      const getQty = (coupon as any).getQuantity || 1;
                                                      const freeItems = Math.floor(totalQty / buyQty) * getQty;
                                                      return `${freeItems} free item${freeItems !== 1 ? 's' : ''}`;
                                                    })()}
                                                  </div>
                                                </div>
                                              ) : coupon.type === 'VOLUME_DISCOUNT' ? (
                                                `~$${discount.toFixed(2)}`
                                              ) : (
                                                `-$${discount.toFixed(2)}`
                                              )
                                            ) : 'Not eligible'}
                                          </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          {coupon.name}
                                          {coupon.minOrderAmount && (
                                            <span className="ml-2">
                                              (Min: ${parseFloat(coupon.minOrderAmount.toString()).toFixed(2)})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <div className="flex-1">
                          <Input
                            ref={couponInputRef}
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value)}
                            placeholder="Or enter coupon code"
                            className="w-full"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleValidateCoupon}
                          disabled={couponStatus === 'checking' || !couponCode}
                        >
                          {couponStatus === 'checking' ? 'Checking...' : 'Apply'}
                        </Button>

                        {appliedCoupon && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleCouponSelect(null)}
                            size="sm"
                          >
                            Clear
                          </Button>
                        )}
                      </div>

                      {couponStatus === 'valid' && appliedCoupon && (
                        <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
                          <div className="font-medium">✓ Coupon applied: {appliedCoupon.code}</div>
                          <div>{appliedCoupon.name}</div>
                          <div>Discount: ${discountAmount.toFixed(2)}</div>

                          {appliedCoupon.type === 'BOGO' && (
                            <div className="mt-1 text-blue-600">
                              {(() => {
                                const totalQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);
                                const buyQty = (appliedCoupon as any).buyQuantity || 2;
                                const getQty = (appliedCoupon as any).getQuantity || 1;
                                const freeItems = Math.floor(totalQty / buyQty) * getQty;
                                const nextFreeAt = Math.ceil(totalQty / buyQty) * buyQty;

                                return (
                                  <div>
                                    <div>🎁 {freeItems} free item{freeItems !== 1 ? 's' : ''} earned</div>
                                    {freeItems === 0 && (
                                      <div className="text-orange-600">
                                        Add {buyQty - totalQty} more item{buyQty - totalQty !== 1 ? 's' : ''} to get {getQty} free
                                      </div>
                                    )}
                                    {freeItems > 0 && totalQty < nextFreeAt && (
                                      <div className="text-gray-600">
                                        Add {nextFreeAt - totalQty} more for next free item
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {appliedCoupon.minOrderAmount && subtotal < parseFloat(appliedCoupon.minOrderAmount.toString()) && (
                            <div className="text-orange-600">
                              Add ${(parseFloat(appliedCoupon.minOrderAmount.toString()) - subtotal).toFixed(2)} more to qualify
                            </div>
                          )}
                        </div>
                      )}

                      {couponStatus === 'invalid' && (
                        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                          Invalid or expired coupon code
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setStep(2)}>
                        Back
                      </Button>
                      <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Creating Order...' : 'Create Order'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={addLocationDialog.open} onOpenChange={(open) => !open && setAddLocationDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {addLocationDialog.type === 'state' ? 'State' : 'City'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder={`Enter ${addLocationDialog.type} name`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLocationDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button onClick={handleSaveLocation} disabled={savingLocation}>
              {savingLocation ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
