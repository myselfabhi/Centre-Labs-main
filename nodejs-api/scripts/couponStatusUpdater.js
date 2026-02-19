const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Update coupon statuses based on start and expiry times
 * This function should run periodically (e.g., every minute)
 */
async function updateCouponStatuses() {
  try {
    const now = new Date();
    
    console.log(`[${now.toISOString()}] Checking coupon statuses...`);

    // Find coupons that should be activated
    // Conditions: startsAt <= now AND isActive = false
    const couponesToActivate = await prisma.promotion.findMany({
      where: {
        isActive: false,
        startsAt: {
          lte: now,
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: now } }
        ]
      },
    });

    // Activate coupons
    if (couponesToActivate.length > 0) {
      await prisma.promotion.updateMany({
        where: {
          id: {
            in: couponesToActivate.map(c => c.id)
          }
        },
        data: {
          isActive: true,
        }
      });
      console.log(`✅ Activated ${couponesToActivate.length} coupon(s):`, 
        couponesToActivate.map(c => `${c.code} (${c.name})`).join(', '));
    }

    // Find coupons that should be deactivated
    // Conditions: expiresAt <= now AND isActive = true
    const couponsToDeactivate = await prisma.promotion.findMany({
      where: {
        isActive: true,
        expiresAt: {
          lte: now,
        }
      },
    });

    // Deactivate coupons
    if (couponsToDeactivate.length > 0) {
      await prisma.promotion.updateMany({
        where: {
          id: {
            in: couponsToDeactivate.map(c => c.id)
          }
        },
        data: {
          isActive: false,
        }
      });
      console.log(`⏹️ Deactivated ${couponsToDeactivate.length} coupon(s):`, 
        couponsToDeactivate.map(c => `${c.code} (${c.name})`).join(', '));
    }

    if (couponesToActivate.length === 0 && couponsToDeactivate.length === 0) {
      console.log('ℹ️ No coupon status changes needed');
    }

    return {
      success: true,
      activated: couponesToActivate.length,
      deactivated: couponsToDeactivate.length,
      timestamp: now.toISOString()
    };
  } catch (error) {
    console.error('❌ Error updating coupon statuses:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { updateCouponStatuses };
