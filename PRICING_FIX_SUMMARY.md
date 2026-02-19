# Customer Segment Pricing Fix - Summary

## Problem Identified

The pricing based on customer type (B2C, B2B, ENTERPRISE_1, ENTERPRISE_2) was not working correctly in the cart. All customers were seeing the same base prices regardless of their customer type.

## Root Causes

### 1. **Missing Customer Data in Auth Responses**
**Location**: `nodejs-api/routes/auth.js` and `nodejs-api/middleware/auth.js`

**Issue**: When users logged in or the auth middleware verified tokens, the `customer` relationship was not being included in the database query. This meant:
- Frontend never received `user.customer.customerType`
- CartSidebar couldn't determine if user was B2B or other type
- Authentication responses lacked critical customer segmentation data

**Before**:
```javascript
const user = await prisma.user.findUnique({
  where: { email },
  include: {
    permissions: true,
    // ❌ customer relationship missing
  },
});
```

**After**:
```javascript
const user = await prisma.user.findUnique({
  where: { email },
  include: {
    permissions: true,
    customer: {  // ✅ Now included
      select: {
        id: true,
        customerType: true,
        isActive: true,
        isApproved: true,
      }
    }
  },
});
```

### 2. **Cart Pricing Ignored Customer Type**
**Location**: `nodejs-api/routes/cart.js`

**Issue**: The `computeUnitPrice()` function only looked at the variant's base `salePrice` and `regularPrice`, completely ignoring:
- Customer's `customerType` (B2C, B2B, ENTERPRISE_1, ENTERPRISE_2)
- Segment-specific pricing in the `segmentPrices` table
- Different pricing strategies for different customer segments

**Before**:
```javascript
function computeUnitPrice(variant) {
  // Prefer salePrice when present, else regularPrice
  const price = variant.salePrice ?? variant.regularPrice;
  return price;
}
```

**After**:
```javascript
function computeUnitPrice(variant, customerType) {
  // If customerType is provided and segment prices exist, use them
  if (customerType && variant.segmentPrices && variant.segmentPrices.length > 0) {
    const segmentPrice = variant.segmentPrices.find(sp => sp.customerType === customerType);
    if (segmentPrice) {
      // Prefer salePrice when present in segment pricing, else regularPrice
      return segmentPrice.salePrice ?? segmentPrice.regularPrice;
    }
  }
  
  // Fallback to variant's base prices
  // For B2B/ENTERPRISE customers without segment pricing, use regularPrice only (no sale)
  if (customerType && customerType !== 'B2C') {
    return variant.regularPrice;
  }
  
  // For B2C or no customer type, prefer salePrice then regularPrice
  return variant.salePrice ?? variant.regularPrice;
}
```

## Changes Made

### File: `nodejs-api/routes/auth.js`
- **Line ~251**: Updated user query in login endpoint to include customer relationship
- Now returns customer data with user object in login response

### File: `nodejs-api/middleware/auth.js`
- **Line ~18**: Updated authMiddleware to include customer relationship
- **Line ~128**: Updated optionalAuth to include customer relationship
- All authenticated requests now have access to `req.user.customer.customerType`

### File: `nodejs-api/routes/cart.js`
- **Line ~24-43**: Rewrote `computeUnitPrice()` function to accept and use `customerType` parameter
- **Line ~56-87**: Updated POST `/items` endpoint to fetch customer type and pass to `computeUnitPrice()`
- **Line ~145-179**: Updated POST `/merge` endpoint to fetch customer type and pass to `computeUnitPrice()`

## Pricing Logic Flow

### For B2C Customers:
1. Check if segment price exists for B2C → use segment salePrice or regularPrice
2. If no segment price → use variant's salePrice or regularPrice (shows sales)

### For B2B/ENTERPRISE Customers:
1. Check if segment price exists for their type → use segment salePrice or regularPrice
2. If no segment price → use variant's regularPrice only (no sales, consistent with business pricing)

### Example Scenario:
```
Product Variant: Peptide Complex A - 50ml
- Base regularPrice: $129.99
- Base salePrice: $119.99

Segment Prices:
- B2B: regularPrice $119.99, salePrice $109.99
- ENTERPRISE_1: regularPrice $109.99, salePrice $99.99

Results:
- B2C Customer: Sees $119.99 (base sale price)
- B2B Customer: Sees $109.99 (B2B segment sale price)
- ENTERPRISE_1 Customer: Sees $99.99 (Enterprise segment sale price)
- ENTERPRISE_2 Customer (no segment defined): Sees $129.99 (base regular, no sale)
```

## Database Schema Reference

From `prisma/schema.prisma`:

```prisma
model Customer {
  customerType CustomerType @default(B2C)
  // ... other fields
}

enum CustomerType {
  B2C
  B2B
  ENTERPRISE_1
  ENTERPRISE_2
}

model SegmentPrice {
  id           String       @id @default(cuid())
  variantId    String
  customerType CustomerType
  regularPrice Decimal      @db.Decimal(10, 2)
  salePrice    Decimal?     @db.Decimal(10, 2)
  // ... relations
}
```

## Testing Recommendations

1. **Test B2C Customer**:
   - Login as B2C customer
   - Add product to cart
   - Verify price matches base sale price or regular price

2. **Test B2B Customer**:
   - Login as B2B customer
   - Add same product to cart
   - Verify price matches B2B segment pricing if configured

3. **Test ENTERPRISE Customers**:
   - Login as ENTERPRISE_1 or ENTERPRISE_2 customer
   - Add products to cart
   - Verify enterprise segment pricing applies

4. **Test Products Without Segment Pricing**:
   - Ensure B2B/Enterprise customers see regular price (not sale price)
   - Ensure B2C customers still see sale prices

## Frontend Compatibility

The frontend (`CartSidebar.tsx`) already has logic to use segment pricing:
```typescript
const isB2B = (user as any)?.customer?.customerType === 'B2B';

// Price calculation logic
if (isB2B) {
  const seg = (it as any)?.variant?.segmentPrices?.find?.((sp: any) => sp.customerType === 'B2B');
  if (seg) price = Number(seg.salePrice ?? seg.regularPrice ?? price);
  else price = Number(it.variant?.regularPrice ?? price);
}
```

This code will now work correctly because:
1. `user.customer.customerType` is now populated from backend
2. Backend stores correct segment-aware prices in `CartItem.unitPrice`
3. Frontend can also recalculate on-the-fly using segmentPrices data

## Deployment Notes

- No database migrations required (schema already supports this)
- Restart Node.js API service after deploying changes
- No frontend changes needed (already compatible)
- Existing cart items may need to be refreshed for new pricing

## Related Files
- `/nodejs-api/routes/auth.js` - Authentication with customer data
- `/nodejs-api/middleware/auth.js` - Auth middleware with customer data
- `/nodejs-api/routes/cart.js` - Cart pricing logic
- `/nextjs-frontend/src/components/cart/CartSidebar.tsx` - Frontend cart display
- `/nodejs-api/prisma/schema.prisma` - Database schema

---
**Date**: October 17, 2025
**Issue**: Customer segment pricing not working in cart
**Status**: ✅ Fixed
