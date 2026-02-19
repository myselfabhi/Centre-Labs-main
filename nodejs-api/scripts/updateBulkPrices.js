const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBulkPrices() {
    console.log('🚀 Starting bulk price update (Base: ENTERPRISE_1)...');

    try {
        // 1. Fetch all active products with their variants AND segment prices
        const products = await prisma.product.findMany({
            where: { status: 'ACTIVE' },
            include: {
                variants: {
                    include: {
                        segmentPrices: true
                    }
                }
            }
        });

        console.log(`📦 Found ${products.length} active products to process.`);

        let updatedCount = 0;

        for (const product of products) {
            const name = product.name.toLowerCase();
            let tiers = [];
            let ruleSetName = '';

            // 2. Determine Pricing Rule Set
            if (name.includes('semaglutide') || name.includes('retatrutide')) {
                // Rule Set A
                ruleSetName = 'Rule Set A (Semaglutide/Retatrutide)';
                tiers = [
                    { min: 10, max: 24, discount: 0.03 },
                    { min: 25, max: 49, discount: 0.06 },
                    { min: 50, max: 99, discount: 0.12 },
                    { min: 100, max: null, discount: 0.25 }
                ];
            } else if (name.includes('tirzepatide')) {
                // Rule Set B
                ruleSetName = 'Rule Set B (Tirzepatide)';
                tiers = [
                    { min: 10, max: 24, discount: 0.00 },
                    { min: 25, max: 49, discount: 0.03 },
                    { min: 50, max: 99, discount: 0.06 },
                    { min: 100, max: null, discount: 0.20 }
                ];
            } else {
                // Rule Set C (Default - All other peptides)
                ruleSetName = 'Rule Set C (Default)';
                tiers = [
                    { min: 25, max: 49, discount: 0.05 },
                    { min: 50, max: 99, discount: 0.10 },
                    { min: 100, max: null, discount: 0.20 }
                ];
            }

            console.log(`Processing ${product.name} with ${ruleSetName}`);

            // 3. Process Variants
            for (const variant of product.variants) {
                // Find ENTERPRISE_1 base price
                const enterprisePrice = variant.segmentPrices.find(
                    sp => sp.customerType === 'ENTERPRISE_1'
                );

                let basePrice = 0;
                let baseSource = '';

                if (enterprisePrice) {
                    basePrice = Number(enterprisePrice.regularPrice);
                    baseSource = 'ENTERPRISE_1 Segment Price';
                } else {
                    basePrice = Number(variant.regularPrice);
                    baseSource = 'Variant Regular Price (Fallback)';
                    console.warn(`⚠️ Warning: No ENTERPRISE_1 price for ${variant.name} (SKU: ${variant.sku}). Using regular price.`);
                }

                // Delete existing bulk prices to ensure clean state
                await prisma.bulkPrice.deleteMany({
                    where: { variantId: variant.id }
                });

                // Create new bulk prices
                for (const tier of tiers) {
                    const discountedPrice = basePrice * (1 - tier.discount);

                    await prisma.bulkPrice.create({
                        data: {
                            variantId: variant.id,
                            minQty: tier.min,
                            maxQty: tier.max,
                            price: discountedPrice
                        }
                    });
                }
                updatedCount++;
            }
        }

        console.log(`✅ Successfully updated bulk prices for ${updatedCount} variants.`);

    } catch (error) {
        console.error('❌ Error updating bulk prices:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the function
if (require.main === module) {
    updateBulkPrices();
}

module.exports = updateBulkPrices;
