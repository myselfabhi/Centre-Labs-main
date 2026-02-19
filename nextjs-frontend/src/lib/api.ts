import { toast } from "sonner";

// Ensure base URL always ends with /api so /auth/login etc. resolve to /api/auth/login
function normalizeApiBaseUrl(url: string): string {
  const u = url.replace(/\/+$/, "");
  return u.endsWith("/api") ? u : `${u}/api`;
}
const API_BASE_URL =
  typeof window === "undefined"
    ? normalizeApiBaseUrl(process.env.SERVER_API_URL || "http://api:3001")
    : normalizeApiBaseUrl(
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      );

// Types for API responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats?: any;
}

export interface PaginatedData<T> {
  items?: T[];
  users?: T[];
  customers?: T[];
  products?: T[];
  orders?: T[];
  collections?: T[];
  data?: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  type:
  | "PERCENTAGE"
  | "FIXED_AMOUNT"
  | "FREE_SHIPPING"
  | "BOGO"
  | "VOLUME_DISCOUNT";
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
  isForIndividualCustomer?: boolean;
  specificCustomers?: Array<{ customerId: string }>;
  createdAt: string;
  updatedAt: string;
}

export type ThirdPartyReportCategory = "PURITY" | "ENDOTOXICITY" | "STERILITY";

export interface ThirdPartyReport {
  id: string;
  category: ThirdPartyReportCategory;
  name: string;
  description?: string | null;
  url?: string | null;
  previewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  products?: Array<{ id: string; name: string }>;
  variants?: Array<{ id: string; name: string; sku: string; productName?: string }>;
}

export interface TaxRate {
  id: string;
  country: string;
  state?: string;
  rate: number;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data?: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "MANAGER" | "STAFF" | "CUSTOMER" | "SALES_REP" | "SALES_MANAGER";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: Permission[];
  customerId?: string;
  customer?: {
    id: string;
    customerType: "B2C" | "B2B" | "ENTERPRISE_1" | "ENTERPRISE_2";
    isApproved: boolean;
    isActive: boolean;
  };
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  granted: boolean;
}

// Customer types
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  companyName?: string;
  licenseNumber?: string;
  email: string;
  mobile: string;
  city?: string;
  zip?: string;
  customerType: "B2C" | "B2B" | "ENTERPRISE_1" | "ENTERPRISE_2";
  isActive: boolean;
  isApproved: boolean;
  emailVerified: boolean;
  mobileVerified?: boolean;
  approvalStatus?: "PENDING" | "APPROVED" | "DEACTIVATED";
  createdAt: string;
  updatedAt: string;
  addresses?: Address[];
  customerTags?: CustomerTag[];
  salesAssignments?: SalesRepCustomerAssignment[];
  salesManagerAssignments?: SalesManagerCustomerAssignment[];
  _count?: {
    orders: number;
    addresses: number;
    reviews: number;
  };
}

export interface SalesRepCustomerAssignment {
  id: string;
  salesRepId: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
  salesRep?: {
    id: string;
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export interface SalesRepPerformanceMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  assignedCustomers: number;
  activeCustomers: number;
  conversionRate: number;
}

export interface SalesRepPerformance {
  salesRepId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
  };
  metrics: SalesRepPerformanceMetrics;
  lastOrderDate?: string | null;
  monthlyPerformance: Array<{ month: string; revenue: number; orders: number }>;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    revenue: number;
    orders: number;
    lastOrderDate?: string | null;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    customerId: string;
    customerName: string;
    selectedPaymentType?: "ZELLE" | "BANK_WIRE" | "AUTHORIZE_NET" | null;
  }>;
}


export interface SalesManager {
  id: string;
  userId: string;
  user: User;
  salesReps?: { id: string, user: User }[];
  assignments?: SalesManagerCustomerAssignment[];
  _count?: {
    assignments: number;
    salesReps: number;
  };
}

export interface SalesManagerCustomerAssignment {
  id: string;
  salesManagerId: string;
  customerId: string;
  assignedAt: string;
  customer?: Customer;
  salesManager?: SalesManager;
}

export interface SalesRepPerformanceResponse {
  range: string;
  rangeDays: number;
  generatedAt: string;
  period?: {
    from: string;
    to: string;
  };
  totals: {
    totalRevenue: number;
    totalOrders: number;
    averageConversion: number;
    repsActive: number;
  };
  reps: SalesRepPerformance[];
}

export interface Address {
  id: string;
  customerId: string;
  type: "BILLING" | "SHIPPING";
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTag {
  id: string;
  tag: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description?: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  displayOrder?: number;
  isPopular?: boolean;
  shipstationSku?: string | null;
  createdAt: string;
  updatedAt: string;
  seoTitle?: string;
  seoDescription?: string;
  seoSlug?: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
  categories?: ProductCategory[];
  tags?: ProductTag[];
  thirdPartyReports?: ThirdPartyReport[];
  _count?: {
    variants: number;
    reviews: number;
  };
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  description?: string;
  sku: string;
  shipstationSku?: string | null;
  barcode?: string;
  regularPrice: number;
  salePrice?: number;
  costPrice?: number;
  weight?: number;
  hsn?: string;
  isActive: boolean;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  inventory?: {
    id: string;
    locationId: string;
    quantity: number;
    reservedQty: number;
  }[];
  variantOptions?: VariantOption[];
  segmentPrices?: {
    id: string;
    customerType: "B2C" | "B2B" | "ENTERPRISE_1" | "ENTERPRISE_2";
    regularPrice: number;
    salePrice?: number;
  }[];
  seoTitle?: string;
  seoDescription?: string;
  seoSlug?: string;
  thirdPartyReports?: ThirdPartyReport[];
}

export interface VariantOption {
  id: string;
  name: string;
  value: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  sortOrder: number;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface ProductTag {
  id: string;
  tag: string;
}

export interface Inventory {
  id: string;
  quantity: number;
  reservedQty: number;
  locationId: string;
  location?: {
    id: string;
    name: string;
  };
}

// Order types
export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  userId?: string;
  status:
  | "PENDING"
  | "PROCESSING"
  | "LABEL_CREATED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "ON_HOLD";
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  billingAddressId: string;
  shippingAddressId: string;
  selectedPaymentType?: "ZELLE" | "BANK_WIRE" | "AUTHORIZE_NET" | null;
  shipstationLabel?: any;
  salesChannelId?: string | null;
  partnerOrderId?: string | null;
  salesChannel?: {
    id: string;
    companyName: string;
    type: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  billingAddress?: Address;
  shippingAddress?: Address;
  items?: OrderItem[];
  payments?: Payment[];
  transactions?: Transaction[];
  shipments?: Shipment[];
  notes?: OrderNote[];
  auditLogs?: AuditLog[];
  _count?: {
    items: number;
    notes: number;
  };
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant?: ProductVariant & {
    product?: Product;
  };
}

export interface OrderNote {
  id: string;
  orderId: string;
  userId: string;
  note: string;
  isInternal: boolean;
  createdAt: string;
  user?: User;
}

export interface Payment {
  id: string;
  orderId: string;
  paymentMethod: string;
  status: string;
  amount: number;
  paidAt?: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  paymentGatewayName: string;
  paymentGatewayTransactionId?: string;
  paymentStatus: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  order?: Order;
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber?: string;
  status: string;
  shippedAt?: string;
}

export interface AuditLog {
  id: string;
  orderId?: string;
  userId: string;
  action: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: User;
}

// Token management
export const TOKEN_KEY = "auth_token";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
};

// Collection types
export interface Collection {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  products?: ProductCollection[];
  _count?: {
    products: number;
  };
}

export interface ProductCollection {
  id: string;
  collectionId: string;
  productId: string;
  sortOrder: number;
  product?: Product;
}

// Bulk Quote types
export interface BulkQuote {
  id: string;
  productId: string;
  customerId: string;
  quantity: number;
  notes?: string;
  isRead: boolean;
  readAt?: string;
  readBy?: string;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    images?: Array<{ url: string; altText?: string }>;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    customerType: string;
  };
  reader?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateBulkQuoteRequest {
  productId: string;
  customerId: string;
  quantity: number;
  notes?: string;
}

// API client class
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // ---------------------
  // Content management
  // ---------------------
  async getContentPages(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "SCHEDULED";
    type?:
    | "STATIC_PAGE"
    | "BLOG_POST"
    | "LEGAL_PAGE"
    | "LANDING_PAGE"
    | "PRODUCT_PAGE"
    | "CUSTOM_PAGE";
  }): Promise<
    ApiResponse<{
      pages: Array<{
        id: string;
        title: string;
        slug: string;
        status: string;
        pageType: string;
        views: number;
        author?: { id: string; firstName: string; lastName: string } | null;
        createdAt: string;
        updatedAt: string;
        publishedAt?: string | null;
      }>;
      pagination: { page: number; limit: number; total: number; pages: number };
    }>
  > {
    const qs = new URLSearchParams();
    if (params?.page) qs.append("page", String(params.page));
    if (params?.limit) qs.append("limit", String(params.limit));
    if (params?.search) qs.append("search", params.search);
    if (params?.status) qs.append("status", params.status);
    if (params?.type) qs.append("type", params.type);
    const query = qs.toString();
    return this.get(`/content/pages${query ? `?${query}` : ""}`);
  }

  async getContentPage(id: string): Promise<ApiResponse<any>> {
    return this.get(`/content/pages/${id}`);
  }

  async getPublicPageBySlug(
    slug: string,
    opts?: { preview?: boolean }
  ): Promise<ApiResponse<any>> {
    const s = slug.replace(/^\//, "");
    const q = opts?.preview ? "?preview=1" : "";
    return this.get(`/public-pages/${encodeURIComponent(s)}${q}`);
  }

  async getPreviewPageBySlug(slug: string): Promise<ApiResponse<any>> {
    const s = slug.replace(/^\//, "");
    return this.get(`/content/preview/${encodeURIComponent(s)}`);
  }

  // Navigation APIs (admin)
  async getNavigationMenus(): Promise<ApiResponse<{ menus: any[] }>> {
    return this.get(`/content/menus`);
  }
  async createNavigationMenu(data: {
    name: string;
    location: string;
    isActive?: boolean;
  }) {
    return this.post(`/content/menus`, data);
  }
  async updateNavigationMenu(
    id: string,
    data: { name?: string; location?: string; isActive?: boolean }
  ) {
    return this.put(`/content/menus/${id}`, data);
  }
  async deleteNavigationMenu(id: string) {
    return this.delete(`/content/menus/${id}`);
  }
  async getNavigationItems(menuId: string) {
    return this.get(`/content/menus/${menuId}/items`);
  }
  async createNavigationItem(
    menuId: string,
    data: {
      title: string;
      url?: string;
      pageId?: string;
      target?: string;
      order?: number;
      isActive?: boolean;
      parentId?: string;
    }
  ) {
    return this.post(`/content/menus/${menuId}/items`, data);
  }
  async updateNavigationItem(
    menuId: string,
    itemId: string,
    data: {
      title?: string;
      url?: string;
      pageId?: string;
      target?: string;
      order?: number;
      isActive?: boolean;
      parentId?: string;
    }
  ) {
    return this.put(`/content/menus/${menuId}/items/${itemId}`, data);
  }
  async deleteNavigationItem(menuId: string, itemId: string) {
    return this.delete(`/content/menus/${menuId}/items/${itemId}`);
  }
  async reorderNavigationItems(
    menuId: string,
    orders: Array<{ id: string; order: number }>
  ) {
    return this.request(`/content/menus/${menuId}/items/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ orders }),
    });
  }

  // Public Navigation (no auth)
  async getPublicNavigationMenus(params?: {
    location?: "main" | "footer";
  }): Promise<ApiResponse<{ menus: any[] }>> {
    const qs = new URLSearchParams();
    if (params?.location) qs.append("location", params.location);
    const q = qs.toString();
    return this.get(`/public-pages/navigation/menus${q ? `?${q}` : ""}`);
  }
  async getPublicFooter(): Promise<ApiResponse<any>> {
    return this.get(`/public-content/footer`);
  }

  // Admin Footer Settings
  async getFooterSettings(): Promise<ApiResponse<any>> {
    return this.get(`/content/footer`);
  }
  async updateFooterSettings(data: {
    siteTitle: string;
    siteDescription: string;
    facebookUrl?: string;
    twitterUrl?: string;
    instagramUrl?: string;
    sections: Array<{
      title: string;
      order?: number;
      links: Array<{
        title: string;
        href: string;
        target?: string;
        order?: number;
      }>;
    }>;
    contact?: {
      title?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
  }): Promise<ApiResponse<any>> {
    return this.put(`/content/footer`, data);
  }
  async getPublicNavigationItems(
    menuId: string
  ): Promise<ApiResponse<{ items: any[] }>> {
    return this.get(`/public-pages/navigation/menus/${menuId}/items`);
  }

  // Media
  async getMediaFiles(params?: { page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.page) qs.append("page", String(params.page));
    if (params?.limit) qs.append("limit", String(params.limit));
    const q = qs.toString();
    return this.get(`/content/media${q ? `?${q}` : ""}`);
  }
  async createMediaRecord(data: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    altText?: string;
    caption?: string;
    isPublic?: boolean;
    uploadedBy: string;
  }) {
    return this.post(`/content/media`, data);
  }
  async deleteMedia(id: string) {
    return this.delete(`/content/media/${id}`);
  }
  async updateMedia(
    id: string,
    data: { altText?: string; caption?: string; isPublic?: boolean }
  ) {
    return this.put(`/content/media/${id}`, data);
  }

  // Content dashboard stats
  async getContentStats() {
    return this.get(`/content/stats`);
  }

  // Site SEO settings
  async getSiteSeo() {
    return this.get(`/settings/seo`);
  }
  async updateSiteSeo(data: {
    siteName?: string;
    defaultTitle?: string;
    defaultDescription?: string;
    defaultKeywords?: string;
    defaultOgImageUrl?: string;
    allowIndexing?: boolean;
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    facebookPixelId?: string;
    additionalHeadTags?: string;
  }) {
    return this.put(`/settings/seo`, data);
  }

  // Content analytics (page views)
  async getPageAnalytics(params?: {
    rangeDays?: number;
    type?:
    | "ALL"
    | "STATIC_PAGE"
    | "BLOG_POST"
    | "LEGAL_PAGE"
    | "LANDING_PAGE"
    | "PRODUCT_PAGE"
    | "CUSTOM_PAGE";
  }) {
    const qs = new URLSearchParams();
    if (params?.rangeDays) qs.append("rangeDays", String(params.rangeDays));
    if (params?.type) qs.append("type", params.type);
    const q = qs.toString();
    return this.get(`/content/analytics/pages${q ? `?${q}` : ""}`);
  }
  async getPageAnalyticsById(id: string, params?: { rangeDays?: number }) {
    const qs = new URLSearchParams();
    if (params?.rangeDays) qs.append("rangeDays", String(params.rangeDays));
    const q = qs.toString();
    return this.get(`/content/analytics/pages/${id}${q ? `?${q}` : ""}`);
  }

  async createContentPage(data: {
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    contentFormat?: "HTML" | "MARKDOWN" | "RICH_TEXT";
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
    pageType?:
    | "STATIC_PAGE"
    | "BLOG_POST"
    | "LEGAL_PAGE"
    | "LANDING_PAGE"
    | "PRODUCT_PAGE"
    | "CUSTOM_PAGE";
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "SCHEDULED";
    isPublic?: boolean;
    allowComments?: boolean;
    authorId: string;
    tagIds?: string[];
  }): Promise<ApiResponse<any>> {
    return this.post("/content/pages", data);
  }

  async updateContentPage(
    id: string,
    data: Partial<{
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      contentFormat: "HTML" | "MARKDOWN" | "RICH_TEXT";
      metaTitle: string;
      metaDescription: string;
      metaKeywords: string;
      ogImage: string;
      pageType:
      | "STATIC_PAGE"
      | "BLOG_POST"
      | "LEGAL_PAGE"
      | "LANDING_PAGE"
      | "PRODUCT_PAGE"
      | "CUSTOM_PAGE";
      status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "SCHEDULED";
      isPublic: boolean;
      allowComments: boolean;
      authorId: string;
      tagIds: string[];
    }>
  ): Promise<ApiResponse<any>> {
    return this.put(`/content/pages/${id}`, data);
  }

  async deleteContentPage(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/content/pages/${id}`);
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config: RequestInit = {
        headers: this.getHeaders(),
        cache: 'no-store',
        ...options,
      };

      // First request
      let response = await fetch(url, config);
      // If 304 (Not Modified), retry once with cache-busting to avoid empty body
      if (response.status === 304) {
        const sep = url.includes('?') ? '&' : '?';
        const bustUrl = `${url}${sep}_=${Date.now()}`;
        response = await fetch(bustUrl, config);
      }

      let data: any = null;
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }

      // Check for 401 Unauthorized first
      if (response.status === 401) {
        // Avoid infinite loops: don't retry if the failed request was the refresh endpoint itself
        if (endpoint === '/auth/refresh') {
          removeToken();
          return { success: false, error: data?.error || "Session expired" } as any;
        }

        // Check if it's an approval error from the backend - don't refresh for this
        if (
          data?.error &&
          (data.error.includes("pending for approval") ||
            data.error.includes("pending approval") ||
            data.error.includes("wait for approval") ||
            data.error.includes("verify your email"))
        ) {
          removeToken();
          return {
            success: false,
            error: data.error,
          } as any;
        }

        // Attempt to refresh token
        try {
          const refreshToken = getToken();
          if (refreshToken) {
            const refreshResponse = await fetch(`${this.baseURL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshToken}`
              }
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.success && refreshData.data?.token) {
                // Update token
                setToken(refreshData.data.token);

                // Retry original request with new token
                const newHeaders = { ...this.getHeaders() } as any;
                // update auth header explicitly
                newHeaders['Authorization'] = `Bearer ${refreshData.data.token}`;

                const newConfig = {
                  ...config,
                  headers: newHeaders
                };

                const retryResponse = await fetch(url, newConfig);
                let retryData: any = null;
                try {
                  retryData = await retryResponse.json();
                } catch (_) {
                  retryData = null;
                }

                if (retryResponse.ok) {
                  return (retryData ?? { success: true }) as ApiResponse<T>;
                } else if (retryResponse.status === 401) {
                  // If still 401 after refresh, then actual logout
                  removeToken();
                  return { success: false, error: retryData?.error || "Unauthorized" } as any;
                }
                // Return the retried response result (even if error)
                return {
                  success: false,
                  error: (retryData && (retryData.error || retryData.message)) || retryResponse.statusText,
                  data: retryData?.data
                } as any;
              }
            }
          }
        } catch (e) {
          // Refresh failed, proceed to logout
          console.error("[API] Token refresh failed:", e);
        }

        removeToken();
        return { success: false, error: data?.error || "Unauthorized" } as any;
      }

      if (!response.ok) {
        return {
          success: false,
          error: (data && (data.error || data.message)) || response.statusText,
          data: data?.data ?? data,
        } as any;
      }

      return (data ?? { success: true }) as ApiResponse<T>;
    } catch (error: any) {
      console.error("[API] Request failed:", error);
      return {
        success: false,
        error: error.message || "Request failed",
      } as any;
    }
  }

  // Add generic HTTP methods
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }
  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async postFormData<T = any>(
    endpoint: string,
    formData: FormData
  ): Promise<ApiResponse<T>> {
    const headers = this.getHeaders();
    // Create new headers object without Content-Type for FormData
    const formDataHeaders: HeadersInit = {};

    if (typeof headers === "object" && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== "content-type") {
          formDataHeaders[key] = value;
        }
      });
    }

    return this.request<T>(endpoint, {
      method: "POST",
      headers: formDataHeaders,
      body: formData,
    });
  }
  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
  }

  // Authentication endpoints
  async login(
    email: string,
    password: string,
    portal?: 'CUSTOMER' | 'ADMIN'
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, portal }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    role?: string;
    mobile?: string; // required when role=CUSTOMER
    customerType?: "B2C" | "B2B" | "ENTERPRISE_1" | "ENTERPRISE_2";
    companyName?: string;
    licenseNumber?: string;
    city?: string;
    zip?: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request("/auth/profile");
  }

  async updateProfile(userData: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<ApiResponse<User>> {
    return this.request("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse> {
    return this.request("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.request("/auth/logout", {
      method: "POST",
    });
  }

  // OTP (mobile verification)
  async requestOtp(customerId: string, mobile?: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/otp/request`, {
      method: "POST",
      body: JSON.stringify({ customerId, mobile }),
    });
  }

  async verifyOtp(customerId: string, code: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/otp/verify`, {
      method: "POST",
      body: JSON.stringify({ customerId, code }),
    });
  }

  // Email verification endpoints
  async verifyEmail(token: string): Promise<ApiResponse> {
    return this.request(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  }

  async resendVerification(): Promise<ApiResponse> {
    return this.request(`/auth/request-email-verification`, { method: "POST" });
  }

  // Password reset flow
  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/auth/password-reset/request`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/auth/password-reset/confirm`, {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // Email OTP login
  async requestEmailOtp(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/auth/email-otp/request`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async verifyEmailOtp(
    email: string,
    code: string,
    portal?: "CUSTOMER" | "ADMIN"
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request(`/auth/email-otp/verify`, {
      method: "POST",
      body: JSON.stringify({ email, code, portal }),
    });
  }

  // User management endpoints
  async getUserStats(): Promise<
    ApiResponse<{
      total: number;
      active: number;
      inactive: number;
      admins: number;
    }>
  > {
    return this.get('/users/stats');
  }

  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<
    ApiResponse<{
      users: User[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    return this.request(`/users?${searchParams.toString()}`);
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request(`/users/${id}`);
  }

  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive?: boolean;
  }): Promise<ApiResponse<User>> {
    return this.request("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async updateUser(
    id: string,
    userData: {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      isActive?: boolean;
    }
  ): Promise<ApiResponse<User>> {
    return this.request(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async deactivateUser(id: string): Promise<ApiResponse> {
    return this.request(`/users/${id}/deactivate`, {
      method: "PATCH",
    });
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return this.request(`/users/${id}`, {
      method: "DELETE",
    });
  }

  async resetUserPassword(
    id: string,
    newPassword: string
  ): Promise<ApiResponse> {
    return this.request(`/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
  }

  async resetCustomerPassword(
    id: string,
    newPassword: string
  ): Promise<ApiResponse> {
    return this.request(`/customers/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
  }

  async updateUserPermissions(
    id: string,
    permissions: Permission[]
  ): Promise<ApiResponse<User>> {
    return this.request(`/users/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    });
  }

  // Customer management endpoints
  async getCustomers(params?: {
    page?: number;
    limit?: number;
    customerType?: string;
    isActive?: boolean;
    isApproved?: boolean;
    approvalStatus?: "PENDING" | "APPROVED" | "DEACTIVATED";
    search?: string;
  }): Promise<
    ApiResponse<{
      customers: Customer[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
      stats?: {
        active: number;
        inactive: number;
        pendingApproval?: number;
        pending?: number;
        approved?: number;
        rejected?: number;
        b2c: number;
        b2b: number;
        e1: number;
        e2: number
      };
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    return this.request(`/customers?${searchParams.toString()}`);
  }
  async hardDeleteCustomer(id: string): Promise<ApiResponse> {
    return this.request(`/customers/${id}/hard`, {
      method: "DELETE",
    });
  }

  // Favorites (customer self-service)
  async getFavorites(
    customerId: string,
    params?: { page?: number; limit?: number }
  ): Promise<
    ApiResponse<{
      favorites: Array<{ id: string; product: Product }>;
      pagination: { page: number; limit: number; total: number; pages: number };
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const qs = searchParams.toString();
    return this.request(
      `/customers/${customerId}/favorites${qs ? `?${qs}` : ""}`
    );
  }

  async addFavorite(
    customerId: string,
    productId: string
  ): Promise<ApiResponse<{ id: string; product: Product }>> {
    return this.request(`/customers/${customerId}/favorites`, {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  }

  async removeFavorite(
    customerId: string,
    favoriteId: string
  ): Promise<ApiResponse> {
    return this.request(`/customers/${customerId}/favorites/${favoriteId}`, {
      method: "DELETE",
    });
  }

  async removeFavoriteByProduct(
    customerId: string,
    productId: string
  ): Promise<ApiResponse> {
    const qs = new URLSearchParams({ productId }).toString();
    return this.request(`/customers/${customerId}/favorites?${qs}`, {
      method: "DELETE",
    });
  }

  async getCustomer(id: string): Promise<ApiResponse<Customer>> {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(customerData: {
    firstName: string;
    lastName: string;
    middleName?: string;
    companyName?: string;
    licenseNumber?: string;
    email: string;
    mobile?: string;
    city?: string;
    zip?: string;
    password?: string;
    customerType?: string;
    isActive?: boolean;
    tags?: string[];
    addresses?: any[];
  }): Promise<ApiResponse<Customer>> {
    return this.request("/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(
    id: string,
    customerData: {
      firstName?: string;
      lastName?: string;
      middleName?: string;
      companyName?: string;
      licenseNumber?: string;
      email?: string;
      mobile?: string;
      city?: string;
      zip?: string;
      customerType?: string;
      isActive?: boolean;
      isApproved?: boolean;
      emailVerified?: boolean;
      mobileVerified?: boolean;
      tags?: string[];
    }
  ): Promise<ApiResponse<Customer>> {
    return this.request(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(customerData),
    });
  }

  async deleteCustomer(id: string): Promise<ApiResponse> {
    return this.request(`/customers/${id}`, {
      method: "DELETE",
    });
  }

  async bulkDeleteCustomers(ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    return this.request('/customers/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  }

  // Notify customer with credentials email (hardcoded template)
  async notifyCustomerCredentials(customerId: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/customers/${customerId}/notify-credentials`, {
      method: "POST",
      body: JSON.stringify({ password })
    });
  }

  // Product management endpoints
  async getProducts(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    include?: {
      variants?: {
        include?: {
          inventory?: boolean;
        };
      };
    };
  }): Promise<ApiResponse<PaginatedData<Product>>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);
    if (params?.include?.variants?.include?.inventory) {
      queryParams.append("include", "variants.inventory");
    }

    const response = await this.request<{
      products: Product[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
      stats?: { active: number; draft: number; inactive: number; archived: number };
    }>(`/products?${queryParams}`);

    if (response.success && response.data) {
      const result: any = {
        success: true,
        data: {
          products: response.data.products,
          pagination: response.data.pagination,
        },
      };
      // Attach stats in a backward-compatible way for callers opting to read it via 'as any'
      (result.data as any).stats = (response.data as any).stats;
      return result as ApiResponse<PaginatedData<Product>>;
    }

    return response as ApiResponse<PaginatedData<Product>>;
  }

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return this.request(`/products/${id}`);
  }

  async exportProducts(): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/products/export/all`, {
      method: 'GET',
      headers: {
        ...(this.getHeaders() as Record<string, string>),
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to export products');
    }

    return response.blob();
  }

  async updateProductsFromExcel(file: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.postFormData('/products/import/update', formData);
  }

  // Storefront (public) product endpoints
  async getStorefrontProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isPopular?: boolean;
  }): Promise<
    ApiResponse<{
      products: Product[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>
  > {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);
    if (typeof params?.isPopular === 'boolean') queryParams.append("isPopular", String(params.isPopular));
    const qs = queryParams.toString();
    return this.request(`/storefront/products${qs ? `?${qs}` : ""}`);
  }

  async getStorefrontProduct(id: string): Promise<ApiResponse<Product>> {
    return this.request(`/storefront/products/${id}`);
  }

  // Cart endpoints
  async getCart(): Promise<
    ApiResponse<{
      id: string;
      items: Array<{
        id: string;
        quantity: number;
        unitPrice: number;
        variant: ProductVariant & { product?: Product };
      }>;
    }>
  > {
    return this.get("/cart");
  }

  async getInventoryAvailability(variantId: string): Promise<
    ApiResponse<{
      variantId: string;
      totalAvailable: number;
      availability: Array<{
        locationId: string;
        locationName: string;
        totalQuantity: number;
        reservedQuantity: number;
        availableQuantity: number;
      }>;
      inStock: boolean;
    }>
  > {
    return this.get(`/inventory/availability/${variantId}`);
  }

  async addToCart(
    variantId: string,
    quantity: number = 1
  ): Promise<ApiResponse<any>> {
    return this.post("/cart/items", { variantId, quantity });
  }

  async updateCartItem(
    itemId: string,
    quantity: number
  ): Promise<ApiResponse<any>> {
    return this.put(`/cart/items/${itemId}`, { quantity });
  }

  async removeCartItem(itemId: string): Promise<ApiResponse<any>> {
    return this.delete(`/cart/items/${itemId}`);
  }

  async clearCart(): Promise<ApiResponse<any>> {
    return this.delete(`/cart`);
  }

  async mergeGuestCart(
    items: Array<{ variantId: string; quantity: number }>
  ): Promise<ApiResponse<any>> {
    return this.post("/cart/merge", { items });
  }

  // Abandoned carts
  async getAbandonedCarts(minutes: number = 30, page: number = 1, limit: number = 10, search: string = ''): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams({
      minutes: minutes.toString(),
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) queryParams.append('search', search);
    return this.get(`/cart/abandoned?${queryParams.toString()}`);
  }

  async notifyAbandonedCart(cartId: string, email: string): Promise<ApiResponse<any>> {
    return this.post('/cart/abandoned/notify', { cartId, email });
  }

  async notifyAllAbandonedCarts(minutes: number = 30, search: string = ''): Promise<ApiResponse<any>> {
    return this.post('/cart/abandoned/notify-all', { minutes, search });
  }

  async createProduct(productData: {
    name: string;
    description?: string;
    status?: string;
    shipstationSku?: string;
    categories?: string[];
    tags?: string[];
    images?: any[];
    variants: any[];
    seoTitle?: string;
    seoDescription?: string;
    seoSlug?: string;
  }): Promise<ApiResponse<Product>> {
    return this.request("/products", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(
    id: string,
    productData: {
      name?: string;
      description?: string;
      status?: string;
      shipstationSku?: string | null;
      categories?: string[];
      tags?: string[];
      images?: any[];
      seoTitle?: string;
      seoDescription?: string;
      seoSlug?: string;
    }
  ): Promise<ApiResponse<Product>> {
    return this.request(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  }

  async createVariant(
    productId: string,
    variantData: {
      sku: string;
      shipstationSku?: string;
      name: string;
      description?: string;
      regularPrice: number;
      salePrice?: number | null;
      weight?: number | null;
      hsn?: string;
      seoTitle?: string;
      seoDescription?: string;
      seoSlug?: string;
      isActive?: boolean;
      options?: Array<{ name: string; value: string }>;
      segmentPrices?: Array<{
        customerType: string;
        regularPrice: number;
        salePrice?: number | null;
      }>;
      images?: Array<{ url: string; altText?: string; sortOrder?: number }>;
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify(variantData),
    });
  }

  async updateVariant(
    productId: string,
    variantId: string,
    data: Partial<{
      sku: string;
      shipstationSku?: string;
      name: string;
      description: string;
      regularPrice: number;
      salePrice: number | null;
      weight: number | null;
      hsn: string;
      seoTitle: string;
      seoDescription: string;
      seoSlug: string;
      isActive: boolean;
      options: Array<{ name: string; value: string }>;
      segmentPrices: Array<{
        customerType: string;
        regularPrice: number;
        salePrice?: number | null;
      }>;
      images: Array<{ url: string; altText?: string; sortOrder?: number }>;
    }>
  ): Promise<ApiResponse<any>> {
    return this.request(`/products/${productId}/variants/${variantId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    return this.request(`/products/${id}`, {
      method: "DELETE",
    });
  }

  async archiveProduct(id: string): Promise<ApiResponse> {
    return this.request(`/products/${id}/archive`, {
      method: "PATCH",
    });
  }

  // Add: bulk upload products from parsed Excel rows
  async bulkUploadProducts(rows: any[]): Promise<ApiResponse<any>> {
    return this.request(`/products/bulk-upload`, {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  }

  // Order management endpoints
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    customerId?: string;
    salesRepId?: string;
    customerType?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    paymentMethod?: string;
    failedPayments?: boolean;
    excludeFailedPayments?: boolean;
    salesChannelId?: string;
    usePSTFilter?: boolean;
  }): Promise<ApiResponse<PaginatedData<Order>>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === "usePSTFilter") {
            searchParams.append(key, value ? "true" : "false");
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }

    const response = await this.request<{
      orders: Order[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
      stats?: { pending: number; processing: number; shipped: number; delivered: number; cancelled: number; revenue?: number };
    }>(`/orders?${searchParams.toString()}`);

    if (response.success && response.data) {
      const result: any = {
        success: true,
        data: {
          orders: response.data.orders,
          pagination: response.data.pagination,
        },
      };
      (result.data as any).stats = (response.data as any).stats;
      return result as ApiResponse<PaginatedData<Order>>;
    }

    return response as ApiResponse<PaginatedData<Order>>;
  }

  async getOrder(id: string): Promise<ApiResponse<Order>> {
    return this.request(`/orders/${id}`);
  }

  async getSalesChannels(): Promise<ApiResponse<any[]>> {
    return this.get('/sales-channels');
  }

  // Customer self-service orders (no ORDERS READ permission needed for CUSTOMER role)
  async getCustomerOrders(
    customerId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      from?: string;
      to?: string;
    }
  ): Promise<
    ApiResponse<{
      orders: Order[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, value.toString());
        }
      });
    }
    const qs = searchParams.toString();
    return this.request(`/customers/${customerId}/orders${qs ? `?${qs}` : ""}`);
  }

  async getCustomerOrdersStats(
    customerId: string
  ): Promise<ApiResponse<{ ALL: number; ACTIVE: number; DELIVERED: number; CANCELLED: number }>> {
    return this.request(`/customers/${customerId}/orders-stats`);
  }

  async createOrder(orderData: {
    customerId: string;
    billingAddressId: string;
    shippingAddressId: string;
    items: {
      variantId: string;
      quantity: number;
      unitPrice: string;
    }[];
    discountAmount?: string;
    shippingAmount?: string;
    taxAmount?: string;
    couponCode?: string;
    selectedPaymentType?: "ZELLE" | "BANK_WIRE" | "AUTHORIZE_NET" | null;
    skipWarehouse?: boolean;
    suppressEmail?: boolean;
  }): Promise<ApiResponse<Order>> {
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  }

  async updateOrder(
    id: string,
    orderData: {
      status?: string;
      billingAddressId?: string;
      shippingAddressId?: string;
      discountAmount?: string;
      shippingAmount?: string;
      taxAmount?: string;
    }
  ): Promise<ApiResponse<Order>> {
    return this.request(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(orderData),
    });
  }

  async updateOrderStatus(
    id: string,
    status: string,
    note?: string
  ): Promise<ApiResponse> {
    return this.request(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    });
  }

  async cancelOwnOrder(
    id: string
  ): Promise<ApiResponse<{ orderId: string; status: string }>> {
    return this.request(`/orders/${id}/cancel`, {
      method: "POST",
    });
  }

  async addOrderNote(
    id: string,
    note: string,
    isInternal: boolean = true
  ): Promise<ApiResponse<OrderNote>> {
    return this.request(`/orders/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note, isInternal }),
    });
  }

  async getOrderNotes(id: string): Promise<ApiResponse<OrderNote[]>> {
    return this.request(`/orders/${id}/notes`);
  }

  async deleteOrder(id: string): Promise<ApiResponse> {
    return this.request(`/orders/${id}`, {
      method: "DELETE",
    });
  }

  async bulkDeleteOrders(ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    return this.request('/orders/bulk-delete', {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    });
  }

  async hardDeleteOrder(id: string): Promise<ApiResponse> {
    return this.request(`/orders/${id}/hard`, {
      method: "DELETE",
    });
  }

  async sendOrdersEmailReport(data: {
    email: string;
    dateFrom?: string;
    dateTo?: string;
    usePSTFilter?: boolean;
    filters?: any;
  }): Promise<ApiResponse> {
    return this.post("/orders/email-report", {
      ...data,
      usePSTFilter: data.usePSTFilter ? "true" : "false",
    });
  }

  // Authorize.Net charge using Accept.js opaqueData
  async chargeAuthorizeNet(data: {
    orderId: string;
    amount: number;
    opaqueData: { dataDescriptor: string; dataValue: string };
  }): Promise<
    ApiResponse<{ transactionId: string; gatewayTransactionId?: string }>
  > {
    return this.request(`/payments/authorize/charge`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Authorize card directly with Authorize.Net API (without Accept.js)
  async authorizeCard(data: {
    orderId?: string;
    amount: number | string;
    cardNumber: string;
    expirationDate: string;
    cardCode: string;
    cardholderName?: string;
    billingAddress?: any;
    shippingAddress?: any;
    shippingAmount?: number | string;
    paymentFeePct?: number;
    discountAmount?: number | string;
    subtotal?: number | string;
    taxAmount?: number | string;
  }): Promise<
    ApiResponse<{
      transactionId?: string;
      gatewayTransactionId?: string;
      authCode?: string;
      gateway?: any;
      gatewayResponse?: any;
      orderId?: string;
    }>
  > {
    return this.request(`/payments/authorize-card`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Customer-initiated manual payment (Zelle/Bank Wire)
  async initiateManualPayment(data: {
    orderId: string;
    amount: number;
    note?: string;
  }): Promise<ApiResponse<{ transactionId: string; status: string }>> {
    return this.request(`/payments/manual/initiate`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Fetch public Accept config (clientKey + apiLoginId)
  async getAuthorizeNetPublicConfig(): Promise<
    ApiResponse<{ apiLoginId: string; clientKey: string; env: string }>
  > {
    return this.get(`/payments/authorize/public-config`);
  }

  // File upload
  async uploadFile(
    file: File
  ): Promise<ApiResponse<{ url: string; filename: string }>> {
    const formData = new FormData();
    // Backend S3 route expects field name 'image'
    formData.append("image", file);

    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}/uploads/image`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Normalize to ApiResponse shape
      if (data && data.success && data.data?.url) {
        return {
          success: true,
          data: { url: data.data.url, filename: data.data.filename },
        } as any;
      }
      return data as ApiResponse<any>;
    } catch (error) {
      console.error("File upload failed:", error);
      if (error instanceof Error) {
        // Show error toast (only on client side)
        if (typeof window !== "undefined") {
          toast.error(error.message);
        }
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: "File upload failed",
      };
    }
  }

  async createAddress(
    customerId: string,
    addressData: any
  ): Promise<ApiResponse<Address>> {
    return this.request(`/customers/${customerId}/addresses`, {
      method: "POST",
      body: JSON.stringify(addressData),
    });
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    addressData: any
  ): Promise<ApiResponse<Address>> {
    return this.request(`/customers/${customerId}/addresses/${addressId}`, {
      method: "PUT",
      body: JSON.stringify(addressData),
    });
  }

  async deleteAddress(
    customerId: string,
    addressId: string
  ): Promise<ApiResponse> {
    return this.request(`/customers/${customerId}/addresses/${addressId}`, {
      method: "DELETE",
    });
  }

  // Inventory Management
  async getLocations(): Promise<ApiResponse<Location[]>> {
    return this.request("/locations");
  }

  async getInventory(params?: {
    page?: number;
    limit?: number;
    search?: string;
    locationId?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
  }): Promise<
    ApiResponse<{
      inventory: Array<{
        id: string;
        quantity: number;
        lowStockAlert: number;
        variant: {
          id: string;
          sku: string;
          name: string;
          product: {
            name: string;
            status: string;
          };
        };
        location: {
          id: string;
          name: string;
        };
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.search) searchParams.append("search", params.search);
      if (params.locationId)
        searchParams.append("locationId", params.locationId);
      if (params.lowStock)
        searchParams.append("lowStock", params.lowStock.toString());
      if (params.outOfStock)
        searchParams.append("outOfStock", params.outOfStock.toString());
    }
    const queryString = searchParams.toString();
    return this.request(`/inventory${queryString ? `?${queryString}` : ""}`);
  }

  async updateInventory(
    id: string,
    data: {
      quantity?: number;
      lowStockAlert?: number;
      reason?: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async createInventoryMovement(data: {
    variantId: string;
    locationId: string;
    quantity: number;
    type:
    | "PURCHASE"
    | "SALE"
    | "RETURN"
    | "ADJUSTMENT_IN"
    | "ADJUSTMENT_OUT"
    | "TRANSFER_IN"
    | "TRANSFER_OUT";
    reason: string;
  }): Promise<ApiResponse<any>> {
    return this.request("/inventory/movement", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Category Management
  async getCategories(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<
    ApiResponse<{
      categories: Array<{
        id: string;
        name: string;
        product: {
          name: string;
          status: string;
        };
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.search) searchParams.append("search", params.search);
    }
    const queryString = searchParams.toString();
    return this.request(`/categories${queryString ? `?${queryString}` : ""}`);
  }

  async createCategory(data: { name: string; productId: string }): Promise<
    ApiResponse<{
      id: string;
      name: string;
      product: {
        name: string;
        status: string;
      };
    }>
  > {
    return this.request("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Distinct lists for selectors
  async getDistinctCategories(): Promise<
    ApiResponse<{ categories: string[] }>
  > {
    return this.request(`/categories/distinct`);
  }
  async getDistinctTags(): Promise<ApiResponse<{ tags: string[] }>> {
    return this.request(`/products/tags/distinct`);
  }

  async updateCategory(
    id: string,
    data: {
      name: string;
    }
  ): Promise<
    ApiResponse<{
      id: string;
      name: string;
      product: {
        name: string;
        status: string;
      };
    }>
  > {
    return this.request(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    return this.request(`/categories/${id}`, {
      method: "DELETE",
    });
  }

  async getCollections(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<
    ApiResponse<{
      collections: Collection[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>
  > {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (typeof params?.isActive === "boolean")
      queryParams.append("isActive", params.isActive.toString());

    return this.request<{
      collections: Collection[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/collections?${queryParams.toString()}`);
  }

  async getCollection(id: string): Promise<ApiResponse<Collection>> {
    return this.request<Collection>(`/collections/${id}`);
  }

  async createCollection(collectionData: {
    name: string;
    description?: string;
    isActive?: boolean;
    sortOrder?: number;
    productIds?: string[];
  }): Promise<ApiResponse<Collection>> {
    return this.request<Collection>("/collections", {
      method: "POST",
      body: JSON.stringify(collectionData),
    });
  }

  async updateCollection(
    id: string,
    collectionData: {
      name?: string;
      description?: string;
      isActive?: boolean;
      sortOrder?: number;
    }
  ): Promise<ApiResponse<Collection>> {
    return this.request<Collection>(`/collections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(collectionData),
    });
  }

  async deleteCollection(id: string): Promise<ApiResponse> {
    return this.request(`/collections/${id}`, {
      method: "DELETE",
    });
  }

  async updateCollectionProducts(
    id: string,
    productIds: string[]
  ): Promise<ApiResponse> {
    return this.request(`/collections/${id}/products`, {
      method: "PUT",
      body: JSON.stringify({ productIds }),
    });
  }

  async reorderCollectionProducts(
    id: string,
    productOrders: Array<{ productId: string; sortOrder: number }>
  ): Promise<ApiResponse> {
    return this.request(`/collections/${id}/products/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ productOrders }),
    });
  }

  async createProductVariant(
    productId: string,
    variantData: {
      sku: string;
      shipstationSku?: string;
      name: string;
      description?: string;
      regularPrice: number;
      salePrice?: number;
      weight?: number;
      hsn?: string;
      isActive?: boolean;
      options?: { name: string; value: string }[];
      segmentPrices?: {
        customerType: "B2C" | "B2B" | "ENTERPRISE_1" | "ENTERPRISE_2";
        regularPrice: number;
        salePrice?: number;
      }[];
      images?: Array<{ url: string; altText?: string; sortOrder?: number }>;
    }
  ): Promise<ApiResponse<ProductVariant>> {
    return this.request<ProductVariant>(`/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify(variantData),
    });
  }

  async updateProductVariant(
    productId: string,
    variantId: string,
    variantData: {
      sku?: string;
      shipstationSku?: string;
      name?: string;
      description?: string;
      regularPrice?: number;
      salePrice?: number;
      weight?: number;
      hsn?: string;
      isActive?: boolean;
      options?: { name: string; value: string }[];
      segmentPrices?: {
        customerType: "B2C" | "B2B" | "ENTERPRISE_1" | "ENTERPRISE_2" | "WHOLESALE";
        regularPrice: number;
        salePrice?: number;
      }[];
      images?: Array<{ url: string; altText?: string; sortOrder?: number }>;
    }
  ): Promise<ApiResponse<ProductVariant>> {
    return this.request<ProductVariant>(
      `/products/${productId}/variants/${variantId}`,
      {
        method: "PUT",
        body: JSON.stringify(variantData),
      }
    );
  }

  async deleteProductVariant(
    productId: string,
    variantId: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/products/${productId}/variants/${variantId}`, {
      method: "DELETE",
    });
  }

  // Inventory Location endpoints
  async createLocation(data: { name: string; address?: string }) {
    return this.post("/locations", data);
  }
  async updateLocation(
    id: string,
    data: { name?: string; address?: string; isActive?: boolean }
  ) {
    return this.put(`/locations/${id}`, data);
  }
  async deleteLocation(id: string) {
    return this.delete(`/locations/${id}`);
  }

  async initiateOrderRefund(orderId: string, amount: number, reason: string) {
    const token = getToken();
    const response = await fetch(`${this.baseURL}/orders/${orderId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ amount, reason }),
    });
    return response.json();
  }
  async updateRefundStatus(refundId: string, status: string) {
    const token = getToken();
    const response = await fetch(
      `${this.baseURL}/orders/refunds/${refundId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      }
    );
    return response.json();
  }

  // Transaction management endpoints
  async getTransactions(params?: {
    orderId?: string;
    paymentStatus?: string;
    paymentGatewayName?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<{ transactions: any[] } | any[]>> {
    const queryParams = new URLSearchParams();
    if (params?.orderId) queryParams.append("orderId", params.orderId);
    if (params?.paymentStatus)
      queryParams.append("paymentStatus", params.paymentStatus);
    if (params?.paymentGatewayName)
      queryParams.append("paymentGatewayName", params.paymentGatewayName);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    return this.get(
      `/transactions${queryParams.toString() ? `?${queryParams}` : ""}`
    );
  }

  async getTransaction(id: string): Promise<ApiResponse<any>> {
    return this.get(`/transactions/${id}`);
  }

  async createTransaction(data: {
    orderId: string;
    amount: string | number;
    paymentStatus: string;
    paymentGatewayName: string;
    paymentGatewayTransactionId?: string;
    paymentGatewayResponse?: string;
  }): Promise<ApiResponse<any>> {
    return this.post("/transactions", data);
  }

  async updateTransaction(
    id: string,
    data: {
      paymentStatus?: string;
      paymentGatewayTransactionId?: string;
      paymentGatewayResponse?: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Promotion/Coupon management endpoints
  async getPromotions(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request(`/promotions?${searchParams.toString()}`);
  }

  async getPromotionStats(): Promise<ApiResponse<{ totalCoupons: number; activeCoupons: number; totalUsage: number }>> {
    return this.get('/promotions/stats');
  }

  async getPromotion(id: string): Promise<ApiResponse<Promotion>> {
    return this.get(`/promotions/${id}`);
  }

  // Tax Rates
  async getTaxRates(params?: {
    country?: string;
    state?: string;
  }): Promise<ApiResponse<TaxRate[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.country) searchParams.append("country", params.country);
      if (params.state) searchParams.append("state", params.state);
    }

    return this.request(`/tax-rates?${searchParams.toString()}`);
  }

  async getApplicableTaxRate(
    country: string,
    state?: string
  ): Promise<ApiResponse<TaxRate | null>> {
    const searchParams = new URLSearchParams();
    searchParams.append("country", country);
    if (state) searchParams.append("state", state);

    return this.request(`/tax-rates/applicable?${searchParams.toString()}`);
  }

  async getApplicableShippingRate(
    country: string,
    subtotal: number,
    weight?: number
  ): Promise<ApiResponse<any | null>> {
    const searchParams = new URLSearchParams();
    searchParams.append("country", country);
    searchParams.append("subtotal", subtotal.toString());
    if (weight) searchParams.append("weight", weight.toString());

    return this.request(`/shipping/applicable-rate?${searchParams.toString()}`);
  }

  // Shipping Management
  async getShipments(params?: {
    page?: number;
    limit?: number;
    orderId?: string;
    status?: string;
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.orderId) searchParams.append("orderId", params.orderId);
      if (params.status) searchParams.append("status", params.status);
    }

    return this.request(`/shipping?${searchParams.toString()}`);
  }

  async getShipment(id: string): Promise<ApiResponse<any>> {
    return this.get(`/shipping/${id}`);
  }

  async getOrderShipments(orderId: string): Promise<ApiResponse<any>> {
    // Use public endpoint so customers can view their own shipments
    return this.get(`/shipping/public/order/${orderId}`);
  }

  async createShipment(data: {
    orderId: string;
    carrier: string;
    trackingNumber?: string;
    trackingUrl?: string;
    status?: string;
  }): Promise<ApiResponse<any>> {
    return this.post("/shipping", data);
  }

  async updateShipmentTracking(
    id: string,
    data: {
      trackingNumber?: string;
      trackingUrl?: string;
      status?: string;
      carrier?: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.put(`/shipping/${id}/tracking`, data);
  }

  async deleteShipment(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/shipping/${id}`);
  }

  // Storefront inquiries
  async sendInquiry(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.post(`/inquiries`, { email });
  }

  // Contact Lab
  async contactLab(payload: {
    email: string;
    message: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.post(`/contact-lab`, payload);
  }

  // Shipping Zones Management
  async getShippingZones(): Promise<ApiResponse<any>> {
    return this.get("/shipping/zones");
  }

  async createShippingZone(data: {
    name: string;
    countries: string[];
    rates?: {
      name: string;
      rate: number;
      estimatedDays?: string;
      freeShippingThreshold?: number;
    }[];
  }): Promise<ApiResponse<any>> {
    return this.post("/shipping/zones", data);
  }

  async updateShippingZone(
    id: string,
    data: {
      name?: string;
      countries?: string[];
    }
  ): Promise<ApiResponse<any>> {
    return this.put(`/shipping/zones/${id}`, data);
  }

  async deleteShippingZone(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/shipping/zones/${id}`);
  }

  // Shipping Rates Management
  async getShippingRates(zoneId?: string): Promise<ApiResponse<any>> {
    const params = zoneId ? `?zoneId=${zoneId}` : "";
    return this.get(`/shipping/rates${params}`);
  }

  async createShippingRate(data: {
    zoneId: string;
    name: string;
    rate: number;
    minWeight?: number;
    maxWeight?: number;
    minPrice?: number;
    maxPrice?: number;
    freeShippingThreshold?: number;
    estimatedDays?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.post("/shipping/rates", data);
  }

  async updateShippingRate(
    id: string,
    data: {
      name?: string;
      rate?: number;
      minWeight?: number;
      maxWeight?: number;
      minPrice?: number;
      maxPrice?: number;
      freeShippingThreshold?: number;
      estimatedDays?: string;
      isActive?: boolean;
    }
  ): Promise<ApiResponse<any>> {
    return this.put(`/shipping/rates/${id}`, data);
  }

  async deleteShippingRate(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/shipping/rates/${id}`);
  }

  // Shipping Tiers Management
  async getShippingTiers(): Promise<ApiResponse<any>> {
    return this.get("/shipping/tiers");
  }

  async getPublicShippingTiers(): Promise<ApiResponse<any>> {
    return this.get("/shipping/public/tiers");
  }

  async getShippingTier(id: string): Promise<ApiResponse<any>> {
    return this.get(`/shipping/tiers/${id}`);
  }

  async createShippingTier(data: {
    name: string;
    minSubtotal: number;
    maxSubtotal?: number | null;
    shippingRate: number;
    serviceName?: string;
  }): Promise<ApiResponse<any>> {
    return this.post("/shipping/tiers", data);
  }

  async updateShippingTier(
    id: string,
    data: {
      name?: string;
      minSubtotal?: number;
      maxSubtotal?: number | null;
      shippingRate?: number;
      serviceName?: string;
      isActive?: boolean;
    }
  ): Promise<ApiResponse<any>> {
    return this.put(`/shipping/tiers/${id}`, data);
  }

  async deleteShippingTier(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/shipping/tiers/${id}`);
  }

  // Carriers Management
  async getCarriers(): Promise<ApiResponse<any>> {
    return this.get("/shipping/carriers");
  }

  async createCarrier(data: {
    name: string;
    code: string;
    apiKey?: string;
    apiSecret?: string;
    services?: string[];
    trackingUrl?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.post("/shipping/carriers", data);
  }

  async updateCarrier(
    id: string,
    data: {
      name?: string;
      code?: string;
      apiKey?: string;
      apiSecret?: string;
      services?: string[];
      trackingUrl?: string;
      isActive?: boolean;
    }
  ): Promise<ApiResponse<any>> {
    return this.put(`/shipping/carriers/${id}`, data);
  }

  async deleteCarrier(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/shipping/carriers/${id}`);
  }

  // Product Relations Management
  async addProductRelation(
    productId: string,
    relatedProductId: string,
    type: "RELATED" | "UPSELL" | "CROSS_SELL"
  ): Promise<ApiResponse<any>> {
    return this.post(`/products/${productId}/relations`, {
      relatedProductId,
      type,
    });
  }

  async removeProductRelation(
    productId: string,
    relationId: string
  ): Promise<ApiResponse<any>> {
    return this.delete(`/products/${productId}/relations/${relationId}`);
  }

  async getProductRelations(productId: string): Promise<ApiResponse<any>> {
    return this.get(`/products/${productId}/relations`);
  }

  // Product Reviews Management
  async approveReview(reviewId: string): Promise<ApiResponse<any>> {
    return this.put(`/reviews/${reviewId}/approve`, {});
  }

  async deleteReview(reviewId: string): Promise<ApiResponse<any>> {
    return this.delete(`/reviews/${reviewId}`);
  }

  async getProductReviews(productId: string): Promise<ApiResponse<any>> {
    return this.get(`/products/${productId}/reviews`);
  }

  // Inventory Batch Management
  async getInventoryBatches(inventoryId: string): Promise<ApiResponse<any>> {
    return this.get(`/inventory-batches?inventoryId=${inventoryId}`);
  }

  async createInventoryBatch(data: {
    inventoryId: string;
    batchNumber: string;
    quantity: number;
    expiryDate?: string;
  }): Promise<ApiResponse<any>> {
    return this.post("/inventory-batches", data);
  }

  async updateInventoryBatch(
    id: string,
    data: {
      batchNumber?: string;
      quantity?: number;
      expiryDate?: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.put(`/inventory-batches/${id}`, data);
  }

  async deleteInventoryBatch(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/inventory-batches/${id}`);
  }

  async getExpiringBatches(days: number = 30): Promise<ApiResponse<any>> {
    return this.get(`/inventory-batches/expiring?days=${days}`);
  }

  async getExpiredBatches(): Promise<ApiResponse<any>> {
    return this.get("/inventory-batches/expired");
  }

  async getLowStockItems(): Promise<ApiResponse<any>> {
    return this.get("/inventory/low-stock");
  }

  async getOutOfStockItems(): Promise<ApiResponse<any>> {
    return this.get("/inventory/out-of-stock");
  }

  async getInventoryManagement(params?: {
    search?: string;
    filter?: "all" | "low-stock" | "out-of-stock";
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.filter) searchParams.append("filter", params.filter);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const queryString = searchParams.toString();
    return this.get(`/inventory/management${queryString ? `?${queryString}` : ""}`);
  }

  async getVariantInventoryDetails(variantId: string): Promise<ApiResponse<any>> {
    return this.get(`/inventory/variant/${variantId}/details`);
  }

  async updateVariantInventory(variantId: string, data: {
    onHand?: number;
    committed?: number;
    barcode?: string;
    sellWhenOutOfStock?: boolean;
    reason?: string;
  }): Promise<ApiResponse<any>> {
    return this.put(`/inventory/variant/${variantId}/update`, data);
  }

  async updateLocationInventory(variantId: string, locationId: string, data: {
    onHand?: number;
    committed?: number;
    barcode?: string;
    sellWhenOutOfStock?: boolean;
    reason?: string;
  }): Promise<ApiResponse<any>> {
    return this.put(`/inventory/variant/${variantId}/location/${locationId}/update`, data);
  }

  async getVariantCommittedOrders(variantId: string): Promise<ApiResponse<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    status: string;
    quantity: number;
    createdAt: string;
  }[]>> {
    return this.get(`/inventory/variant/${variantId}/committed-orders`);
  }


  // Inventory Sync from ShipStation
  async syncShipStationInventory(): Promise<ApiResponse<any>> {
    return this.post("/inventory/sync/shipstation", {});
  }

  async syncShipStationInventorySku(sku: string): Promise<ApiResponse<any>> {
    return this.post(`/inventory/sync/shipstation/${sku}`, {});
  }

  async validateCoupon(code: string): Promise<ApiResponse<Promotion>> {
    return this.get(`/promotions/code/${code}`);
  }

  async calculatePromotionDiscount(data: {
    promotionCode: string;
    orderItems: Array<{
      variantId: string;
      quantity: number;
      unitPrice: number;
      variant?: { productId?: string };
    }>;
    customerId?: string;
    subtotal: number;
    shippingAmount: number;
  }): Promise<ApiResponse<{ discount: number; appliedItems?: any[] }>> {
    return this.post("/promotions/calculate-discount", data);
  }

  async createPromotion(data: {
    code: string;
    name: string;
    description?: string;
    type:
    | "PERCENTAGE"
    | "FIXED_AMOUNT"
    | "FREE_SHIPPING"
    | "BOGO"
    | "VOLUME_DISCOUNT";
    value: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    usageLimit?: number;
    startsAt?: string;
    expiresAt?: string;
    customerTypes?: string[];
    bogoType?: string;
    buyQuantity?: number;
    getQuantity?: number;
    getDiscount?: number;
    productRules?: any[];
    categoryRules?: any[];
    volumeTiers?: any[];
    isForIndividualCustomer?: boolean;
    specificCustomerIds?: string[];
  }): Promise<ApiResponse<Promotion>> {
    return this.post("/promotions", data);
  }

  async updatePromotion(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      type:
      | "PERCENTAGE"
      | "FIXED_AMOUNT"
      | "FREE_SHIPPING"
      | "BOGO"
      | "VOLUME_DISCOUNT";
      value: number;
      minOrderAmount: number;
      maxDiscount: number;
      usageLimit: number;
      isActive: boolean;
      startsAt: string;
      expiresAt: string;
      customerTypes: string[];
      bogoType: string;
      buyQuantity: number;
      getQuantity: number;
      getDiscount: number;
      productRules: any[];
      categoryRules: any[];
      volumeTiers: any[];
      isForIndividualCustomer: boolean;
      specificCustomerIds: string[];
    }>
  ): Promise<ApiResponse<Promotion>> {
    return this.put(`/promotions/${id}`, data);
  }

  async deletePromotion(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/promotions/${id}`);
  }

  async useCoupon(code: string): Promise<ApiResponse<Promotion>> {
    return this.post(`/promotions/use/${code}`);
  }

  // Marketing endpoints
  async getMarketingDashboard(): Promise<
    ApiResponse<{
      activeCampaigns: number;
      activeCampaignsChange: number;
      totalReach: number;
      totalReachChange: number;
      clickThroughRate: number;
      clickThroughRateChange: number;
      marketingRevenue: number;
      marketingRevenueChange: number;
    }>
  > {
    return this.get("/marketing/dashboard");
  }

  async blastSelectedCustomers(customerIds: string[]): Promise<ApiResponse<any>> {
    return this.post("/marketing/blast-selected", { customerIds });
  }

  async getMarketingCampaigns(): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        type: string;
        status: string;
        audience: number;
        sent: number;
        opens: number;
        clicks: number;
        revenue: number;
        createdAt: string;
      }>
    >
  > {
    return this.get("/marketing/campaigns");
  }

  async getMarketingAnalytics(): Promise<
    ApiResponse<{
      campaignData: Array<{
        month: string;
        emailOpen: number;
        smsOpen: number;
        revenue: number;
      }>;
      channelData: Array<{
        name: string;
        value: number;
        color: string;
      }>;
    }>
  > {
    return this.get("/marketing/analytics");
  }

  async getMarketingCustomers(): Promise<
    ApiResponse<{
      loyaltyMembers: Array<{
        id: string;
        name: string;
        email: string;
        tier: string;
        points: number;
        totalSpent: number;
        joinDate: string;
      }>;
      programStats: {
        totalMembers: number;
        activeThisMonth: number;
        pointsRedeemed: number;
        averageSpend: number;
      };
    }>
  > {
    return this.get("/marketing/customers");
  }

  // Campaigns
  async getCampaigns(params?: {
    page?: number;
    limit?: number;
    type?: "EMAIL" | "SMS" | "AUTOMATION";
    status?: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null)
          searchParams.append(key, String(value));
      });
    }
    return this.request(`/campaigns?${searchParams.toString()}`);
  }

  async getCampaign(id: string): Promise<ApiResponse<any>> {
    return this.get(`/campaigns/${id}`);
  }

  async createCampaign(data: {
    name: string;
    type: "EMAIL" | "SMS" | "AUTOMATION";
    status?: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";
    promotionId?: string;
    scheduledAt?: string;
    emailTemplateType?: string;
    audienceFilter?: any;
  }): Promise<ApiResponse<any>> {
    return this.post("/campaigns", data);
  }

  async updateCampaign(
    id: string,
    data: {
      name?: string;
      status?: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";
    }
  ): Promise<ApiResponse<any>> {
    return this.put(`/campaigns/${id}`, data);
  }

  async deleteCampaign(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/campaigns/${id}`);
  }

  async getCampaignMetrics(
    id: string
  ): Promise<
    ApiResponse<{
      audience: number;
      sent: number;
      opens: number;
      clicks: number;
      revenue: number;
    }>
  > {
    return this.get(`/campaigns/${id}/metrics`);
  }

  // Email templates
  async getCampaignEmailTemplates(): Promise<ApiResponse<any>> {
    return this.get("/campaigns/templates/email");
  }
  async createCampaignEmailTemplate(data: {
    name: string;
    type: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
  }): Promise<ApiResponse<any>> {
    return this.post("/campaigns/templates/email", data);
  }
  async sendCampaignNow(
    id: string,
    payload: { templateId: string }
  ): Promise<ApiResponse<any>> {
    return this.post(`/campaigns/${id}/send`, payload);
  }
  async sendTestEmail(email: string): Promise<ApiResponse<any>> {
    return this.post("/email-templates/test", { email });
  }
  async createEmailTemplate(data: {
    name: string;
    type:
    | "ORDER_CONFIRMATION"
    | "SHIPPING_NOTIFICATION"
    | "WELCOME_EMAIL"
    | "LOW_INVENTORY_ALERT"
    | "ORDER_CANCELLED"
    | "PAYMENT_FAILED"
    | "PASSWORD_RESET"
    | "ACCOUNT_VERIFICATION"
    | "MARKETING_GENERIC";
    subject: string;
    contentType: "HTML_CONTENT" | "TEXT_CONTENT";
    htmlContent?: string;
    textContent?: string;
    backgroundImages?: string[];
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.post("/email-templates", data);
  }
  async getEmailTemplate(type: string): Promise<ApiResponse<any>> {
    return this.get(`/email-templates/${type}`);
  }

  async getDashboardAnalytics(
    range?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom" | "all",
    from?: Date,
    to?: Date,
    salesChannelId?: string,
    usePSTFilter?: boolean
  ): Promise<
    ApiResponse<{
      totalRevenue: number;
      revenueChange: number;
      totalOrders: number;
      orderChange: number;
      totalCustomers: number;
      customerChange: number;
      activeProducts: number;
      productChange: number;
      customerLifetimeValue: number;
      clvChange: number;
      recentOrders: Array<{
        id: string;
        customer: string;
        email: string;
        amount: number;
        status: string;
        date: string;
      }>;
      topProducts: Array<{
        id: string;
        name: string;
        sales: number;
        revenue: number;
        stock: number;
        trend: string;
      }>;
      customerTypeData: Array<{
        name: string;
        value: number;
        color: string;
        count: number;
      }>;
      salesData: Array<{ month: string, revenue: number, orders: number }>;
    }>
  > {
    const params = new URLSearchParams();
    if (range) params.set("range", String(range));
    if (from) {
      const yyyy = from.getFullYear();
      const mm = String(from.getMonth() + 1).padStart(2, '0');
      const dd = String(from.getDate()).padStart(2, '0');
      params.set("from", `${yyyy}-${mm}-${dd}`);
    }
    if (to) {
      const yyyy = to.getFullYear();
      const mm = String(to.getMonth() + 1).padStart(2, '0');
      const dd = String(to.getDate()).padStart(2, '0');
      params.set("to", `${yyyy}-${mm}-${dd}`);
    }
    if (salesChannelId) params.set("salesChannelId", salesChannelId);
    if (usePSTFilter) params.set("usePSTFilter", "true");
    const qs = params.toString();
    return this.get(`/analytics/dashboard${qs ? `?${qs}` : ""}`);
  }

  async getSkuPerformanceAnalytics(
    range?: "7_days" | "1_month" | "3_months" | "6_months" | "12_months" | "all_time" | "custom",
    from?: Date,
    to?: Date,
    salesChannelId?: string
  ): Promise<
    ApiResponse<
      Array<{
        id: string;
        sku: string;
        name: string;
        productName: string;
        totalSold: number;
        startDate: string;
        endDate: string;
      }>
    >
  > {
    const params = new URLSearchParams();
    if (range) params.set("range", String(range));
    if (from) params.set("from", from.toISOString());
    if (to) params.set("to", to.toISOString());
    if (salesChannelId) params.set("salesChannelId", salesChannelId);
    params.set("usePSTFilter", "true");
    const qs = params.toString();
    return this.get(`/analytics/sku-performance${qs ? `?${qs}` : ""}`);
  }

  async getSkuComparison(
    variantId: string,
    period: "week" | "month",
    salesChannelId?: string
  ): Promise<
    ApiResponse<{
      variantId: string;
      sku: string;
      name: string;
      productName: string;
      totalOutflow: number;
      period: string;
      comparison: {
        current: {
          label: string;
          total: number;
          daily: Array<{ date: string; value: number }>;
        };
        previous: {
          label: string;
          total: number;
          daily: Array<{ date: string; value: number }>;
        };
      };
    }>
  > {
    const params = new URLSearchParams();
    params.set("period", period);
    if (salesChannelId) params.set("salesChannelId", salesChannelId);
    params.set("usePSTFilter", "true");
    const qs = params.toString();
    return this.get(`/analytics/sku/${variantId}/comparison${qs ? `?${qs}` : ""}`);
  }

  async getSkuPerformanceHistory(
    variantId: string,
    period: "week" | "month" = "week",
    salesChannelId?: string
  ): Promise<
    ApiResponse<{
      summary: {
        totalUnits: number;
        startDate: string;
        endDate: string;
        label: string;
      };
      weeks: Array<{
        label: string;
        total: number;
        delta: number | null;
      }>;
    }>
  > {
    const params = new URLSearchParams();
    params.set("period", period);
    if (salesChannelId) params.set("salesChannelId", salesChannelId);
    params.set("usePSTFilter", "true");
    const qs = params.toString();
    return this.get(`/analytics/sku/${variantId}/performance-history${qs ? `?${qs}` : ""}`);
  }

  async getSalesReports(
    range?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom",
    from?: Date,
    to?: Date,
    detailed?: boolean,
    salesChannelId?: string,
    usePSTFilter?: boolean
  ) {
    const params = new URLSearchParams();
    if (range) params.set("range", String(range));
    // Send dates as YYYY-MM-DD to avoid timezone conversion issues
    if (from) {
      const yyyy = from.getFullYear();
      const mm = String(from.getMonth() + 1).padStart(2, '0');
      const dd = String(from.getDate()).padStart(2, '0');
      params.set("from", `${yyyy}-${mm}-${dd}`);
    }
    if (to) {
      const yyyy = to.getFullYear();
      const mm = String(to.getMonth() + 1).padStart(2, '0');
      const dd = String(to.getDate()).padStart(2, '0');
      params.set("to", `${yyyy}-${mm}-${dd}`);
    }
    if (detailed) params.set("detailed", "true");
    if (salesChannelId) params.set("salesChannelId", salesChannelId);
    if (usePSTFilter) params.set("usePSTFilter", "true");
    const qs = params.toString();
    return this.get(`/analytics/sales${qs ? `?${qs}` : ""}`);
  }

  async sendSalesEmailReport(data: {
    email: string;
    range?: string;
    from?: string;
    to?: string;
    usePSTFilter?: boolean;
  }): Promise<ApiResponse> {
    return this.post("/analytics/email-report", {
      ...data,
      usePSTFilter: data.usePSTFilter ? "true" : "false",
    });
  }

  async getSalesByRegion(
    range?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom",
    from?: Date,
    to?: Date,
    state?: string,
    city?: string,
    salesChannelId?: string
  ) {
    const params = new URLSearchParams();
    if (range) params.set("range", String(range));
    if (from) {
      const yyyy = from.getFullYear();
      const mm = String(from.getMonth() + 1).padStart(2, '0');
      const dd = String(from.getDate()).padStart(2, '0');
      params.set("from", `${yyyy}-${mm}-${dd}`);
    }
    if (to) {
      const yyyy = to.getFullYear();
      const mm = String(to.getMonth() + 1).padStart(2, '0');
      const dd = String(to.getDate()).padStart(2, '0');
      params.set("to", `${yyyy}-${mm}-${dd}`);
    }
    if (state) params.set("state", state);
    if (city) params.set("city", city);
    if (salesChannelId) params.set("salesChannelId", salesChannelId);
    const qs = params.toString();
    return this.get(`/analytics/sales/by-region${qs ? `?${qs}` : ""}`);
  }

  async getSalesRegionFilters() {
    return this.get(`/analytics/sales/regions/filters`);
  }

  async getProductPerformance(
    range?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom" | "all",
    from?: Date,
    to?: Date,
    salesChannelId?: string
  ) {
    const params = new URLSearchParams();
    if (range) params.set("range", String(range));
    if (from) {
      const yyyy = from.getFullYear();
      const mm = String(from.getMonth() + 1).padStart(2, '0');
      const dd = String(from.getDate()).padStart(2, '0');
      params.set("from", `${yyyy}-${mm}-${dd}`);
    }
    if (to) {
      const yyyy = to.getFullYear();
      const mm = String(to.getMonth() + 1).padStart(2, '0');
      const dd = String(to.getDate()).padStart(2, '0');
      params.set("to", `${yyyy}-${mm}-${dd}`);
    }
    if (salesChannelId) params.set("salesChannelId", salesChannelId);
    params.set("usePSTFilter", "true");
    const qs = params.toString();
    return this.get(`/analytics/products${qs ? `?${qs}` : ""}`);
  }

  async getCustomerInsights(
    range?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom",
    from?: Date,
    to?: Date,
    search?: string,
    managerId?: string,
    salesChannelId?: string
  ) {
    const params = new URLSearchParams();
    if (range) params.set("range", String(range));
    if (from) params.set("from", from.toISOString());
    if (to) params.set("to", to.toISOString());
    if (search) params.set("search", search);
    if (managerId) params.set("managerId", managerId);
    if (salesChannelId) params.set("salesChannelId", salesChannelId);
    params.set("usePSTFilter", "true");
    const qs = params.toString();
    return this.get(`/analytics/customers${qs ? `?${qs}` : ""}`);
  }


  async getCustomerSummary(customerId: string) {
    return this.get(`/analytics/customers/${customerId}/summary`);
  }

  async getSalesRepPerformance(
    range?: "7d" | "14d" | "30d" | "90d" | "365d" | "custom" | "all",
    from?: Date,
    to?: Date,
    independent?: boolean
  ): Promise<ApiResponse<SalesRepPerformanceResponse>> {
    const params = new URLSearchParams();
    if (range) params.set("range", range);
    if (independent) params.set("independent", "true");
    if (from) {
      const yyyy = from.getFullYear();
      const mm = String(from.getMonth() + 1).padStart(2, '0');
      const dd = String(from.getDate()).padStart(2, '0');
      params.set("from", `${yyyy}-${mm}-${dd}`);
    }
    if (to) {
      const yyyy = to.getFullYear();
      const mm = String(to.getMonth() + 1).padStart(2, '0');
      const dd = String(to.getDate()).padStart(2, '0');
      params.set("to", `${yyyy}-${mm}-${dd}`);
    }
    params.set("usePSTFilter", "true");
    const qs = params.toString();
    return this.get(`/sales-reps/performance${qs ? `?${qs}` : ""}`);
  }

  // Notifications
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    type?: string;
    priority?: string;
    isRead?: boolean;
    customerId?: string;
  }): Promise<ApiResponse<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      isRead: boolean;
      metadata?: any;
      customer?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        customerType: string;
      };
      order?: {
        id: string;
        orderNumber: string;
        totalAmount: number;
        status: string;
      };
      createdAt: string;
      readAt?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
    if (params?.customerId) queryParams.append('customerId', params.customerId);

    const qs = queryParams.toString();
    return this.get(`/notifications${qs ? `?${qs}` : ''}`);
  }

  async getTierUpgradeNotifications(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      isRead: boolean;
      metadata?: any;
      customer?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        customerType: string;
      };
      order?: {
        id: string;
        orderNumber: string;
        totalAmount: number;
        status: string;
      };
      createdAt: string;
      readAt?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const qs = queryParams.toString();
    return this.get(`/notifications/tier-upgrades${qs ? `?${qs}` : ''}`);
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse<any>> {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<{ updatedCount: number }>> {
    return this.request('/notifications/mark-all-read', {
      method: 'PATCH'
    });
  }

  async getUnreadNotificationCount(): Promise<ApiResponse<{ count: number }>> {
    return this.get('/notifications/unread-count');
  }

  // Bulk Quote methods
  async getBulkQuotes(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    customerId?: string;
    productId?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedData<BulkQuote>>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.isRead !== undefined) qs.set('isRead', String(params.isRead));
    if (params?.customerId) qs.set('customerId', params.customerId);
    if (params?.productId) qs.set('productId', params.productId);
    if (params?.search) qs.set('search', params.search);

    const queryString = qs.toString();
    return this.get(`/bulk-quotes${queryString ? `?${queryString}` : ''}`);
  }

  async getBulkQuote(id: string): Promise<ApiResponse<BulkQuote>> {
    return this.get(`/bulk-quotes/${id}`);
  }

  async createBulkQuote(data: CreateBulkQuoteRequest): Promise<ApiResponse<BulkQuote>> {
    return this.request('/bulk-quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markBulkQuoteAsRead(id: string): Promise<ApiResponse<BulkQuote>> {
    return this.request(`/bulk-quotes/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markBulkQuoteAsUnread(id: string): Promise<ApiResponse<BulkQuote>> {
    return this.request(`/bulk-quotes/${id}/unread`, {
      method: 'PATCH',
    });
  }

  async deleteBulkQuote(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/bulk-quotes/${id}`, {
      method: 'DELETE',
    });
  }

  // Sales Manager methods
  async getSalesManagers(params?: { search?: string }): Promise<ApiResponse<any[]>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    return this.get(`/sales-managers?${qs.toString()}`);
  }

  async getSalesManager(id: string): Promise<ApiResponse<any>> {
    return this.get(`/sales-managers/${id}`);
  }

  async salesManagerAssignCustomers(managerId: string, customerIds: string[]): Promise<ApiResponse<any>> {
    return this.put(`/sales-managers/${managerId}/assignments`, { customerIds });
  }

  // Sales Rep methods
  async getSalesRep(id: string): Promise<ApiResponse<any>> {
    return this.get(`/sales-reps/${id}`);
  }

  async getUnassignedCustomers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const qs = queryParams.toString();
    return this.get(`/sales-reps/assignment-candidates${qs ? `?${qs}` : ''}`);
  }

  async getUnassignedCustomersForManager(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const qs = queryParams.toString();
    return this.get(`/sales-managers/assignment-candidates${qs ? `?${qs}` : ''}`);
  }

  async updateCustomerSalesRep(customerId: string, salesRepId: string): Promise<ApiResponse<any>> {
    return this.request(`/customers/${customerId}/sales-rep`, {
      method: 'PUT',
      body: JSON.stringify({ salesRepId }),
    });
  }

  async assignCustomerToSalesRep(customerId: string): Promise<ApiResponse<any>> {
    return this.request('/sales-reps/assign-customer', {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    });
  }

  async assignCustomerToSalesManager(customerId: string): Promise<ApiResponse<any>> {
    return this.request('/sales-managers/assign-customer', {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    });
  }

  // Warehouse and shipping methods
  async calculateShippingFromWarehouse(customerAddressId: string, items: Array<{ variantId: string, quantity: number }>) {
    return this.request<{
      warehouse: {
        id: string;
        name: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
      };
      distance: number;
      stockAvailable: boolean;
      shippingRate: {
        rate: number;
        carrier: string;
        estimatedDays: number;
        distance: number;
        warehouse: string;
        warehouseLocation: string;
        reason?: string;
      };
      stockDetails: Record<string, { available: number, required: number }>;
    }>('/orders/calculate-shipping', {
      method: 'POST',
      body: JSON.stringify({ customerAddressId, items }),
    });
  }

  async calculateCheckoutShippingRates(data: {
    customerAddressId: string;
    items: Array<{ variantId: string, quantity: number }>;
    weightOz?: number;
    dimensions?: { length: number, width: number, height: number };
    carrierCode?: string;
    serviceCode?: string;
    packageCode?: string;
    shipFrom: {
      country_code: string;
      postal_code: string;
      city_locality: string;
      state_province: string;
      address_line1: string;
    };
  }) {
    return this.request<{
      warehouse: {
        id: string;
        name: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
      };
      distance: number;
      stockAvailable: boolean;
      shippingRate: {
        rate: number;
        carrier: string;
        service: string;
        estimatedDays: number;
        distance: number;
        warehouse: string;
        warehouseLocation: string;
        shipstationRateId?: string;
        allRates?: Array<{
          rate: number;
          carrier: string;
          service: string;
          estimatedDays: number;
          rateId: string;
        }>;
        fallback?: boolean;
        error?: string;
      };
      stockDetails: Record<string, { available: number, required: number }>;
      shipFrom: {
        country_code: string;
        postal_code: string;
        city_locality: string;
        state_province: string;
        address_line1: string;
      };
    }>('/orders/checkout/shipping-rates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ShipStation methods
  async getShipStationCarriers(): Promise<ApiResponse<any[]>> {
    return this.get('/shipstation/carriers');
  }

  async getShipStationCarrierServices(carrierId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/shipstation/carriers/${carrierId}/services`);
  }

  async getShipStationCarrierPackages(carrierId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/shipstation/carriers/${carrierId}/packages`);
  }

  async getShipStationWarehouses(): Promise<ApiResponse<any[]>> {
    return this.get('/shipstation/warehouses');
  }

  async getShipStationLabelStatus(labelId: string): Promise<ApiResponse<any>> {
    return this.get(`/shipstation/labels/${labelId}`);
  }

  async calculateShippingRates(data: {
    shipment_request?: any;
    rate_options?: any;
    shipTo?: any;
    shipFrom?: any;
    weightOz?: number;
    dimensions?: any;
    carrierCode?: string;
    serviceCode?: string;
    packageCode?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/shipstation/rates/estimate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createShipStationLabel(data: {
    orderId: string;
    shipTo: any;
    shipFrom: any;
    carrierCode: string;
    serviceCode: string;
    packageCode: string;
    weightOz: number;
    dimensions?: any;
  }): Promise<ApiResponse<any>> {
    return this.request('/shipstation/labels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncShipmentTracking(data: {
    orderId: string;
    trackingNumber?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/shipstation/tracking/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrderTrackingEvents(orderId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/orders/${orderId}/tracking-events`);
  }

  async createShippingLabel(data: any): Promise<ApiResponse<any>> {
    return this.post('/shipstation/labels', data);
  }

  // Third Party Reports
  async getThirdPartyReports(category?: string): Promise<ApiResponse<ThirdPartyReport[]>> {
    return this.get(`/third-party-reports${category ? `?category=${category}` : ''}`);
  }

  async linkReportToItems(reportId: string, data: { productIds?: string[]; variantIds?: string[] }): Promise<ApiResponse<ThirdPartyReport>> {
    return this.post(`/third-party-reports/${reportId}/links`, data);
  }

  async unlinkReportFromItems(reportId: string, data: { productIds?: string[]; variantIds?: string[] }): Promise<ApiResponse<ThirdPartyReport>> {
    return this.request(`/third-party-reports/${reportId}/links`, {
      method: "DELETE",
      body: JSON.stringify(data),
    });
  }
}

// Create and export API client instance
export const api = new ApiClient(API_BASE_URL);

// Utility functions for common operations
export const resolveImageUrl = (url?: string | null): string => {
  const fallback = "/peptide-vial-bpc157.png";
  if (!url) return fallback;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    const base = API_BASE_URL.replace(/\/$/, "").replace(/\/api$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${base}${path}`;
  } catch {
    return fallback;
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
};

// ========================================
// Custom Location Management
// ========================================

/**
 * Get all available countries from custom locations
 */
export const getCustomCountries = async (): Promise<ApiResponse<string[]>> => {
  return api.get('/locations/custom/countries');
};

/**
 * Get states for a specific country
 */
export const getCustomStates = async (country: string): Promise<ApiResponse<string[]>> => {
  return api.get(`/locations/custom/states?country=${encodeURIComponent(country)}`);
};

/**
 * Get cities for a specific country and optionally state
 */
export const getCustomCities = async (country: string, state?: string): Promise<ApiResponse<string[]>> => {
  const params = new URLSearchParams({ country });
  if (state) params.append('state', state);
  return api.get(`/locations/custom/cities?${params.toString()}`);
};

/**
 * Admin: Get all custom locations with pagination
 */
export const getCustomLocations = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  state?: string;
  isActive?: boolean;
}): Promise<ApiResponse<{
  locations: Array<{
    id: string;
    country: string;
    state: string | null;
    city: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.country) queryParams.append('country', params.country);
  if (params?.state) queryParams.append('state', params.state);
  if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

  const qs = queryParams.toString();
  return api.get(`/locations/custom${qs ? `?${qs}` : ''}`);
};

/**
 * Admin: Create a new custom location
 */
export const createCustomLocation = async (data: {
  country: string;
  state?: string | null;
  city?: string | null;
  isActive?: boolean;
}): Promise<ApiResponse<any>> => {
  return api.post('/locations/custom', data);
};

/**
 * Admin: Update a custom location
 */
export const updateCustomLocation = async (
  id: string,
  data: {
    country?: string;
    state?: string | null;
    city?: string | null;
    isActive?: boolean;
  }
): Promise<ApiResponse<any>> => {
  return api.put(`/locations/custom/${id}`, data);
};

/**
 * Admin: Delete a custom location
 */
export const deleteCustomLocation = async (id: string): Promise<ApiResponse<any>> => {
  return api.delete(`/locations/custom/${id}`);
};

/**
 * Admin: Bulk delete custom locations
 */
export const bulkDeleteCustomLocations = async (ids: string[]): Promise<ApiResponse<{ count: number }>> => {
  return api.post('/locations/custom/bulk-delete', { ids });
};

/**
 * Public: Get third-party reports linked to a product
 */
export const getPublicReportsForProduct = async (productId: string): Promise<ApiResponse<any[]>> => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  try {
    const res = await fetch(`${API_URL}/public-third-party-reports/product/${productId}`);
    return await res.json();
  } catch (error) {
    return { success: false, error: 'Failed to fetch reports' };
  }
};

/**
 * Public: Get presigned download URL for a third-party report
 */
export const getPublicReportDownloadUrl = async (reportId: string, mode: 'inline' | 'attachment' = 'attachment'): Promise<ApiResponse<{ url: string }>> => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  try {
    const res = await fetch(`${API_URL}/public-third-party-reports/${reportId}/download-url?mode=${mode}`);
    return await res.json();
  } catch (error) {
    return { success: false, error: 'Failed to get download URL' };
  }
};


export const getStatusColor = (status: string): string => {
  const statusColors: { [key: string]: string } = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    SHIPPED: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-gray-100 text-gray-800",
    ON_HOLD: "bg-orange-100 text-orange-800",
    ACTIVE: "bg-green-100 text-green-800",
    INACTIVE: "bg-gray-100 text-gray-800",
    DRAFT: "bg-gray-100 text-gray-800",
    ARCHIVED: "bg-red-100 text-red-800",
  };
  return statusColors[status] || "bg-gray-100 text-gray-800";
};