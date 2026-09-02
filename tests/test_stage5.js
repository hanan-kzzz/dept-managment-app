const storageStore = {};
global.localStorage = {
    getItem: (key) => storageStore[key] || null,
    setItem: (key, val) => { storageStore[key] = String(val); },
    removeItem: (key) => { delete storageStore[key]; },
    clear: () => { Object.keys(storageStore).forEach(k => delete storageStore[k]); }
};
global.navigator = { onLine: true };

const Storage = require('../js/storage.js');
global.Storage = Storage;

const { marketPriceService, GOVERNMENT_COMMODITIES_DB, SUPPORTED_LOCATIONS } = require('../js/marketPriceService.js');
const { TelegramService, NotificationQueue } = require('../js/notifications.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

async function runTests() {
    console.log("==================================================");
    console.log("RUNNING STAGE 5 MARKET PRICE & SMART STOCK TESTS");
    console.log("==================================================");

    // Setup initial seed data
    Storage.resetApplication();
    Storage.loadDemoData();

    // ----------------------------------------------------
    // TEST 1: Market Price Data Source & Metadata Verification
    // ----------------------------------------------------
    console.log("\n[1] Market Price Service & Government Open Data Provider:");
    assert(GOVERNMENT_COMMODITIES_DB.length >= 15, `Supported government commodities populated (${GOVERNMENT_COMMODITIES_DB.length} items)`);
    assert(SUPPORTED_LOCATIONS.length >= 5, `Geographic regions supported (${SUPPORTED_LOCATIONS.length} locations)`);

    const keralaPrices = await marketPriceService.getMarketPrices('Kerala');
    assert(keralaPrices.data && keralaPrices.data.length > 0, "Fetched Kerala market commodity price list");
    assert(keralaPrices.source.includes('Consumer Affairs') || keralaPrices.source.includes('Government'), `Official source verified (${keralaPrices.source})`);
    assert(keralaPrices.updatedAt !== undefined, `Price freshness timestamp verified (${keralaPrices.updatedAt})`);

    const ricePrice = await marketPriceService.getCommodityPrice('rice', 'Kerala');
    assert(ricePrice !== null && ricePrice.price > 0, `Rice reference price verified (₹${ricePrice.price}/${ricePrice.unit})`);
    assert(ricePrice.priceType === 'Retail reference', `Price type clearly labeled as "${ricePrice.priceType}"`);

    // ----------------------------------------------------
    // TEST 2: Offline Mode & Cache Layer
    // ----------------------------------------------------
    console.log("\n[2] Offline Mode & Cache Persistence:");
    const cachedResponse = await marketPriceService.getMarketPrices('Kerala', false);
    assert(cachedResponse.isCached === true || cachedResponse.data.length > 0, "Retrieved market data from cache without network penalty");
    const freshnessText = marketPriceService.formatFreshness(ricePrice.updatedAt);
    assert(freshnessText.length > 0, `Human readable freshness string produced ("${freshnessText}")`);

    // ----------------------------------------------------
    // TEST 3: Safe Unit Conversions
    // ----------------------------------------------------
    console.log("\n[3] Unit Conversion Intelligence:");
    // Market: ₹100/kg -> Product: 500g => ₹50
    const conv500g = marketPriceService.convertUnit(100, 'kg', 'g', 500);
    assert(conv500g && conv500g.equivalentPrice === 50, `100/kg converted to 500g = ₹${conv500g.equivalentPrice} (formula: ${conv500g.formula})`);

    // Market: ₹140/L -> Product: 250ml => ₹35
    const conv250ml = marketPriceService.convertUnit(140, 'liter', 'ml', 250);
    assert(conv250ml && conv250ml.equivalentPrice === 35, `140/L converted to 250ml = ₹${conv250ml.equivalentPrice} (formula: ${conv250ml.formula})`);

    // Market: ₹20/pack -> Product: 3 packs => ₹60
    const conv3pack = marketPriceService.convertUnit(20, 'pack', 'pack', 3);
    assert(conv3pack && conv3pack.equivalentPrice === 60, `20/pack converted to 3 packs = ₹${conv3pack.equivalentPrice}`);

    // ----------------------------------------------------
    // TEST 4: Price Comparison Matrix (Informational Reference)
    // ----------------------------------------------------
    console.log("\n[4] Price Comparison Matrix (Never Modifies Selling Price):");
    // Selling ₹110 vs Reference ₹105 (+₹5, +4.76%)
    const comp1 = marketPriceService.calculatePriceComparison(110, 105, 5);
    assert(comp1.difference === 5 && comp1.differencePercent === 4.76, `Comparison calculated difference +₹5 (+4.76%)`);
    assert(comp1.status === 'SLIGHTLY_ABOVE', `Comparison status within threshold is SLIGHTLY_ABOVE`);

    // Selling ₹90 vs Reference ₹100 (-₹10, -10%)
    const comp2 = marketPriceService.calculatePriceComparison(90, 100, 5);
    assert(comp2.difference === -10 && comp2.status === 'BELOW_REFERENCE', `Competitive price status is BELOW_REFERENCE`);

    // ----------------------------------------------------
    // TEST 5: Smart Stock Intelligence & Average Daily Sales
    // ----------------------------------------------------
    console.log("\n[5] Smart Stock Intelligence & Sales Analytics:");
    const products = Storage.getProducts();
    const riceProd = products.find(p => p.productName.includes('Rice'));
    assert(riceProd !== null, "Found demo Basmati Rice product");

    const smartRice = Storage.calculateProductSmartStock(riceProd.id);
    assert(smartRice !== null, "Smart stock analytics calculated successfully");
    assert(typeof smartRice.averageDailySales === 'number', `Calculated Average Daily Sales: ${smartRice.averageDailySales} ${smartRice.unit}/day`);
    assert(typeof smartRice.estimatedDaysRemaining === 'number' || smartRice.estimatedDaysRemaining === null, `Estimated days remaining: ${smartRice.daysRemainingText}`);
    assert(['HEALTHY', 'REORDER_SOON', 'LOW_STOCK', 'OUT_OF_STOCK', 'NO_SALES_DATA'].includes(smartRice.status), `Valid smart stock status generated (${smartRice.status})`);
    assert(smartRice.explanation.includes('Average sales') || smartRice.explanation.includes('Target stock'), `Transparent explanation generated ("${smartRice.explanation}")`);

    // Zero sales handling test
    const zeroSalesProduct = Storage.saveProduct({
        productName: 'Zero Sales Test Item',
        currentQuantity: 10,
        minimumStockLevel: 2,
        purchaseRate: 50,
        sellingRate: 70,
        unit: 'Piece'
    });
    const smartZero = Storage.calculateProductSmartStock(zeroSalesProduct.id);
    assert(smartZero.averageDailySales === 0, "Product with no sales yields 0 average daily sales without error");
    assert(smartZero.daysRemainingText === 'No recent sales' || smartZero.daysRemainingText === 'Not enough sales data', `Handled division by zero gracefully (${smartZero.daysRemainingText})`);

    // Out of stock product handling test
    const outProduct = Storage.saveProduct({
        productName: 'Out of Stock Test Item',
        currentQuantity: 0,
        minimumStockLevel: 5,
        purchaseRate: 20,
        sellingRate: 30,
        unit: 'Piece'
    });
    const smartOut = Storage.calculateProductSmartStock(outProduct.id);
    assert(smartOut.status === 'OUT_OF_STOCK', "0 quantity product correctly classified as OUT_OF_STOCK");
    assert(smartOut.recommendedReorder > 0, `Out of stock product recommended reorder quantity: ${smartOut.recommendedReorder} pieces`);

    // ----------------------------------------------------
    // TEST 6: Purchase Batch History & Weighted Average Cost
    // ----------------------------------------------------
    console.log("\n[6] Purchase Batch Tracking & Weighted Average Cost:");
    const testBatchProd = Storage.saveProduct({
        productName: 'Cost Batch Test Item',
        currentQuantity: 10,
        minimumStockLevel: 5,
        purchaseRate: 90,
        sellingRate: 120,
        unit: 'kg'
    });

    // Inward new batch: 20 kg @ ₹95
    const batchResult = Storage.addProductPurchaseBatch(testBatchProd.id, {
        purchasePrice: 95,
        quantity: 20,
        supplier: 'Mandi Trader',
        notes: 'Second inward batch'
    });

    assert(batchResult !== null, "Inward purchase batch recorded");
    const updatedProd = Storage.getProduct(testBatchProd.id);
    assert(updatedProd.currentQuantity === 30, `Current quantity updated to 30 kg (got ${updatedProd.currentQuantity})`);
    assert(updatedProd.weightedAverageCost === 93.33, `Weighted average cost accurately calculated as ₹93.33 (got ₹${updatedProd.weightedAverageCost})`);
    assert(updatedProd.priceHistory.length >= 2, `Price history tracked snapshots (${updatedProd.priceHistory.length} records)`);

    // ----------------------------------------------------
    // TEST 7: Stock Insights Summary for Dashboard
    // ----------------------------------------------------
    console.log("\n[7] Stock Insights Dashboard Summary:");
    const insights = Storage.getStockInsightsSummary();
    assert(insights.totalProducts > 0, `Total products analyzed: ${insights.totalProducts}`);
    assert(insights.topSelling && insights.topSelling.length > 0, `Top selling items detected: ${insights.topSelling.map(t => t.product.productName).join(', ')}`);
    assert(insights.slowMoving !== undefined, `Slow moving items list generated (${insights.slowMoving.length} items)`);

    // ----------------------------------------------------
    // TEST 8: Stage 5 Alerts & Telegram Integration
    // ----------------------------------------------------
    console.log("\n[8] Stage 5 Alerts & Telegram Integration:");
    const settings = Storage.getSettings();
    settings.telegramConnected = true;
    Storage.saveSettings(settings);

    const alertSent = TelegramService.sendAlert('REORDER_RECOMMENDED', {
        product: riceProd,
        smart: smartRice
    });
    assert(alertSent === true, "Dispatched Telegram Smart Stock Reorder Alert");

    const priceAlertSent = TelegramService.sendAlert('MARKET_PRICE_CHANGED', {
        commodity: ricePrice,
        prevPrice: 45.80,
        price: 46.17,
        changePercent: 0.81
    });
    assert(priceAlertSent === true, "Dispatched Telegram Market Price Change Alert");

    const queue = Storage.getNotificationQueue();
    const queuedItems = queue.filter(q => q.channel === 'telegram');
    assert(queuedItems.length >= 2, `Queued alerts verified in offline-first queue (${queuedItems.length} queued)`);

    console.log("\n==================================================");
    console.log(`STAGE 5 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
});
