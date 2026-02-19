const { PrismaClient } = require('@prisma/client');
const { dispatchCampaign } = require('../services/campaignService');

const prisma = new PrismaClient();

// Run every 5 minutes
async function run() {
  const now = new Date();
  const due = await prisma.campaign.findMany({
    where: {
      status: { in: ['DRAFT', 'ACTIVE'] },
      scheduledAt: { lte: now }
    },
    select: { id: true }
  });

  for (const c of due) {
    try {
      await dispatchCampaign(c.id);
    } catch (err) {
      console.error(`[Scheduler] Failed to dispatch campaign ${c.id}:`, err.message);
    }
  }
}

module.exports = { run };


