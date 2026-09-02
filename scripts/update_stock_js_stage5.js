const fs = require('fs');

let stockJs = fs.readFileSync('js/stock.js', 'utf8');

// 1. Update loadProductProfileDetails to render Smart Stock & Market Reference
const oldLoadProfile = '    // Render stock ledger logs\n    renderStockLedgerLogs(product.stockHistory || []);';
const newLoadProfile = `    // STAGE 5: Render Smart Stock Intelligence & Market Price Reference
    renderSmartStockDetails(product);
    renderMarketPriceDetails(product);

    // Render stock ledger logs
    renderStockLedgerLogs(product.stockHistory || []);`;

if (stockJs.includes(oldLoadProfile)) {
    stockJs = stockJs.replace(oldLoadProfile, newLoadProfile);
}

// 2. Add Smart Stock and Market Price functions before initProductDetailsPage or at bottom
const stage5StockFunctions = `
// --------------------------------------------------------------------------
// STAGE 5: SMART INVENTORY & MARKET PRICE DETAILS LOGIC
// --------------------------------------------------------------------------
function renderSmartStockDetails(product) {
    if (!product || typeof Storage === 'undefined') return;

    const smart = Storage.calculateProductSmartStock(product.id);
    if (!smart) return;

    // Status Pill
    const pill = document.getElementById('smart-stock-status-pill');
    if (pill) {
        pill.className = \`status-pill \${smart.statusPillClass}\`;
        pill.textContent = smart.statusLabel.toUpperCase();
    }

    // Metric Fields
    const setField = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setField('smart-daily-sales-val', smart.salesInfo && smart.salesInfo.totalSold > 0 ? \`\${smart.averageDailySales} \${smart.unit}/day\` : (smart.salesInfo && !smart.salesInfo.hasEnoughData ? 'Not enough sales data' : 'No recent sales'));
    setField('smart-days-remaining-val', smart.daysRemainingText);
    setField('smart-target-stock-val', \`\${smart.targetStock} \${smart.unit}\`);
    setField('smart-reorder-qty-val', smart.recommendedReorder > 0 ? \`\${smart.recommendedReorder} \${smart.unit}\` : 'Optimal');

    // Explanation
    const explEl = document.getElementById('smart-stock-explanation');
    if (explEl) {
        explEl.innerHTML = \`<strong>Why this recommendation?</strong> \${smart.explanation}\`;
    }

    // Reorder Alert Banner
    const banner = document.getElementById('smart-reorder-alert-banner');
    const bannerTitle = document.getElementById('smart-alert-banner-title');
    const bannerMsg = document.getElementById('smart-alert-banner-msg');
    const quickAddBtn = document.getElementById('btn-smart-quick-add');

    if (banner && (smart.status === 'REORDER_SOON' || smart.status === 'LOW_STOCK' || smart.status === 'OUT_OF_STOCK')) {
        banner.style.display = 'block';
        if (bannerTitle) bannerTitle.textContent = smart.statusLabel.toUpperCase();
        if (bannerMsg) {
            bannerMsg.textContent = \`\${smart.currentQuantity} \${smart.unit} remaining · \${smart.daysRemainingText} · Recommended reorder: \${smart.recommendedReorder} \${smart.unit}\`;
        }
        if (quickAddBtn) {
            quickAddBtn.onclick = () => openAddStockModal(product.id);
        }
    } else if (banner) {
        banner.style.display = 'none';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function renderMarketPriceDetails(product) {
    if (!product) return;

    const commSelect = document.getElementById('prod-market-commodity-select');
    const locSelect = document.getElementById('prod-market-location-select');
    const suggestBanner = document.getElementById('market-suggested-mapping-banner');
    const suggestName = document.getElementById('market-suggested-name');
    const confirmSuggestBtn = document.getElementById('btn-confirm-suggested-mapping');

    const yourPriceEl = document.getElementById('compare-your-price');
    const marketPriceEl = document.getElementById('compare-market-price');
    const diffAmountEl = document.getElementById('compare-diff-amount');
    const diffBadgeEl = document.getElementById('compare-diff-badge');
    const unitNoteEl = document.getElementById('market-unit-conversion-note');
    const freshnessEl = document.getElementById('market-ref-freshness-text');
    const sourceBadge = document.getElementById('market-ref-source-badge');

    if (yourPriceEl) {
        yourPriceEl.textContent = \`₹\${(parseFloat(product.sellingRate) || 0).toFixed(2)} / \${product.unit || 'unit'}\`;
    }

    // Populate commodity dropdown if not already populated
    if (commSelect && (commSelect.options.length <= 1) && typeof marketPriceService !== 'undefined') {
        const commodities = marketPriceService.getSupportedCommodities();
        commodities.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = \`\${c.name} (\${c.category})\`;
            commSelect.appendChild(opt);
        });
    }

    const currentLoc = product.marketLocation || 'Kerala';
    if (locSelect) locSelect.value = currentLoc;

    if (commSelect) {
        commSelect.value = product.marketCommodityId || '';
        
        // Listeners for changing commodity or location
        commSelect.onchange = (e) => {
            const newCommId = e.target.value;
            Storage.updateProduct(product.id, { marketCommodityId: newCommId });
            product.marketCommodityId = newCommId;
            renderMarketPriceDetails(product);
            Utils.showToast("Market commodity mapping updated", "info");
        };
    }

    if (locSelect) {
        locSelect.onchange = (e) => {
            const newLoc = e.target.value;
            Storage.updateProduct(product.id, { marketLocation: newLoc });
            product.marketLocation = newLoc;
            renderMarketPriceDetails(product);
            Utils.showToast(\`Market location set to \${newLoc}\`, "info");
        };
    }

    // Handle Unmapped vs Mapped
    if (!product.marketCommodityId) {
        if (marketPriceEl) marketPriceEl.textContent = 'Not configured';
        if (diffAmountEl) diffAmountEl.textContent = '-';
        if (diffBadgeEl) {
            diffBadgeEl.className = 'badge badge-neutral';
            diffBadgeEl.textContent = 'Not Linked';
        }
        if (unitNoteEl) unitNoteEl.textContent = 'Select commodity above to compare reference rates';
        if (freshnessEl) freshnessEl.textContent = '-';

        // Check for AI / Alias suggestion
        if (typeof marketPriceService !== 'undefined' && suggestBanner && suggestName && confirmSuggestBtn) {
            const suggested = marketPriceService.suggestCommodity(product.productName, product.category);
            if (suggested) {
                suggestName.textContent = \`\${suggested.name} (\${suggested.baseUnit})\`;
                suggestBanner.style.display = 'block';
                confirmSuggestBtn.onclick = () => {
                    Storage.updateProduct(product.id, { marketCommodityId: suggested.id });
                    product.marketCommodityId = suggested.id;
                    if (commSelect) commSelect.value = suggested.id;
                    suggestBanner.style.display = 'none';
                    renderMarketPriceDetails(product);
                    Utils.showToast(\`✓ Linked to \${suggested.name} benchmark\`, "success");
                };
            } else {
                suggestBanner.style.display = 'none';
            }
        }
        return;
    }

    // Mapped state
    if (suggestBanner) suggestBanner.style.display = 'none';

    try {
        if (typeof marketPriceService === 'undefined') return;

        const commData = await marketPriceService.getCommodityPrice(product.marketCommodityId, currentLoc);
        if (!commData) {
            if (marketPriceEl) marketPriceEl.textContent = 'Price Unavailable';
            return;
        }

        // Safe Unit Conversion
        const converted = marketPriceService.convertUnit(commData.price, commData.unit, product.unit, product.packQuantity || 1);
        const refPrice = converted ? converted.equivalentPrice : commData.price;
        const displayUnit = converted ? converted.displayUnit : (product.unit || commData.unit);

        if (marketPriceEl) {
            marketPriceEl.textContent = \`₹\${refPrice.toFixed(2)} / \${displayUnit}\`;
        }

        if (sourceBadge) {
            sourceBadge.textContent = commData.source.includes('Consumer Affairs') ? 'DCA Govt Ref' : 'Govt Reference';
        }

        if (freshnessEl) {
            freshnessEl.textContent = marketPriceService.formatFreshness(commData.updatedAt);
        }

        if (unitNoteEl) {
            unitNoteEl.textContent = converted ? converted.formula : \`1:1 Unit Equivalent (₹\${commData.price}/\${commData.unit})\`;
        }

        // Price Comparison Matrix
        const comp = marketPriceService.calculatePriceComparison(product.sellingRate, refPrice, 5);
        if (diffAmountEl) {
            const sym = comp.difference > 0 ? '+' : '';
            diffAmountEl.textContent = \`\${sym}₹\${comp.difference.toFixed(2)} (\${sym}\${comp.differencePercent}%)\`;
        }

        if (diffBadgeEl) {
            diffBadgeEl.className = \`badge \${comp.bgClass}\`;
            diffBadgeEl.textContent = comp.statusLabel;
        }

        // Store snapshot in product record if changed
        if (product.marketReferencePrice !== refPrice) {
            Storage.updateProduct(product.id, { marketReferencePrice: refPrice });
        }
    } catch (e) {
        console.error("Error calculating market price details:", e);
    }
}
`;

if (!stockJs.includes('renderSmartStockDetails')) {
    stockJs += stage5StockFunctions;
}

// 3. Update stock.html inventory overview rows to handle 'reorder_soon' and 'risk_7days'
if (!stockJs.includes("case 'reorder_soon':")) {
    const filterSwitchTarget = "    switch (currentStockFilter) {";
    const filterSwitchAdditions = `    switch (currentStockFilter) {
        case 'reorder_soon':
            filtered = products.filter(p => {
                const s = Storage.calculateProductSmartStock(p);
                return s && (s.status === 'REORDER_SOON' || s.status === 'LOW_STOCK' || s.status === 'OUT_OF_STOCK');
            });
            break;
        case 'risk_7days':
            filtered = products.filter(p => {
                const s = Storage.calculateProductSmartStock(p);
                return s && s.estimatedDaysRemaining !== null && s.estimatedDaysRemaining > 0 && s.estimatedDaysRemaining <= 7;
            });
            break;`;

    stockJs = stockJs.replace(filterSwitchTarget, filterSwitchAdditions);
}

// 4. Update Stock Insights counters on stock.html
const oldUpdateCount = "function updateOverviewCountBadges() {";
const newUpdateCount = `function updateOverviewCountBadges() {
    // Stage 5 Stock Insights counts
    if (typeof Storage !== 'undefined' && Storage.getStockInsightsSummary) {
        const insights = Storage.getStockInsightsSummary();
        const reorderEl = document.getElementById('insight-count-reorder');
        const risk7El = document.getElementById('insight-count-7days');
        if (reorderEl) reorderEl.textContent = insights.needingReorder;
        if (risk7El) risk7El.textContent = insights.lessThan7Days;
    }`;

if (stockJs.includes(oldUpdateCount) && !stockJs.includes('Storage.getStockInsightsSummary')) {
    stockJs = stockJs.replace(oldUpdateCount, newUpdateCount);
}

// 5. In Add Stock form submit: Record purchase batch and supplier
const oldAddStockSave = "            Storage.updateProduct(productId, {\n                currentQuantity: newQuantity,\n                purchaseRate: purchaseRateVal,\n                supplier: supplierVal || product.supplier,\n                expiryDate: expiryVal || product.expiryDate,\n                adjustmentNote: `Stock Added (+${qtyToAdd} ${product.unit || 'pc'})`\n            });";

const newAddStockSave = `            Storage.addProductPurchaseBatch(productId, {
                purchasePrice: purchaseRateVal,
                quantity: qtyToAdd,
                supplier: supplierVal || product.supplier,
                notes: \`Stock Addition (+ \${qtyToAdd} \${product.unit || 'pc'})\`
            });`;

if (stockJs.includes(oldAddStockSave)) {
    stockJs = stockJs.replace(oldAddStockSave, newAddStockSave);
}

fs.writeFileSync('js/stock.js', stockJs, 'utf8');
console.log('Successfully updated js/stock.js with Stage 5 features');
