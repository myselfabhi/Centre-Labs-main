const express = require("express");
const { body, param } = require("express-validator");
const prisma = require("../prisma/client");
const validateRequest = require("../middleware/validateRequest");
const { asyncHandler } = require("../middleware/errorHandler");
const { authMiddleware, requireRole } = require("../middleware/auth");
const multer = require("multer");
const ExcelJS = require("exceljs");

const upload = multer({ storage: multer.memoryStorage() });
const {
  findOptimalWarehouse,
  reserveInventoryFromWarehouse,
} = require("../services/warehouseService");
const { queueProductSync } = require("../integrations/skydell_odoo");
const router = express.Router();

// -----------------------------------------------------------------------------
// 1. Create Sales Channel
// -----------------------------------------------------------------------------
router.post(
  "/",
  authMiddleware,
  requireRole(["ADMIN"]), // Restrict to Admin
  [
    body("companyName").notEmpty().withMessage("Company Name is required"),
    body("contactPerson").notEmpty().withMessage("Contact Person is required"),
    body("contactNumber").optional(),
    body("type")
      .optional()
      .isIn(["OWN", "PARTNER"])
      .withMessage("Invalid Type"),
    body("fulfillmentModel")
      .optional()
      .isIn(["OWN_ECOMMERCE", "DROPSHIP"])
      .withMessage("Invalid Fulfillment Model"),
    validateRequest,
  ],
  asyncHandler(async (req, res) => {
    const {
      companyName,
      contactPerson,
      contactNumber,
      contactEmail,
      type = "PARTNER",
      fulfillmentModel = "DROPSHIP",
      paymentTerms,
      status = "ACTIVE",
    } = req.body;

    const channel = await prisma.salesChannel.create({
      data: {
        companyName,
        contactPerson,
        contactNumber,
        contactEmail,
        type,
        fulfillmentModel,
        paymentTerms,
        status,
      },
    });

    res.status(201).json({ success: true, data: channel });
  }),
);

// -----------------------------------------------------------------------------
// 2. Get All Sales Channels
// -----------------------------------------------------------------------------
router.get(
  "/",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const channels = await prisma.salesChannel.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: channels });
  }),
);

// -----------------------------------------------------------------------------
// 3. Get Sales Channel Details
// -----------------------------------------------------------------------------
router.get(
  "/:id",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const channel = await prisma.salesChannel.findUnique({
      where: { id },
      include: {
        prices: true,
      },
    });

    if (!channel) {
      return res
        .status(404)
        .json({ success: false, error: "Sales Channel not found" });
    }

    res.json({ success: true, data: channel });
  }),
);

// -----------------------------------------------------------------------------
// 3.5 Update Sales Channel
// -----------------------------------------------------------------------------
router.put(
  "/:id",
  authMiddleware,
  requireRole(["ADMIN"]),
  [
    body("companyName").optional().notEmpty(),
    body("contactPerson").optional().notEmpty(),
    body("type").optional().isIn(["OWN", "PARTNER"]),
    body("status").optional().isIn(["ACTIVE", "PAUSED"]),
    validateRequest,
  ],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      companyName,
      contactPerson,
      contactNumber,
      contactEmail,
      type,
      fulfillmentModel,
      paymentTerms,
      status,
    } = req.body;

    // Check existence
    const existing = await prisma.salesChannel.findUnique({ where: { id } });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Channel not found" });
    }

    const updated = await prisma.salesChannel.update({
      where: { id },
      data: {
        companyName,
        contactPerson,
        contactNumber,
        contactEmail,
        type,
        fulfillmentModel,
        paymentTerms,
        status,
      },
    });

    res.json({ success: true, data: updated });
  }),
);

// -----------------------------------------------------------------------------
// 3.6 Delete Sales Channel
// -----------------------------------------------------------------------------
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const channel = await prisma.salesChannel.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!channel) {
      return res
        .status(404)
        .json({ success: false, error: "Sales Channel not found" });
    }

    // Perform deletion in a transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      // 0. Delete related ledger entries and statements first to avoid foreign key violations
      await tx.partnerLedgerEntry.deleteMany({
        where: { salesChannelId: id },
      });

      await tx.partnerStatement.deleteMany({
        where: { salesChannelId: id },
      });

      // 1. Unlink any orders associated with this channel
      if (channel._count.orders > 0) {
        await tx.order.updateMany({
          where: { salesChannelId: id },
          data: { salesChannelId: null },
        });
      }

      // 2. Delete the Sales Channel (Prices and Statement Config will cascade automatically)
      await tx.salesChannel.delete({
        where: { id },
      });
    });

    res.json({
      success: true,
      message:
        "Sales Channel deleted successfully. Associated orders have been unlinked.",
    });
  }),
);

// -----------------------------------------------------------------------------
// 4. Download Price List Template
// -----------------------------------------------------------------------------
router.get(
  "/:id/price-list/template",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Fetch all active variants
    const variants = await prisma.productVariant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        regularPrice: true,
        salePrice: true,
        product: {
          select: { name: true },
        },
      },
      orderBy: { sku: "asc" },
    });

    // Fetch existing prices for this channel to pre-fill
    const existingPrices = await prisma.salesChannelPrice.findMany({
      where: { salesChannelId: id },
    });
    const priceMap = new Map(
      existingPrices.map((p) => [p.variantId, Number(p.price)]),
    );

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Price List");

    worksheet.columns = [
      { header: "SKU", key: "sku", width: 25 },
      { header: "Product / Variant Name", key: "name", width: 40 },
      { header: "Channel Price", key: "price", width: 15 },
    ];

    // Add rows
    variants.forEach((v) => {
      const productName = v.product ? v.product.name : "";
      const fullName =
        productName === v.name ? productName : `${productName} - ${v.name}`;
      // User requested to show regular price specifically
      const centreResearchPrice = Number(v.regularPrice);

      worksheet.addRow({
        sku: v.sku,
        name: fullName,
        price: priceMap.get(v.id) || centreResearchPrice || 0,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=price-list-${id}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }),
);

// -----------------------------------------------------------------------------
// 5. Upload Price List
// -----------------------------------------------------------------------------
router.post(
  "/:id/price-list/upload",
  authMiddleware,
  requireRole(["ADMIN"]),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { dryRun } = req.query;

    if (!req.file && !req.body.updates) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded or data provided" });
    }

    let updates = [];
    const errors = [];

    if (req.file) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid Excel file" });
      }

      // Iterate rows (skip header)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const skuVal = row.getCell(1).value;
        const priceVal = row.getCell(3).value;

        if (skuVal !== null && priceVal !== null) {
          const sku = String(skuVal).trim();
          const price = parseFloat(String(priceVal));

          if (!sku) return;

          if (isNaN(price) || price < 0) {
            errors.push(`Row ${rowNumber}: Invalid price for SKU ${sku}`);
          } else {
            updates.push({ sku, price });
          }
        }
      });
    } else if (req.body.updates) {
      updates = req.body.updates;
    }

    if (dryRun === "true") {
      const preview = [];
      for (const item of updates) {
        const variant = await prisma.productVariant.findUnique({
          where: { sku: item.sku },
          include: { product: { select: { name: true } } },
        });

        if (variant) {
          preview.push({
            sku: item.sku,
            name: variant.product
              ? `${variant.product.name} - ${variant.name}`
              : variant.name,
            centreResearchPrice: Number(variant.regularPrice),
            channelPrice: item.price,
          });
        } else {
          errors.push(`SKU ${item.sku} not found`);
        }
      }
      return res.json({
        success: true,
        preview,
        totalFound: preview.length,
        totalErrors: errors.length,
        errors,
      });
    }

    let updatedCount = 0;
    for (const item of updates) {
      const variant = await prisma.productVariant.findUnique({
        where: { sku: item.sku },
      });

      if (variant) {
        await prisma.salesChannelPrice.upsert({
          where: {
            salesChannelId_variantId: {
              salesChannelId: id,
              variantId: variant.id,
            },
          },
          create: {
            salesChannelId: id,
            variantId: variant.id,
            price: item.price,
          },
          update: {
            price: item.price,
          },
        });
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Updated ${updatedCount} prices.`,
      errors: errors.length > 0 ? errors : undefined,
    });
  }),
);

// -----------------------------------------------------------------------------
// 5.5 Get Channel Prices (UI Table)
// -----------------------------------------------------------------------------
router.get(
  "/:id/prices",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 50, search = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      isActive: true,
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { product: { name: { contains: search, mode: "insensitive" } } },
          ]
        : undefined,
    };

    const [total, variants] = await Promise.all([
      prisma.productVariant.count({ where }),
      prisma.productVariant.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        include: {
          product: { select: { name: true } },
          salesChannelPrices: {
            where: { salesChannelId: id },
          },
        },
        orderBy: { sku: "asc" },
      }),
    ]);

    const data = variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.product ? `${v.product.name} - ${v.name}` : v.name,
      regularPrice: Number(v.regularPrice),
      channelPrice:
        v.salesChannelPrices.length > 0
          ? Number(v.salesChannelPrices[0].price)
          : null,
    }));

    res.json({
      success: true,
      data: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  }),
);

// -----------------------------------------------------------------------------
// 5.6 Batch Update Channel Prices (UI Table)
// -----------------------------------------------------------------------------
router.put(
  "/:id/prices",
  authMiddleware,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { updates } = req.body; // Array of { variantId, price }

    if (!Array.isArray(updates)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid updates format" });
    }

    const operations = updates.map((update) =>
      prisma.salesChannelPrice.upsert({
        where: {
          salesChannelId_variantId: {
            salesChannelId: id,
            variantId: update.variantId,
          },
        },
        create: {
          salesChannelId: id,
          variantId: update.variantId,
          price: update.price,
        },
        update: {
          price: update.price,
        },
      }),
    );

    await prisma.$transaction(operations);

    res.json({ success: true, message: "Prices updated successfully" });
  }),
);

// -----------------------------------------------------------------------------
// 6. External Order Creation (Protected by API Key)
// -----------------------------------------------------------------------------
router.post(
  "/integration/orders",
  asyncHandler(async (req, res) => {
    const apiKey = req.header("X-API-Key");
    if (!apiKey) {
      return res.status(401).json({ success: false, error: "Missing API Key" });
    }

    // Authenticate
    const channel = await prisma.salesChannel.findUnique({
      where: { apiKey },
    });

    if (!channel) {
      return res.status(401).json({ success: false, error: "Invalid API Key" });
    }

    if (channel.status !== "ACTIVE") {
      return res
        .status(403)
        .json({ success: false, error: "Sales Channel is not active" });
    }

    const { partnerOrderId, customer, items } = req.body;

    // Idempotency check: Don't duplicate orders from the same partner with the same external ID
    if (partnerOrderId) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          salesChannelId: channel.id,
          partnerOrderId: String(partnerOrderId),
        },
      });

      if (existingOrder) {
        return res.status(400).json({
          success: false,
          error:
            "An order with this partnerOrderId already exists for this channel.",
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Items array is required" });
    }

    // 1. Process Items & Pricing
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const { variantId, quantity } = item;

      // Validate quantity
      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid quantity for variant ${variantId}`,
        });
      }

      // Check Channel Pricing
      // First try to find by variantId (database ID), then fall back to SKU lookup
      let channelPrice = null;
      let resolvedVariantId = variantId;

      // Try 1: Look up by Variant ID directly
      channelPrice = await prisma.salesChannelPrice.findUnique({
        where: {
          salesChannelId_variantId: {
            salesChannelId: channel.id,
            variantId: variantId,
          },
        },
        include: { variant: true },
      });

      // Try 2: If not found by ID, try looking up variant by SKU first
      if (!channelPrice) {
        const variantBySku = await prisma.productVariant.findFirst({
          where: { sku: variantId },
          select: { id: true, sku: true },
        });

        if (variantBySku) {
          resolvedVariantId = variantBySku.id;
          channelPrice = await prisma.salesChannelPrice.findUnique({
            where: {
              salesChannelId_variantId: {
                salesChannelId: channel.id,
                variantId: variantBySku.id,
              },
            },
            include: { variant: true },
          });
        }
      }

      if (!channelPrice) {
        return res.status(400).json({
          success: false,
          error: `Price not configured for variant ${variantId} on this channel. Tried both ID and SKU lookup.`,
        });
      }

      const unitPrice = Number(channelPrice.price);
      const totalPrice = unitPrice * quantity;

      subtotal += totalPrice;
      orderItems.push({
        variantId: resolvedVariantId, // Use the resolved variant ID (from ID or SKU lookup)
        sku: channelPrice.variant?.sku || variantId,
        quantity,
        unitPrice,
        totalPrice,
      });
    }

    // 2. Handle Customer
    // Payload: { firstName, lastName, address, ... }
    // We need to create or find a customer.
    // Basic implementation: Create a new customer or find by email if provided.

    let customerId;
    // Basic mock of customer creation/finding.
    // IMPORTANT: Integration orders might just attach to a generic 'Partner Customer' or
    // create individual customers. Let's assume individual customer creation for dropship.

    const email =
      customer.email ||
      `partner_${channel.id}_${partnerOrderId}@placeholder.com`;

    // Find existing customer by email
    let dbCustomer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!dbCustomer) {
      dbCustomer = await prisma.customer.create({
        data: {
          firstName: customer.firstName || "Unknown",
          lastName: customer.lastName || "Unknown",
          email: email,
          mobile:
            customer.phone ||
            `TEMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          isApproved: true,
          customerType: "B2C",
        },
      });
    }
    customerId = dbCustomer.id;

    // 3. Create Addresses
    const payloadShipping = req.body.shippingAddress || customer;
    const payloadBilling = req.body.billingAddress || customer;

    const shippingAddressData = {
      customerId,
      firstName: payloadShipping.firstName || customer.firstName || "Unknown",
      lastName: payloadShipping.lastName || customer.lastName || "Unknown",
      address1:
        payloadShipping.address1 || payloadShipping.address || "Unknown",
      city: payloadShipping.city || "Unknown",
      state: payloadShipping.state || "Unknown",
      postalCode: payloadShipping.zip || payloadShipping.postalCode || "00000",
      country: payloadShipping.country || "US",
      type: "SHIPPING",
    };

    const shippingAddress = await prisma.address.create({
      data: shippingAddressData,
    });

    const billingAddressData = {
      customerId,
      firstName: payloadBilling.firstName || customer.firstName || "Unknown",
      lastName: payloadBilling.lastName || customer.lastName || "Unknown",
      address1: payloadBilling.address1 || payloadBilling.address || "Unknown",
      city: payloadBilling.city || "Unknown",
      state: payloadBilling.state || "Unknown",
      postalCode: payloadBilling.zip || payloadBilling.postalCode || "00000",
      country: payloadBilling.country || "US",
      type: "BILLING",
    };

    const billingAddress = await prisma.address.create({
      data: billingAddressData,
    });

    // 4. Create Order and Reserve Inventory (Atomic Transaction)
    const result = await prisma.$transaction(async (tx) => {
      // 4.1 Generate Order Number
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 4.2 Create the Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          salesChannelId: channel.id,
          partnerOrderId: partnerOrderId,
          status: "PENDING",
          subtotal: subtotal,
          totalAmount: subtotal,
          shippingAddressId: shippingAddress.id,
          billingAddressId: billingAddress.id,
          items: {
            create: orderItems.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
      });

      // 4.3 Check for Existing Credit (Auto-Debit)
      // Calculate current balance (Receivables - Payments)
      const [totalReceivables, totalPayments] = await Promise.all([
        tx.partnerLedgerEntry.aggregate({
          where: { salesChannelId: channel.id, type: "RECEIVABLE" },
          _sum: { amount: true },
        }),
        tx.partnerLedgerEntry.aggregate({
          where: { salesChannelId: channel.id, type: "PAYMENT" },
          _sum: { amount: true },
        }),
      ]);

      const currentBalance =
        Number(totalReceivables._sum.amount || 0) -
        Number(totalPayments._sum.amount || 0);

      let initialStatus = "UNPAID";
      let initialRemaining = subtotal;

      // If balance is negative, we have credit
      if (currentBalance < 0) {
        const creditAvailable = Math.abs(currentBalance);
        const amountPaidByCredit = Math.min(creditAvailable, subtotal);

        if (amountPaidByCredit > 0) {
          initialRemaining = subtotal - amountPaidByCredit;
          initialStatus = initialRemaining <= 0.01 ? "PAID" : "PARTIALLY_PAID"; // float tolerance

          console.log(
            `[SalesChannel] Auto-applied credit of ${amountPaidByCredit} to order ${orderNumber}`,
          );
        }
      }

      await tx.partnerLedgerEntry.create({
        data: {
          salesChannelId: channel.id,
          orderId: newOrder.id,
          type: "RECEIVABLE",
          amount: subtotal,
          remainingAmount: initialRemaining,
          status: initialStatus,
          description: `Imported order ${orderNumber} (External ID: ${partnerOrderId})`,
        },
      });

      // 4.4 Update Sales Channel Balances (Optimization)
      await tx.salesChannel.update({
        where: { id: channel.id },
        data: {
          currentBalance: { increment: subtotal },
          pendingBalance: { increment: subtotal },
        },
      });

      // 4.3 Find Optimal Warehouse and Reserve Stock
      try {
        const warehouseResult = await findOptimalWarehouse(
          shippingAddress.id,
          orderItems,
        );

        if (warehouseResult && warehouseResult.warehouse) {
          console.log(
            `[SalesChannel] Reserving inventory from warehouse: ${warehouseResult.warehouse.id} for order ${newOrder.orderNumber}`,
          );
          await reserveInventoryFromWarehouse(
            warehouseResult.warehouse.id,
            orderItems,
            tx,
          );
        }
      } catch (warehouseError) {
        console.error(
          `[SalesChannel] Warehouse stock reservation failed for order ${newOrder.orderNumber}:`,
          warehouseError,
        );
        // We log the error but don't fail the order creation (back-office can handle stock issues if needed)
        // This matches the behavior in main orders.js where it might fallback or just log warnings
      }

      return newOrder;
    });

    // Trigger Odoo sync for affected products (non-blocking)
    (async () => {
      try {
        // Get unique product IDs from order items (need to look up from variantIds)
        const variants = await prisma.productVariant.findMany({
          where: { id: { in: orderItems.map((item) => item.variantId) } },
          select: { productId: true },
        });
        const productIds = [
          ...new Set(variants.map((v) => v.productId).filter(Boolean)),
        ];

        for (const productId of productIds) {
          await queueProductSync(
            productId,
            "ORDER_CREATED",
            `Sales Channel Order #${result.orderNumber} created via API`,
            {
              orderId: result.id,
              initiatedBy: "system",
              salesChannelId: channel.id,
            },
          );
        }
        console.log(
          `[SalesChannel] Queued Odoo sync for ${productIds.length} products from order ${result.orderNumber}`,
        );
      } catch (odooErr) {
        console.error(
          "[SalesChannel] Failed to queue Odoo sync for integration order:",
          odooErr?.message || odooErr,
        );
      }
    })();

    res.status(201).json({
      success: true,
      data: {
        orderId: result.id,
        orderNumber: result.orderNumber,
        status: result.status,
        subtotal: subtotal,
        totalAmount: subtotal,
        items: orderItems.map((item) => ({
          variantId: item.variantId,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      },
    });
  }),
);

// -----------------------------------------------------------------------------
// 7. Get Channel Analytics
// -----------------------------------------------------------------------------
router.get(
  "/:id/analytics",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { range = "30d", from, to } = req.query;

    const channel = await prisma.salesChannel.findUnique({ where: { id } });
    if (!channel) {
      return res
        .status(404)
        .json({ success: false, error: "Channel not found" });
    }

    let startDate = new Date();
    let endDate = new Date();

    if (range === "custom" && from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
    } else {
      switch (range) {
        case "1d":
          if (from) {
            startDate = new Date(from);
            endDate = new Date(from);
          } else {
            startDate.setDate(startDate.getDate() - 1);
          }
          break;
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "60d":
          startDate.setDate(startDate.getDate() - 60);
          break;
        case "6m":
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case "1y":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Get all orders for this channel in range
    const orders = await prisma.order.findMany({
      where: {
        salesChannelId: id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        totalAmount: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Basic Aggregations
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Status distribution
    const statusCounts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    // Time Series generation
    const timeSeries = [];
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (range === "1d") {
      // Hourly buckets for single day
      for (let i = 0; i < 24; i++) {
        const hourDate = new Date(startDate);
        hourDate.setHours(i, 0, 0, 0);
        timeSeries.push({
          label: `${i.toString().padStart(2, "0")}:00`,
          date: hourDate.toISOString(),
          orders: 0,
          revenue: 0,
        });
      }

      orders.forEach((o) => {
        const hour = o.createdAt.getHours();
        if (timeSeries[hour]) {
          timeSeries[hour].orders += 1;
          timeSeries[hour].revenue += Number(o.totalAmount);
        }
      });
    } else {
      // Daily buckets for other ranges
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        timeSeries.push({
          label: dateStr,
          date: dateStr,
          orders: 0,
          revenue: 0,
        });
      }

      orders.forEach((o) => {
        const dateStr = o.createdAt.toISOString().split("T")[0];
        const dayEntry = timeSeries.find((d) => d.label === dateStr);
        if (dayEntry) {
          dayEntry.orders += 1;
          dayEntry.revenue += Number(o.totalAmount);
        }
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          totalRevenue,
          avgOrderValue,
          statusCounts,
        },
        timeSeries,
      },
    });
  }),
);

// -----------------------------------------------------------------------------
// 8. Partner Billing - Configuration
// -----------------------------------------------------------------------------
router.get(
  "/:id/billing/config",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    let config = await prisma.partnerStatementConfig.findUnique({
      where: { salesChannelId: id },
    });

    if (!config) {
      // Create default config if not exists
      config = await prisma.partnerStatementConfig.create({
        data: { salesChannelId: id },
      });
    }

    res.json({ success: true, data: config });
  }),
);

router.put(
  "/:id/billing/config",
  authMiddleware,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      billingCycleDays,
      balanceThreshold,
      orderCountThreshold,
      statementTotalThreshold,
      paymentInstructions,
      escalationDays,
    } = req.body;

    const config = await prisma.partnerStatementConfig.upsert({
      where: { salesChannelId: id },
      create: {
        salesChannelId: id,
        billingCycleDays: Number(billingCycleDays) || 14,
        balanceThreshold: balanceThreshold ? Number(balanceThreshold) : null,
        orderCountThreshold: orderCountThreshold
          ? Number(orderCountThreshold)
          : null,
        statementTotalThreshold: statementTotalThreshold
          ? Number(statementTotalThreshold)
          : null,
        paymentInstructions,
        escalationDays: Number(escalationDays) || 7,
      },
      update: {
        billingCycleDays: billingCycleDays
          ? Number(billingCycleDays)
          : undefined,
        balanceThreshold:
          balanceThreshold !== undefined ? Number(balanceThreshold) : undefined,
        orderCountThreshold:
          orderCountThreshold !== undefined
            ? Number(orderCountThreshold)
            : undefined,
        statementTotalThreshold:
          statementTotalThreshold !== undefined
            ? Number(statementTotalThreshold)
            : undefined,
        paymentInstructions,
        escalationDays: escalationDays ? Number(escalationDays) : undefined,
      },
    });

    res.json({ success: true, data: config });
  }),
);

// -----------------------------------------------------------------------------
// 9. Partner Billing - Ledger
// -----------------------------------------------------------------------------
router.get(
  "/:id/billing/ledger",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 50, type, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      salesChannelId: id,
      type: type || undefined,
      status: status || undefined,
    };

    const [total, entries, channelData] = await Promise.all([
      prisma.partnerLedgerEntry.count({ where }),
      prisma.partnerLedgerEntry.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
              totalAmount: true,
            },
          },
          statement: { select: { referenceId: true } },
        },
      }),
      prisma.salesChannel.findUnique({
        where: { id },
        select: { currentBalance: true, pendingBalance: true },
      }),
    ]);

    res.json({
      success: true,
      data: entries,
      currentBalance: Number(channelData?.currentBalance || 0),
      pendingBalance: Number(channelData?.pendingBalance || 0), // Also exposed now
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  }),
);

// -----------------------------------------------------------------------------
// 10. Partner Billing - Payments (FIFO Allocation)
// -----------------------------------------------------------------------------
router.post(
  "/:id/billing/payments",
  authMiddleware,
  requireRole(["ADMIN"]),
  [
    body("amount").isDecimal().withMessage("Amount must be a decimal"),
    body("referenceId").optional().isString(),
    body("description").optional().isString(),
    validateRequest,
  ],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, referenceId, description } = req.body;
    const paymentAmount = Number(amount);

    if (paymentAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Amount must be greater than zero" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the payment entry in the ledger
      const paymentEntry = await tx.partnerLedgerEntry.create({
        data: {
          salesChannelId: id,
          type: "PAYMENT",
          amount: paymentAmount,
          remainingAmount: 0,
          status: "PAID",
          referenceId,
          description:
            description || `Payment received - Ref: ${referenceId || "N/A"}`,
        },
      });

      // 1.5 Update Sales Channel Balances (Optimization)
      await tx.salesChannel.update({
        where: { id },
        data: {
          currentBalance: { decrement: paymentAmount },
          pendingBalance: { decrement: paymentAmount },
        },
      });

      // 2. FIFO Allocation Logic
      // Find all unpaid or partially paid receivables for this channel, oldest first
      const outstandingReceivables = await tx.partnerLedgerEntry.findMany({
        where: {
          salesChannelId: id,
          type: "RECEIVABLE",
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
        },
        orderBy: { createdAt: "asc" },
      });

      let remainingPayment = paymentAmount;

      for (const receivable of outstandingReceivables) {
        if (remainingPayment <= 0) break;

        const currentRemaining = Number(receivable.remainingAmount);

        if (remainingPayment >= currentRemaining) {
          // Fully pay this receivable
          remainingPayment -= currentRemaining;

          await tx.partnerLedgerEntry.update({
            where: { id: receivable.id },
            data: {
              remainingAmount: 0,
              status: "PAID",
            },
          });
        } else {
          // Partially pay this receivable
          const newRemaining = currentRemaining - remainingPayment;
          remainingPayment = 0;

          await tx.partnerLedgerEntry.update({
            where: { id: receivable.id },
            data: {
              remainingAmount: newRemaining,
              status: "PARTIALLY_PAID",
            },
          });
        }
      }

      return paymentEntry;
    });

    res.json({ success: true, data: result });
  }),
);

// -----------------------------------------------------------------------------
// 11. Partner Billing - Statements
// -----------------------------------------------------------------------------
router.get(
  "/:id/billing/statements",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [total, statements] = await Promise.all([
      prisma.partnerStatement.count({ where: { salesChannelId: id } }),
      prisma.partnerStatement.findMany({
        where: { salesChannelId: id },
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { ledgerEntries: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: statements,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  }),
);

// -----------------------------------------------------------------------------
// Manual Statement Generation
// -----------------------------------------------------------------------------
router.post(
  "/:id/generate-statement",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      generatePartnerStatements,
    } = require("../cron/partnerBillingScheduler");

    // Verify channel exists
    const channel = await prisma.salesChannel.findUnique({
      where: { id },
      include: { statementConfig: true },
    });

    if (!channel) {
      return res
        .status(404)
        .json({ success: false, message: "Sales channel not found" });
    }

    // Trigger statement generation for this specific channel
    const result = await generatePartnerStatements(id);

    res.json({
      success: true,
      message: "Statement generation triggered",
      data: result,
    });
  }),
);

// -----------------------------------------------------------------------------
// Mark Statement as Paid
// -----------------------------------------------------------------------------
router.post(
  "/:id/billing/statements/:statementId/pay",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id, statementId } = req.params;

    // Calculate and create payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Statement and Channel
      const statement = await tx.partnerStatement.findFirst({
        where: { id: statementId, salesChannelId: id },
        include: { salesChannel: true },
      });

      if (!statement) {
        throw new Error("Statement not found");
      }

      if (statement.status === "PAID") {
        throw new Error("Statement is already PAID");
      }

      // 2. Calculate Amount to Pay
      const amountToPay =
        Number(statement.totalAmount) - Number(statement.paidAmount);

      if (amountToPay <= 0) {
        // Maybe it was marked paid but status didn't update? Correction.
        await tx.partnerStatement.update({
          where: { id: statementId },
          data: { status: "PAID" },
        });
        return { message: "Statement was already fully paid. Status updated." };
      }

      // 3. Create Payment Ledger Entry
      await tx.partnerLedgerEntry.create({
        data: {
          salesChannelId: id,
          type: "PAYMENT",
          amount: amountToPay,
          remainingAmount: 0, // Assuming full allocation or generic payment
          status: "PAID",
          referenceId: statement.referenceId,
          description: `Payment for Statement ${statement.referenceId}`,
        },
      });

      // 4. Update Sales Channel Balances
      await tx.salesChannel.update({
        where: { id },
        data: {
          currentBalance: { decrement: amountToPay },
          pendingBalance: { decrement: amountToPay },
        },
      });

      // 5. Targeted Allocation: Pay off items IN THIS STATEMENT first
      // Find all unpaid receivables linked to this statement
      const statementItems = await tx.partnerLedgerEntry.findMany({
        where: {
          salesChannelId: id,
          statementId: statementId,
          type: "RECEIVABLE",
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
        },
      });

      let remainingPayment = amountToPay;

      // Pay specific statement items
      for (const item of statementItems) {
        if (remainingPayment <= 0.01) break;

        const openAmount = Number(item.remainingAmount);
        const allocate = Math.min(openAmount, remainingPayment);

        if (allocate > 0) {
          const newRemaining = openAmount - allocate;
          await tx.partnerLedgerEntry.update({
            where: { id: item.id },
            data: {
              remainingAmount: newRemaining,
              status: newRemaining <= 0.01 ? "PAID" : "PARTIALLY_PAID",
            },
          });
          remainingPayment -= allocate;
        }
      }

      // 6. Update Statement Status
      await tx.partnerStatement.update({
        where: { id: statementId },
        data: {
          status: "PAID",
          paidAmount: { increment: amountToPay },
          lastReminderAt: new Date(), // treating payment as an interaction
        },
      });

      return { success: true };
    });

    res.json(result);
  }),
);

// -----------------------------------------------------------------------------
// Manual Payment Reminder
// -----------------------------------------------------------------------------
router.post(
  "/:id/send-reminder/:statementId",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id, statementId } = req.params;
    const { queueEmail } = require("../utils/emailService");

    // Verify statement exists and belongs to channel
    const statement = await prisma.partnerStatement.findFirst({
      where: {
        id: statementId,
        salesChannelId: id,
      },
      include: {
        salesChannel: {
          include: { statementConfig: true },
        },
      },
    });

    if (!statement) {
      return res
        .status(404)
        .json({ success: false, message: "Statement not found" });
    }

    // Queue reminder email
    await queueEmail({
      type: "TEMPLATE",
      templateType: "PARTNER_PAYMENT_REMINDER",
      recipientEmail:
        statement.salesChannel.contactEmail || "billing@placeholder.com",
      data: {
        companyName: statement.salesChannel.companyName,
        statementId: statement.referenceId,
        totalAmount: statement.totalAmount.toFixed(2),
        dueDate: statement.dueDate.toLocaleDateString(),
        paymentInstructions:
          statement.salesChannel.statementConfig?.paymentInstructions ||
          "Please pay via Bank Transfer.",
      },
    });

    // Update reminder count
    await prisma.partnerStatement.update({
      where: { id: statementId },
      data: {
        remindersSent: { increment: 1 },
        lastReminderAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Payment reminder sent successfully",
    });
  }),
);

// -----------------------------------------------------------------------------
// Export Ledger
// -----------------------------------------------------------------------------
router.get(
  "/:id/export-ledger",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = "csv" } = req.query;

    // Fetch ledger entries
    const entries = await prisma.partnerLedgerEntry.findMany({
      where: { salesChannelId: id },
      include: { order: true },
      orderBy: { createdAt: "desc" },
    });

    // Calculate running balance
    let runningBalance = 0;
    const enrichedEntries = entries
      .reverse()
      .map((entry) => {
        if (entry.type === "RECEIVABLE") {
          runningBalance += Number(entry.amount);
        } else if (entry.type === "PAYMENT") {
          runningBalance -= Number(entry.amount);
        }

        return {
          date: entry.createdAt.toLocaleDateString(),
          type: entry.type,
          description:
            entry.description ||
            (entry.order ? `Order ${entry.order.id}` : "N/A"),
          amount: Number(entry.amount).toFixed(2),
          runningBalance: runningBalance.toFixed(2),
          openAmount: Number(entry.remainingAmount).toFixed(2),
          status: entry.status,
        };
      })
      .reverse();

    if (format === "excel") {
      // Generate Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Ledger");

      worksheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Type", key: "type", width: 15 },
        { header: "Description", key: "description", width: 40 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "Open Amount", key: "openAmount", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Running Balance", key: "runningBalance", width: 18 },
      ];

      enrichedEntries.forEach((entry) => worksheet.addRow(entry));

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=ledger-${id}.xlsx`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Generate CSV
      const csv = [
        [
          "Date",
          "Type",
          "Description",
          "Amount",
          "Open Amount",
          "Status",
          "Running Balance",
        ],
        ...enrichedEntries.map((e) => [
          e.date,
          e.type,
          e.description,
          e.amount,
          e.openAmount,
          e.status,
          e.runningBalance,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=ledger-${id}.csv`,
      );
      res.send(csv);
    }
  }),
);

// -----------------------------------------------------------------------------
// Export Statements
// -----------------------------------------------------------------------------
router.get(
  "/:id/export-statements",
  authMiddleware,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = "csv" } = req.query;

    // Fetch statements
    const statements = await prisma.partnerStatement.findMany({
      where: { salesChannelId: id },
      orderBy: { createdAt: "desc" },
    });

    const data = statements.map((stmt) => ({
      statementId: stmt.referenceId,
      date: stmt.createdAt.toLocaleDateString(),
      totalAmount: Number(stmt.totalAmount).toFixed(2),
      paidAmount: Number(stmt.paidAmount).toFixed(2),
      balance: (Number(stmt.totalAmount) - Number(stmt.paidAmount)).toFixed(2),
      dueDate: stmt.dueDate.toLocaleDateString(),
      status: stmt.status,
      remindersSent: stmt.remindersSent,
    }));

    if (format === "excel") {
      // Generate Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Statements");

      worksheet.columns = [
        { header: "Statement ID", key: "statementId", width: 20 },
        { header: "Date", key: "date", width: 15 },
        { header: "Total Amount", key: "totalAmount", width: 15 },
        { header: "Paid Amount", key: "paidAmount", width: 15 },
        { header: "Balance", key: "balance", width: 15 },
        { header: "Due Date", key: "dueDate", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Reminders Sent", key: "remindersSent", width: 15 },
      ];

      data.forEach((row) => worksheet.addRow(row));

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=statements-${id}.xlsx`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Generate CSV
      const csv = [
        [
          "Statement ID",
          "Date",
          "Total Amount",
          "Paid Amount",
          "Balance",
          "Due Date",
          "Status",
          "Reminders Sent",
        ],
        ...data.map((s) => [
          s.statementId,
          s.date,
          s.totalAmount,
          s.paidAmount,
          s.balance,
          s.dueDate,
          s.status,
          s.remindersSent,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=statements-${id}.csv`,
      );
      res.send(csv);
    }
  }),
);

module.exports = router;
