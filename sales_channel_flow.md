# Sales Channel Implementation Plan

This document outlines the plan to implement the **Sales Channel** feature, enabling the management of external partners (e.g., Skydell) with distinct pricing and order correlation.

## 1. Schema Changes

We will modify `prisma/schema.prisma` to introduce `SalesChannel` entities and update the `Order` model.

### New Model: `SalesChannel`
Stores the identity and contact details of the partner.

```prisma
// Enums for strict typing
enum SalesChannelType {
  OWN
  PARTNER
}

enum FulfillmentModel {
  OWN_ECOMMERCE
  DROPSHIP
}

enum SalesChannelStatus {
  ACTIVE
  PAUSED
}

model SalesChannel {
  id               String             @id @default(cuid())
  companyName      String
  contactPerson    String
  contactNumber    String
  
  // New specific fields
  type             SalesChannelType   @default(PARTNER)
  fulfillmentModel FulfillmentModel   @default(DROPSHIP)
  paymentTerms     String?            // e.g., "Net 14", "Immediate"
  status           SalesChannelStatus @default(ACTIVE)
  apiKey           String             @unique @default(cuid()) // For external integrations

  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  // Relations
  prices           SalesChannelPrice[]
  orders           Order[]

  @@map("sales_channels")
}
```

### New Model: `SalesChannelPrice`
Stores the specific pricing for a product/variant for a given channel.

```prisma
model SalesChannelPrice {
  id             String   @id @default(cuid())
  salesChannelId String
  variantId      String
  price          Decimal  @db.Decimal(10, 2)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  salesChannel   SalesChannel   @relation(fields: [salesChannelId], references: [id], onDelete: Cascade)
  variant        ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([salesChannelId, variantId]) // Ensure one price per variant per channel
  @@map("sales_channel_prices")
}
```

### Update Model: `Order`
Add fields to correlate orders with the sales channel.

```prisma
model Order {
  // ... existing fields ...
  
  // New Fields
  salesChannelId String?
  partnerOrderId String?  // The ID from the external system (e.g., Skydell's order ID)

  // Relations Update
  salesChannel   SalesChannel? @relation(fields: [salesChannelId], references: [id])

  // Indexes to speed up lookups by partner order ID
  @@index([salesChannelId, partnerOrderId])
}
```

---

## 2. API Endpoints

We will create a new route handler structure under `app/api/sales-channels`.

### A. Create Sales Channel
- **Endpoint**: `POST /api/sales-channels`
- **Body**: `{ companyName, contactPerson, contactNumber, type, fulfillmentModel, paymentTerms, status }`
- **Action**: Creates a new `SalesChannel` record with the specified configuration.

### B. Get Sales Channels
- **Endpoint**: `GET /api/sales-channels`
- **Action**: Returns a list of all sales channels.

### C. Get Sales Channel Details
- **Endpoint**: `GET /api/sales-channels/[id]`
- **Action**: Returns details for a specific channel.

### D. Download Price List Template
- **Endpoint**: `GET /api/sales-channels/[id]/price-list/template`
- **Action**: 
  1. Fetches all active `ProductVariant` records.
  2. Generates a CSV with columns: `SKU`, `Product Name`, `Price`.
  3. Pre-fills `Price` if a `SalesChannelPrice` already exists, otherwise leaves it 0 or empty.
  4. Returns the CSV file stream.

### E. Upload Price List
- **Endpoint**: `POST /api/sales-channels/[id]/price-list/upload`
- **Body**: CSV File (multipart/form-data).
- **Action**:
  1. Parses the CSV.
  2. Validates `SKU` exists in `ProductVariant`.
  4. Returns a summary (e.g., "50 prices updated, 0 errors").

### F. External Order Creation (Protected by API Key)
- **Endpoint**: `POST /api/integration/orders`
- **Headers**: 
  - `X-API-Key`: `[SalesChannel.apiKey]`
- **Body**: 
  ```json
  {
    "partnerOrderId": "ORD-123",
    "customer": { "firstName": "...", "lastName": "...", "address": "..." },
    "items": [
      { "variantId": "cl...", "quantity": 2 }
    ]
  }
  ```
- **Logic**:
  1. **Authenticate**: Validate `X-API-Key` matches an active `SalesChannel`.
  2. **Pricing Lookup**:
     - For each item, look up the price in `SalesChannelPrice` table for this channel.
     - **CRITICAL**: Ignore any price sent in the payload. Use *only* the mapped price.
     - If price is missing for a variant, return immediately with a 400 Error ("Price missing for SKU...").
  3. **Order Creation**: 
     - Create order with `salesChannelId` attached.
     - Line items use the `SalesChannelPrice` values.
     - Status defaults to `Processing` (or similar).

---

## 3. Frontend Implementation

We will add a new section in the Settings area for managing Sales Channels.

### A. Sales Channel List Page
- **Path**: `/settings/sales-channels/page.tsx`
- **UI**:
  - Table displaying existing channels (Company Name, Contact Person).
  - "Create New Channel" button.

### B. Create/Edit Sales Channel Page
- **Path**: `/settings/sales-channels/[id]/page.tsx` (Use `new` for creation)
- **UI**:
  - **Details Section**:
    - `Company Name` (Text)
    - `Contact Person` (Text)
    - `Contact Number` (Text)
  - **Configuration Section**:
    - `Type`: Dropdown (Own / Partner)
    - `Fulfillment Model`: Dropdown (Own Ecommerce / Dropship)
    - `Payment Terms`: Text Input (e.g., "Net 14")
    - `Status`: Toggle or Dropdown (Active / Paused)
  - **Integration Section**:
    - `API Key`: Display the key (read-only) with a "Copy" button.
    - "Regenerate Key" button (optional for V1).
  - **Save Button**.

### C. Price List Management (Inside Edit Page)
- **UI**:
  - Section "Channel Pricing".
  - **"Download Price List" Button**: Triggers the template download endpoint.
  - **"Upload Price List" Button**: Opens a file picker to upload the CSV.
  - **Feedback**: Shows success message or error report after upload.

---

## 4. Implementation Steps (Execution Flow)

1.  **Database Migration**:
    - Update `schema.prisma`.
    - Run `prisma migrate dev` (or `db push` if local dev).
2.  **Backend Logic**:
    - Implement the API routes for CRUD and CSV handling.
3.  **Frontend Layout**:
    - Add "Sales Channels" to the settings sidebar navigation.
4.  **Frontend Forms**:
    - Build the Create/Edit form.
    - Build the CSV upload component.
5.  **Testing**:
    - Create a channel "Skydell".
    - Download the template.
    - Edit prices in Excel/Numbers.
    - Upload the CSV.
    - Verify data in the database.
