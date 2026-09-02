const fs = require('fs');

let storageCode = fs.readFileSync('js/storage.js', 'utf8');

// 1. Add Stage 5 KEYS
if (!storageCode.includes('MARKET_CACHE:')) {
    storageCode = storageCode.replace(
        "PAYMENT_SEQ: 'grocery_payment_sequence'",
        "PAYMENT_SEQ: 'grocery_payment_sequence',\n    MARKET_CACHE: 'grocery_market_price_cache',\n    MARKET_HISTORY: 'grocery_market_price_history'"
    );
}

// 2. Add Stage 5 DEFAULT_SETTINGS
if (!storageCode.includes('marketPriceSource:')) {
    storageCode = storageCode.replace(
        "whatsappAutoOverdue7: false",
        "whatsappAutoOverdue7: false,\n    // Stage 5 Market Price & Smart Stock Settings\n    marketPriceSource: 'Government Data',\n    marketDefaultLocation: 'Kerala',\n    marketRefreshFrequency: 'manual',\n    notifPriceAlerts: true,\n    priceAlertThreshold: 5,\n    defaultSafetyStockDays: 3,\n    defaultSupplierLeadTime: 3"
    );
}

// 3. Enhance saveProduct and updateProduct to support Stage 5 attributes:
// targetStock, safetyStockDays, leadTimeDays, marketCommodityId, marketLocation, marketPackQuantity, purchaseBatches, priceHistory
if (!storageCode.includes('product.purchaseBatches')) {
    const oldSaveProduct = "        products.push(product);\n        this.saveProducts(products);\n        return product;";
    const newSaveProduct = `        // Stage 5 Smart stock & Price history defaults
        product.purchaseBatches = product.purchaseBatches || [];
        product.priceHistory = product.priceHistory || [];
        product.leadTimeDays = parseFloat(product.leadTimeDays) || 3;
        product.safetyStockDays = parseFloat(product.safetyStockDays) || 3;
        product.targetStock = parseFloat(product.targetStock) || Math.max(product.minimumStockLevel * 3, 20);

        // Record initial purchase batch if not present
        if (product.currentQuantity > 0 && product.purchaseBatches.length === 0) {
            product.purchaseBatches.push({
                id: 'batch_init_' + Date.now(),
                date: product.createdDate,
                quantity: product.currentQuantity,
                purchasePrice: product.purchaseRate,
                supplier: product.supplier || 'Initial Stock',
                notes: 'Opening stock setup'
            });
        }

        // Record initial price history snapshot
        if (product.priceHistory.length === 0) {
            product.priceHistory.push({
                date: product.createdDate,
                purchasePrice: product.purchaseRate,
                sellingPrice: product.sellingRate,
                marketReference: product.marketReferencePrice || null
            });
        }

        products.push(product);
        this.saveProducts(products);
        return product;`;

    storageCode = storageCode.replace(oldSaveProduct, newSaveProduct);
}

// 4. Append Smart Stock Calculation & Purchase Batch Methods to Storage object
if (!storageCode.includes('calculateProductSmartStock')) {
    const insertPoint = "    // --- DATA IMPORT/EXPORT ---";
    const smartStockMethods = `    // --- STAGE 5: SMART STOCK & INVENTORY ANALYTICS ---

    /**
     * Calculate Average Daily Sales from actual sales history over a time window (default 30 days)
     * Handles zero sales and insufficient data cleanly without dividing by zero.
     */
    calculateProductDailySales(productId, daysWindow = 30) {
        if (!productId) {
            return { averageDailySales: 0, totalSold: 0, daysWindow, hasEnoughData: false, noSales: true, label: 'Not enough sales data' };
        }

        const sales = this.getSales();
        const now = Date.now();
        const windowMs = daysWindow * 24 * 60 * 60 * 1000;
        let totalSold = 0;
        let saleOccurrences = 0;

        sales.forEach(sale => {
            const saleTime = new Date(sale.date || sale.createdAt || now).getTime();
            if (now - saleTime <= windowMs && sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    if (item.productId === productId) {
                        totalSold += parseFloat(item.quantity) || 0;
                        saleOccurrences++;
                    }
                });
            }
        });

        // Ensure safe division
        const safeDays = Math.max(1, daysWindow);
        const averageDailySales = Math.round((totalSold / safeDays) * 100) / 100;

        return {
            averageDailySales,
            totalSold: Math.round(totalSold * 100) / 100,
            saleOccurrences,
            daysWindow: safeDays,
            hasEnoughData: saleOccurrences > 0 || totalSold > 0,
            noSales: totalSold === 0,
            label: totalSold > 0 ? \`\${averageDailySales} / day\` : (saleOccurrences === 0 ? 'Not enough sales data' : 'No recent sales')
        };
    },

    /**
     * Calculate Smart Stock Intelligence for a product:
     * - Current Stock
     * - Reorder Level
     * - Target Stock
     * - Average Daily Sales
     * - Estimated Days of Stock Remaining (Current Stock ÷ Average Daily Sales)
     * - Recommended Reorder Quantity (Target - Current or Lead Time + Safety Stock)
     * - Status (HEALTHY, REORDER_SOON, LOW_STOCK, OUT_OF_STOCK, NO_SALES_DATA)
     */
    calculateProductSmartStock(productId) {
        const product = typeof productId === 'string' ? this.getProduct(productId) : productId;
        if (!product) return null;

        const settings = this.getSettings();
        const currentQty = Math.max(0, parseFloat(product.currentQuantity) || 0);
        const reorderLevel = Math.max(0, parseFloat(product.minimumStockLevel) || 5);
        const leadTimeDays = parseFloat(product.leadTimeDays) || (settings.defaultSupplierLeadTime || 3);
        const safetyDays = parseFloat(product.safetyStockDays) || (settings.defaultSafetyStockDays || 3);
        
        const salesInfo = this.calculateProductDailySales(product.id, 30);
        const avgDaily = salesInfo.averageDailySales;

        // Default or configured target stock
        const dynamicTarget = Math.max(reorderLevel * 3, Math.ceil(avgDaily * (leadTimeDays + safetyDays + 10)));
        const targetStock = Math.max(reorderLevel + 1, parseFloat(product.targetStock) || dynamicTarget || 20);

        // Days remaining calculation (safe division)
        let estimatedDaysRemaining = null;
        let daysRemainingText = 'Not enough sales data';

        if (currentQty === 0) {
            estimatedDaysRemaining = 0;
            daysRemainingText = 'Out of stock';
        } else if (avgDaily > 0) {
            const rawDays = currentQty / avgDaily;
            estimatedDaysRemaining = Math.round(rawDays * 10) / 10;
            const approxDays = Math.round(rawDays);
            daysRemainingText = \`Approximately \${approxDays} day\${approxDays === 1 ? '' : 's'} remaining\`;
        } else if (salesInfo.noSales) {
            daysRemainingText = 'No recent sales';
        }

        // Determine Smart Status
        let status = 'HEALTHY';
        let statusLabel = 'Healthy';
        let statusPillClass = 'status-pill-healthy';

        if (currentQty === 0) {
            status = 'OUT_OF_STOCK';
            statusLabel = 'Out of Stock';
            statusPillClass = 'status-pill-out';
        } else if (currentQty <= reorderLevel) {
            status = 'LOW_STOCK';
            statusLabel = 'Low Stock';
            statusPillClass = 'status-pill-low';
        } else if (estimatedDaysRemaining !== null && estimatedDaysRemaining <= (leadTimeDays + safetyDays)) {
            status = 'REORDER_SOON';
            statusLabel = 'Reorder Soon';
            statusPillClass = 'status-pill-reorder';
        } else if (!salesInfo.hasEnoughData) {
            status = 'NO_SALES_DATA';
            statusLabel = 'No Sales Data';
            statusPillClass = 'status-pill-no-data';
        }

        // Recommended Reorder Quantity Calculation
        let recommendedReorder = 0;
        const isDiscreteUnit = ['piece', 'pack', 'packet', 'box', 'can', 'bottle'].includes(String(product.unit || '').toLowerCase());

        if (currentQty <= reorderLevel || (estimatedDaysRemaining !== null && estimatedDaysRemaining <= (leadTimeDays + safetyDays))) {
            const deficit = Math.max(0, targetStock - currentQty);
            const safetyBufferDemand = Math.ceil(avgDaily * (leadTimeDays + safetyDays));
            recommendedReorder = Math.max(deficit, safetyBufferDemand, reorderLevel);
            if (isDiscreteUnit) {
                recommendedReorder = Math.ceil(recommendedReorder);
            } else {
                recommendedReorder = Math.round(recommendedReorder * 10) / 10;
            }
        }

        const unit = product.unit || 'unit';
        const explanation = avgDaily > 0
            ? \`Average sales: \${avgDaily} \${unit}/day | Safety period: \${safetyDays} days | Lead time: \${leadTimeDays} days | Target stock: \${targetStock} \${unit}\`
            : \`Reorder level: \${reorderLevel} \${unit} | Target stock: \${targetStock} \${unit}\`;

        return {
            productId: product.id,
            productName: product.productName,
            currentQuantity: currentQty,
            reorderLevel,
            targetStock,
            unit,
            leadTimeDays,
            safetyDays,
            averageDailySales: avgDaily,
            salesInfo,
            estimatedDaysRemaining,
            daysRemainingText,
            recommendedReorder,
            status,
            statusLabel,
            statusPillClass,
            explanation
        };
    },

    /**
     * Compute Stock Insights Summary for Dashboard & Stock Page
     */
    getStockInsightsSummary() {
        const products = this.getProducts();
        let needingReorderCount = 0;
        let outOfStockCount = 0;
        let lowStockCount = 0;
        let lessThan7DaysCount = 0;
        const analyzedProducts = [];

        products.forEach(p => {
            const smart = this.calculateProductSmartStock(p);
            if (smart) {
                analyzedProducts.push(smart);
                if (smart.status === 'OUT_OF_STOCK') outOfStockCount++;
                else if (smart.status === 'LOW_STOCK') lowStockCount++;
                else if (smart.status === 'REORDER_SOON') needingReorderCount++;

                if (smart.estimatedDaysRemaining !== null && smart.estimatedDaysRemaining > 0 && smart.estimatedDaysRemaining <= 7) {
                    lessThan7DaysCount++;
                }
            }
        });

        // Top Selling Products in last 30 days
        const salesByProduct = {};
        const sales = this.getSales();
        const now = Date.now();
        const windowMs = 30 * 24 * 60 * 60 * 1000;

        sales.forEach(s => {
            const sTime = new Date(s.date || now).getTime();
            if (now - sTime <= windowMs && s.items) {
                s.items.forEach(it => {
                    if (it.productId) {
                        salesByProduct[it.productId] = (salesByProduct[it.productId] || 0) + (parseFloat(it.quantity) || 0);
                    }
                });
            }
        });

        const topSelling = Object.keys(salesByProduct)
            .map(pid => {
                const prod = this.getProduct(pid);
                return prod ? { product: prod, quantitySold: salesByProduct[pid], unit: prod.unit || 'unit' } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 5);

        // Slow moving products (very low or zero sales in 30 days despite having stock)
        const slowMoving = products
            .filter(p => (parseFloat(p.currentQuantity) || 0) > 0)
            .map(p => {
                const sold = salesByProduct[p.id] || 0;
                return { product: p, quantitySold: sold, currentStock: p.currentQuantity, unit: p.unit || 'unit' };
            })
            .filter(item => item.quantitySold <= 2)
            .slice(0, 5);

        return {
            totalProducts: products.length,
            needingReorder: needingReorderCount + lowStockCount,
            outOfStock: outOfStockCount,
            lowStock: lowStockCount,
            lessThan7Days: lessThan7DaysCount,
            topSelling,
            slowMoving,
            analyzedProducts
        };
    },

    /**
     * Record a Purchase Batch and compute Weighted Average Cost
     */
    addProductPurchaseBatch(productId, { purchasePrice, quantity, date, supplier, notes }) {
        const product = this.getProduct(productId);
        if (!product) return null;

        const qty = Math.max(0, parseFloat(quantity) || 0);
        const rate = Math.max(0, parseFloat(purchasePrice) || 0);
        const batchDate = date ? new Date(date).toISOString() : new Date().toISOString();

        const batch = {
            id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: batchDate,
            quantity: qty,
            purchasePrice: rate,
            supplier: supplier || product.supplier || '',
            notes: notes || 'Stock Inward Batch'
        };

        product.purchaseBatches = product.purchaseBatches || [];
        product.purchaseBatches.push(batch);

        // Calculate weighted average cost across purchase batches
        let totalVal = 0;
        let totalQ = 0;
        product.purchaseBatches.forEach(b => {
            const bQ = parseFloat(b.quantity) || 0;
            const bP = parseFloat(b.purchasePrice) || 0;
            totalVal += bQ * bP;
            totalQ += bQ;
        });

        const weightedAvgCost = totalQ > 0 ? Math.round((totalVal / totalQ) * 100) / 100 : rate;
        product.weightedAverageCost = weightedAvgCost;
        product.purchaseRate = rate; // keep latest purchase rate

        // Track price history point
        product.priceHistory = product.priceHistory || [];
        product.priceHistory.push({
            date: batchDate,
            purchasePrice: rate,
            sellingPrice: product.sellingRate,
            marketReference: product.marketReferencePrice || null
        });

        const newQty = (parseFloat(product.currentQuantity) || 0) + qty;
        product.currentQuantity = newQty;

        this.updateProduct(product.id, {
            currentQuantity: newQty,
            purchaseRate: rate,
            weightedAverageCost: weightedAvgCost,
            purchaseBatches: product.purchaseBatches,
            priceHistory: product.priceHistory,
            adjustmentNote: \`+ \${qty} \${product.unit || 'units'} from \${supplier || 'Supplier'} @ \${rate}\`
        });

        return { product, batch, weightedAvgCost };
    },

    /**
     * Record Product Price Snapshot (for purchase/selling/market comparison tracking)
     */
    recordProductPriceHistory(productId, { purchasePrice, sellingPrice, marketReference, date }) {
        const product = this.getProduct(productId);
        if (!product) return false;

        product.priceHistory = product.priceHistory || [];
        product.priceHistory.push({
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : product.purchaseRate,
            sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : product.sellingRate,
            marketReference: marketReference !== undefined ? parseFloat(marketReference) : (product.marketReferencePrice || null)
        });

        if (product.priceHistory.length > 50) {
            product.priceHistory = product.priceHistory.slice(-50);
        }

        return this.updateProduct(product.id, { priceHistory: product.priceHistory });
    },

`;
    storageCode = storageCode.replace(insertPoint, smartStockMethods + insertPoint);
}

fs.writeFileSync('js/storage.js', storageCode, 'utf8');
console.log('Successfully updated js/storage.js with Stage 5 methods');
