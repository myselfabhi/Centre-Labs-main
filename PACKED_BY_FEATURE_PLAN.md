# Implementation Plan - Packed By Feature

## Overview
This plan outlines the steps to implement a "Packed By" feature, allowing the operations team to track which staff member packed a specific order. The packer will be selected when updating the order status, and this information will be visible in the orders list.

## 1. Database Schema Changes
**File:** `nodejs-api/prisma/schema.prisma`

*   **Update `Order` Model**:
    *   Add optional field `packedById`.
    *   Add relation to `User` model.
    ```prisma
    model Order {
      // ... existing fields
      packedById String?
      packedBy   User?   @relation("OrderPackedBy", fields: [packedById], references: [id])
    }
    ```
*   **Update `User` Model**:
    *   Add inverse relation.
    ```prisma
    model User {
      // ... existing fields
      packedOrders Order[] @relation("OrderPackedBy")
    }
    ```

## 2. Backend Implementation (`nodejs-api`)
**File:** `nodejs-api/routes/orders.js`

*   **Update Order Retrieval (`GET /` and `GET /:id`)**:
    *   Modify the `include` object in `prisma.order.findMany` and `prisma.order.findUnique` calls.
    *   Include `packedBy` relation to fetch packer's details (e.g., `firstName`, `lastName`).
    ```javascript
    include: {
      // ... existing includes
      packedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
    ```

*   **Update Order Status Endpoint (`PATCH /:id/status`)**:
    *   Update the route handler to accept `packedById` in `req.body`.
    *   Include `packedById` in the `prisma.order.update` data payload.
    ```javascript
    const { status, note, packedById } = req.body;
    // ...
    const updateData = { status };
    if (packedById !== undefined) updateData.packedById = packedById; // Allow clearing if null passed? Or just updating.
    
    // In transaction
    await tx.order.update({
        where: { id },
        data: updateData
    });
    ```

## 3. Frontend Implementation (`nextjs-frontend`)

### 3.1. API Client Updates
**File:** `src/lib/api.ts`

*   **Update `Order` Interface**:
    *   Add `packedById?: string;`
    *   Add `packedBy?: User;` (or partial user object).
*   **Update `updateOrderStatus` Method**:
    *   Update signature to accept `packedById`.
    ```typescript
    async updateOrderStatus(
      id: string,
      status: string,
      note?: string,
      packedById?: string // New optional parameter
    ): Promise<ApiResponse> {
      return this.request(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note, packedById }),
      });
    }
    ```

### 3.2. Order Status Dialog
**File:** `src/components/orders/order-status-dialog.tsx`

*   **State Management**:
    *   Add state for `packedById`.
    *   Initialize it with `order?.packedById`.
    *   Add state for `staffUsers` (list of potential packers).
*   **Fetch Staff**:
    *   On component mount (or when dialog opens), fetch users using `api.getUsers({ role: 'STAFF' })` (and potentially 'ADMIN'/'MANAGER' if they pack orders too).
*   **UI Updates**:
    *   Add a `Select` component (combobox or dropdown) labeled "Packed By".
    *   Populate options from the fetched `staffUsers`.
    *   Pass the selected `packedById` to the `api.updateOrderStatus` call in `handleSubmit`.

### 3.3. Orders Table
**File:** `src/components/orders/orders-table.tsx`

*   **Columns Definition**:
    *   Add a new column header "Packed By".
*   **Row Rendering**:
    *   In the row render logic, display the packer's name if available:
    ```typescript
    // Inside mapping
    <TableCell>
      {order.packedBy ? `${order.packedBy.firstName} ${order.packedBy.lastName}` : '-'}
    </TableCell>
    ```

### 3.4. Order Details View (Optional/Recommended)
**File:** `src/components/orders/view-order-details.tsx`

*   Add a field to display "Packed By" alongside other order details like Status and Date.

## 4. Workflow Summary
1.  **Migration**: Developer runs Prisma migration to update DB.
2.  **Backend**: API updated to handle new field.
3.  **Frontend**: 
    - User opens "Update Status" on order.
    - User selects "Processing" or "Shipped".
    - User selects "Packed By: [Staff Name]".
    - User clicks Update.
    - Order is updated.
    - Orders list shows [Staff Name] in "Packed By" column.
