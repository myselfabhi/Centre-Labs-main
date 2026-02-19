const { ssRequest } = require("../utils/shipstationClient");
const prisma = require("../prisma/client");

/**
 * Create a shipment + label in ShipStation for an order
 */
async function createShipmentForOrder(orderId) {
  try {
    console.log("[ShipmentService] Creating shipment for order:", orderId);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        }
      }
    });

    if (!order) throw new Error("Order not found");
    if (!order.shippingAddressId) throw new Error("Order missing shipping address");

    const shippingAddress = await prisma.address.findUnique({
      where: { id: order.shippingAddressId }
    });
    if (!shippingAddress) throw new Error("Shipping address not found");

    const warehouse = {
      name: "Nikhil Ranga",
      company: "My Store",
      phone: "9876543210",
      street1: "456 Business Ave",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "US",
      residential: false,
    };

    const totalWeightOz = order.items.reduce((total, item) => {
      const itemWeight = item.variant?.weightOz || 16;
      return total + itemWeight * item.quantity;
    }, 0);

    // ✅ Single call to /v2/shipments/createlabel
    const shipmentPayload = {
      carrierCode: "stamps_com", // USPS via Stamps.com
      serviceCode: "usps_priority_mail",
      packageCode: "package",
      confirmation: "none",
      shipDate: new Date().toISOString().split("T")[0],
      weight: { value: Math.max(1, Math.ceil(totalWeightOz)), units: "ounces" },
      shipFrom: warehouse,
      shipTo: {
        name: `${shippingAddress.firstName || ""} ${shippingAddress.lastName || ""}`.trim() || "Customer",
        street1: shippingAddress.address1,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || "US",
        phone: shippingAddress.phone || order.customer?.mobile || "0000000000",
        residential: true,
      },
      testLabel: true,
    };

    console.log("[ShipmentService] Sending /shipments/createlabel payload...");
    const labelResp = await ssRequest("POST", "/shipments/createlabel", shipmentPayload);
    console.log("[ShipmentService] ✅ Label Created:", labelResp.data);

    const labelData = labelResp.data;
    const shipmentId = labelData.shipmentId || labelData.shipment_id;
    const trackingNumber = labelData.trackingNumber || labelData.tracking_number;
    const labelUrl = labelData.labelDownload?.href || labelData.label_url;
    const shipmentStatus = labelData.status || "processing";

    return {
      shipmentId,
      trackingNumber,
      shipmentStatus,
      labelUrl,
    };
  } catch (error) {
    console.error("[ShipmentService] ❌ Error creating shipment:", error.message);
    if (error.data) {
      console.error("[ShipmentService] ShipStation error:", JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
}

module.exports = { createShipmentForOrder };
