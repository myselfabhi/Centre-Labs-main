# Centre Research Peptide Store API Documentation

## Overview

This API provides a comprehensive backend for the Centre Research peptide store e-commerce platform. It includes user management with RBAC, product and variant management, order processing, customer management, and more.

## Base URL
```
http://localhost:5000/api
```

## Authentication

All API endpoints (except auth endpoints) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All responses follow this standard format:

```json
{
  "success": true|false,
  "message": "Optional message",
  "data": {} | [],
  "error": "Error message if success is false"
}
```

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## Authentication Endpoints

### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "ADMIN" // Optional: ADMIN, MANAGER, STAFF (default: STAFF)
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "admin@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!"
}
```

### GET /auth/profile
Get current user profile. Requires authentication.

### PUT /auth/profile
Update current user profile. Requires authentication.

### PUT /auth/change-password
Change user password. Requires authentication.

**Request Body:**
```json
{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass123!"
}
```

---

## User Management Endpoints

### GET /users
Get all users with pagination and filters. Requires ADMIN or MANAGER role.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `role` (optional): Filter by role (ADMIN, MANAGER, STAFF)
- `isActive` (optional): Filter by active status (true/false)
- `search` (optional): Search in firstName, lastName, email

**Example:**
```
GET /api/users?page=1&limit=10&role=STAFF&search=john
```

### GET /users/:id
Get user by ID. Requires ADMIN or MANAGER role.

### POST /users
Create a new user. Requires ADMIN role.

**Request Body:**
```json
{
  "email": "staff@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "STAFF",
  "isActive": true
}
```

### PUT /users/:id
Update user. Requires ADMIN role.

### DELETE /users/:id
Soft delete user (sets isActive to false). Requires ADMIN role.

### POST /users/:id/reset-password
Reset user password. Requires ADMIN role.

### PUT /users/:id/permissions
Manage user permissions. Requires ADMIN role.

**Request Body:**
```json
{
  "permissions": [
    {
      "module": "PRODUCTS",
      "action": "CREATE",
      "granted": true
    },
    {
      "module": "PRODUCTS",
      "action": "READ",
      "granted": true
    }
  ]
}
```

---

## Customer Management Endpoints

### GET /customers
Get all customers with pagination and filters.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `customerType` (optional): B2C, B2B, ENTERPRISE
- `isActive` (optional): true/false
- `search` (optional): Search in firstName, lastName, email, mobile

### GET /customers/:id
Get customer by ID with full details including addresses, recent orders, and reviews.

### POST /customers
Create a new customer.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Customer",
  "middleName": "Middle",
  "email": "customer@example.com",
  "mobile": "+1234567890",
  "customerType": "B2C",
  "isActive": true,
  "tags": ["vip", "newsletter"],
  "addresses": [
    {
      "type": "BILLING",
      "firstName": "John",
      "lastName": "Customer",
      "address1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US",
      "phone": "+1234567890"
    }
  ]
}
```

### PUT /customers/:id
Update customer information.

### DELETE /customers/:id
Soft delete customer (deactivate).

### GET /customers/:id/addresses
Get all addresses for a customer.

### POST /customers/:id/addresses
Create a new address for a customer.

### PUT /customers/:customerId/addresses/:addressId
Update customer address.

### DELETE /customers/:customerId/addresses/:addressId
Delete customer address.

### GET /customers/:id/orders
Get all orders for a customer with pagination.

---

## Product Management Endpoints

### GET /products
Get all products with pagination and filters.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): DRAFT, ACTIVE, INACTIVE, ARCHIVED
- `search` (optional): Search in name, description
- `category` (optional): Filter by category

### GET /products/:id
Get product by ID with full details including variants, images, categories, and reviews.

### POST /products
Create a new product with variants.

**Request Body:**
```json
{
  "name": "Premium Peptide Supplement",
  "description": "High-quality peptide supplement for research purposes",
  "status": "ACTIVE",
  "categories": ["Supplements", "Research"],
  "tags": ["premium", "peptide"],
  "images": [
    {
      "url": "/uploads/image1.jpg",
      "altText": "Product image",
      "sortOrder": 0
    }
  ],
  "variants": [
    {
      "sku": "PP-001-10MG",
      "name": "10mg Vial",
      "description": "10mg vial variant",
      "regularPrice": "99.99",
      "salePrice": "89.99",
      "weight": "0.05",
      "hsn": "3004",
      "seoTitle": "Premium Peptide 10mg",
      "seoDescription": "High quality 10mg peptide vial",
      "seoSlug": "premium-peptide-10mg",
      "isActive": true,
      "options": [
        {
          "name": "Size",
          "value": "10mg"
        },
        {
          "name": "Form",
          "value": "Vial"
        }
      ]
    }
  ]
}
```

### PUT /products/:id
Update product information.

### DELETE /products/:id
Soft delete product (sets status to ARCHIVED).

### POST /products/:id/variants
Create a new variant for an existing product.

### PUT /products/:productId/variants/:variantId
Update product variant.

### DELETE /products/:productId/variants/:variantId
Soft delete variant (sets isActive to false).

---

## Order Management Endpoints

### GET /orders
Get all orders with pagination and filters.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED, ON_HOLD
- `customerId` (optional): Filter by customer
- `search` (optional): Search in order number, customer details
- `dateFrom` (optional): Filter orders from date (ISO8601)
- `dateTo` (optional): Filter orders to date (ISO8601)

### GET /orders/:id
Get order by ID with full details including customer, items, payments, and shipments.

### POST /orders
Create a new order.

**Request Body:**
```json
{
  "customerId": "customer_id_here",
  "billingAddressId": "billing_address_id",
  "shippingAddressId": "shipping_address_id",
  "items": [
    {
      "variantId": "variant_id_here",
      "quantity": 2,
      "unitPrice": "99.99"
    }
  ],
  "discountAmount": "10.00",
  "shippingAmount": "15.00",
  "taxAmount": "16.00"
}
```

### PUT /orders/:id
Update order information.

### PATCH /orders/:id/status
Update order status with optional note.

**Request Body:**
```json
{
  "status": "PROCESSING",
  "note": "Order has been confirmed and is being processed"
}
```

### POST /orders/:id/notes
Add a note to an order.

**Request Body:**
```json
{
  "note": "Customer requested expedited shipping",
  "isInternal": true
}
```

### GET /orders/:id/notes
Get all notes for an order.

### DELETE /orders/:id
Cancel order (sets status to CANCELLED).

---

## File Upload Endpoint

### POST /upload
Upload a file (images, documents).

**Request:**
- Content-Type: multipart/form-data
- Field name: `file`
- Supported types: Images and documents
- Max size: 10MB

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "filename": "file-timestamp-random.jpg",
    "originalname": "product-image.jpg",
    "mimetype": "image/jpeg",
    "size": 1024576,
    "url": "/uploads/file-timestamp-random.jpg"
  }
}
```

---

## Role-Based Access Control (RBAC)

### User Roles:
- **ADMIN**: Full access to all functionality
- **MANAGER**: Access to most functionality except user management
- **STAFF**: Limited access based on granted permissions

### Permission Modules:
- `USERS` - User management
- `CUSTOMERS` - Customer management  
- `PRODUCTS` - Product and variant management
- `ORDERS` - Order management
- `INVENTORY` - Inventory management
- `PAYMENTS` - Payment processing
- `SHIPPING` - Shipping management
- `PROMOTIONS` - Promotions and discounts
- `ANALYTICS` - Reports and analytics
- `SETTINGS` - System configuration

### Permission Actions:
- `CREATE` - Create new records
- `READ` - View records
- `UPDATE` - Modify existing records
- `DELETE` - Delete records

---

## Health Check

### GET /health
Check API health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 123.45,
  "environment": "development"
}
```

---

## Error Examples

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required",
      "value": "invalid-email"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "error": "Access denied. No token provided."
}
```

### Permission Error (403)
```json
{
  "success": false,
  "error": "Access denied. Missing CREATE permission for PRODUCTS."
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "error": "Product not found"
}
```

### Conflict Error (409)
```json
{
  "success": false,
  "error": "SKU already exists"
}
```

---

## Getting Started

1. **Setup Environment**: Copy `.env.example` to `.env` and configure your environment variables.

2. **Install Dependencies**: 
   ```bash
   npm install
   ```

3. **Setup Database**: 
   ```bash
   npm run db:generate
   npm run migrate
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Create First Admin User**: Use the `/auth/register` endpoint to create your first admin user.

6. **Test API**: Visit `http://localhost:5000/health` to verify the API is running.

---

## Priority Implementation Order

Based on your requirements, focus on these areas first:

1. **User Management with RBAC** ✅ **Implemented**
   - User registration/login
   - Role-based permissions
   - User CRUD operations

2. **Product Management** ✅ **Implemented**
   - Products with variants
   - SKU management
   - Categories and tags
   - Image handling

3. **Order Management** ✅ **Implemented**
   - Order creation and updates
   - Order status management
   - Order notes and audit trails

4. **Customer Management** ✅ **Implemented**
   - Customer profiles
   - Address management
   - Customer types (B2C, B2B, Enterprise)

The remaining modules (inventory, payments, shipping, etc.) have placeholder endpoints and can be implemented as needed based on your priorities.

---

For additional support or questions, please refer to the codebase or create an issue in the project repository.