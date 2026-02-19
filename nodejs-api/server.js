const http = require('http');
const cron = require('node-cron');
const app = require('./app');
const { run: runPublishScheduler } = require('./cron/publishScheduler');
const { run: runSettlementChecker } = require('./cron/settlementChecker');
const { run: runPromotionExpiryScheduler } = require('./cron/promotionExpiryScheduler');
const { generatePartnerStatements, sendPaymentReminders } = require('./cron/partnerBillingScheduler');
const { syncShipStationInventory } = require('./utils/inventorySyncService');
const port = process.env.PORT || 4000;
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

// Campaign scheduler removed per requirements

// Run content publish scheduler every minute
cron.schedule('* * * * *', async () => {
  try {
    const result = await runPublishScheduler();
    if (result.updated) {
      console.log(`[Cron] Published ${result.updated} scheduled pages/posts`);
    }
  } catch (err) {
    console.error('[Cron] Publish scheduler error:', err.message);
  }
});

// Run Authorize.Net settlement checker daily at 02:15 server time
cron.schedule('15 2 * * *', async () => {
  try {
    const result = await runSettlementChecker();
    if (result.updated) {
      console.log(`[Cron] Settlement checker updated ${result.updated} transactions/payments`);
    } else {
      console.log('[Cron] Settlement checker: no updates');
    }
  } catch (err) {
    console.error('[Cron] Settlement checker error:', err.message);
  }
});

// Run ShipStation inventory sync daily at 02:30 server time
cron.schedule('30 2 * * *', async () => {
  try {
    console.log('[Cron] Starting ShipStation inventory sync...');
    const result = await syncShipStationInventory();
    console.log('[Cron] ShipStation inventory sync completed:', {
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors,
      total: result.total
    });
  } catch (err) {
    console.error('[Cron] ShipStation inventory sync error:', err.message);
  }
});

// Run promotion expiry checker every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  try {
    const result = await runPromotionExpiryScheduler();
    if (result.deleted > 0) {
      console.log(`[Cron] Auto-deleted ${result.deleted} expired promotions`);
    }
  } catch (err) {
    console.error('[Cron] Promotion expiry scheduler error:', err.message);
  }
});

// Run Partner Statement Generation twice daily at 3 AM and 3 PM
cron.schedule('0 3,15 * * *', async () => {
  try {
    console.log('[Cron] Starting partner statement generation...');
    const result = await generatePartnerStatements();
    console.log('[Cron] Partner statement generation completed:', result);
  } catch (err) {
    console.error('[Cron] Partner statement generation error:', err.message);
  }
});

// Run Partner Payment Reminders twice daily at 4 AM and 4 PM
cron.schedule('0 4,16 * * *', async () => {
  try {
    console.log('[Cron] Starting partner payment reminders...');
    const result = await sendPaymentReminders();
    console.log('[Cron] Partner payment reminders completed:', result);
  } catch (err) {
    console.error('[Cron] Partner payment reminders error:', err.message);
  }
});


