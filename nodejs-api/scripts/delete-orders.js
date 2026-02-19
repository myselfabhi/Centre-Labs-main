#!/usr/bin/env node

/**
 * Script to delete orders from the database
 * Usage: 
 *   node scripts/delete-orders.js --all          # Delete all orders
 *   node scripts/delete-orders.js --id ORDER_ID # Delete specific order
 *   node scripts/delete-orders.js --help        # Show help
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const value = args[1];

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask for confirmation
function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Delete single order by ID
async function deleteOrderById(orderId) {
  try {
    console.log(`🔍 Looking for order: ${orderId}`);
    
    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        auditLogs: true,
      },
    });

    if (!order) {
      console.log(`❌ Order not found: ${orderId}`);
      return false;
    }

    console.log(`📋 Found order: ${order.orderNumber}`);
    console.log(`   - Items: ${order.items.length}`);
    console.log(`   - Payments: ${order.payments.length}`);
    console.log(`   - Audit Logs: ${order.auditLogs.length}`);
    console.log(`   - Status: ${order.status}`);
    console.log(`   - Total: $${order.totalAmount}`);

    const confirmed = await askConfirmation(`\n⚠️  Are you sure you want to delete this order? (yes/no): `);
    
    if (!confirmed) {
      console.log('❌ Operation cancelled');
      return false;
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete audit logs
      await tx.auditLog.deleteMany({
        where: { orderId },
      });

      // Delete refunds
      await tx.refund.deleteMany({
        where: { paymentId: { in: order.payments.map(p => p.id) } },
      });

      // Delete payments
      await tx.payment.deleteMany({
        where: { orderId },
      });

      // Delete order items
      await tx.orderItem.deleteMany({
        where: { orderId },
      });

      // Delete the order
      await tx.order.delete({
        where: { id: orderId },
      });
    });

    console.log(`✅ Successfully deleted order: ${order.orderNumber}`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting order:', error.message);
    return false;
  }
}

// Delete all orders
async function deleteAllOrders() {
  try {
    console.log('🔍 Checking for orders...');
    
    // Get count and some sample orders
    const orderCount = await prisma.order.count();
    
    if (orderCount === 0) {
      console.log('✅ No orders found to delete');
      return true;
    }

    const sampleOrders = await prisma.order.findMany({
      take: 5,
      select: {
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📊 Found ${orderCount} orders to delete`);
    console.log('\n📋 Sample orders:');
    sampleOrders.forEach(order => {
      console.log(`   - ${order.orderNumber} | ${order.status} | $${order.totalAmount} | ${order.createdAt.toISOString().split('T')[0]}`);
    });

    console.log(`\n⚠️  WARNING: This will permanently delete ALL ${orderCount} orders and related data:`);
    console.log('   - Order items');
    console.log('   - Payments');
    console.log('   - Refunds');
    console.log('   - Audit logs');
    console.log('\n🚨 THIS ACTION CANNOT BE UNDONE!');

    const confirmed = await askConfirmation(`\nType 'DELETE ALL ORDERS' to confirm: `);
    
    if (confirmed !== 'DELETE ALL ORDERS') {
      console.log('❌ Operation cancelled - confirmation text did not match');
      return false;
    }

    console.log('\n🗑️  Starting deletion process...');

    // Delete all order-related data in transaction
    const result = await prisma.$transaction(async (tx) => {
      console.log('   Deleting audit logs...');
      const auditCount = await tx.auditLog.deleteMany({});
      
      console.log('   Deleting refunds...');
      const payments = await tx.payment.findMany({ select: { id: true } });
      const refundCount = await tx.refund.deleteMany({
        where: { paymentId: { in: payments.map(p => p.id) } },
      });

      console.log('   Deleting payments...');
      const paymentCount = await tx.payment.deleteMany({});

      console.log('   Deleting order items...');
      const itemCount = await tx.orderItem.deleteMany({});

      console.log('   Deleting orders...');
      const orderDeleteResult = await tx.order.deleteMany({});

      return {
        orders: orderDeleteResult.count,
        items: itemCount.count,
        payments: paymentCount.count,
        refunds: refundCount.count,
        auditLogs: auditCount.count,
      };
    });

    console.log('\n✅ Successfully deleted all orders!');
    console.log('📊 Deletion summary:');
    console.log(`   - Orders: ${result.orders}`);
    console.log(`   - Order Items: ${result.items}`);
    console.log(`   - Payments: ${result.payments}`);
    console.log(`   - Refunds: ${result.refunds}`);
    console.log(`   - Audit Logs: ${result.auditLogs}`);

    return true;
  } catch (error) {
    console.error('❌ Error deleting all orders:', error.message);
    return false;
  }
}

// Show help
function showHelp() {
  console.log(`
🗑️  Order Deletion Script

Usage:
  node scripts/delete-orders.js --all          Delete all orders (requires confirmation)
  node scripts/delete-orders.js --id ORDER_ID  Delete specific order by ID
  node scripts/delete-orders.js --help         Show this help message

Examples:
  node scripts/delete-orders.js --all
  node scripts/delete-orders.js --id clp123abc-def4-5678-9012-123456789abc

⚠️  WARNING: These operations permanently delete data and cannot be undone!
   Only ADMIN users can perform these operations via API.
`);
}

// Main function
async function main() {
  try {
    console.log('🚀 Order Deletion Script Started\n');

    switch (command) {
      case '--all':
        await deleteAllOrders();
        break;
      
      case '--id':
        if (!value) {
          console.log('❌ Error: Order ID is required');
          console.log('Usage: node scripts/delete-orders.js --id ORDER_ID');
          process.exit(1);
        }
        await deleteOrderById(value);
        break;
      
      case '--help':
      case '-h':
        showHelp();
        break;
      
      default:
        console.log('❌ Error: Invalid command');
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
    console.log('\n👋 Script completed');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  deleteOrderById,
  deleteAllOrders,
};
