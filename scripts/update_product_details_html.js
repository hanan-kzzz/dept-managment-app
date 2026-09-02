const fs = require('fs');

let html = fs.readFileSync('product-details.html', 'utf8');

// 1. Add css/market-prices.css link if not present
if (!html.includes('css/market-prices.css')) {
    html = html.replace(
        '<link rel="stylesheet" href="css/stock.css">',
        '<link rel="stylesheet" href="css/stock.css">\n    <link rel="stylesheet" href="css/market-prices.css">'
    );
}

// 2. Add js/marketPriceService.js before stock.js if not present
if (!html.includes('js/marketPriceService.js')) {
    html = html.replace(
        '<script src="js/notifications.js"></script>',
        '<script src="js/marketPriceService.js"></script>\n    <script src="js/notifications.js"></script>'
    );
}

// 3. Add Smart Stock Card and Market Price Reference Card after Product Summary Header Card
const targetCard = '        <!-- Redesigned Contextual Actions -->';

const stage5Cards = `        <!-- STAGE 5: SMART INVENTORY & STOCK INSIGHT CARD -->
        <section class="card" id="smart-stock-card" style="padding: 18px; margin-bottom: 16px; border-left: 4px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="sparkles" style="width: 16px; height: 16px; color: var(--accent);"></i>
                    <h2 style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; margin: 0;">Stock Intelligence</h2>
                </div>
                <span class="status-pill status-pill-healthy" id="smart-stock-status-pill">HEALTHY</span>
            </div>

            <!-- Smart Metrics Grid -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px;">
                <div class="stock-prop-box" style="padding: 8px; background: var(--surface-card, var(--surface)); border: 1px solid var(--border); border-radius: var(--radius-sm);">
                    <span class="stock-prop-label" style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Average Daily Sales</span>
                    <div class="stock-prop-val" id="smart-daily-sales-val" style="font-size: 0.95rem; font-weight: 800; color: var(--text); margin-top: 2px;">-</div>
                </div>
                <div class="stock-prop-box" style="padding: 8px; background: var(--surface-card, var(--surface)); border: 1px solid var(--border); border-radius: var(--radius-sm);">
                    <span class="stock-prop-label" style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Estimated Stock</span>
                    <div class="stock-prop-val" id="smart-days-remaining-val" style="font-size: 0.95rem; font-weight: 800; color: var(--text); margin-top: 2px;">-</div>
                </div>
                <div class="stock-prop-box" style="padding: 8px; background: var(--surface-card, var(--surface)); border: 1px solid var(--border); border-radius: var(--radius-sm);">
                    <span class="stock-prop-label" style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Target Stock</span>
                    <div class="stock-prop-val" id="smart-target-stock-val" style="font-size: 0.95rem; font-weight: 800; color: var(--text); margin-top: 2px;">-</div>
                </div>
                <div class="stock-prop-box" style="padding: 8px; background: var(--surface-card, var(--surface)); border: 1px solid var(--border); border-radius: var(--radius-sm);">
                    <span class="stock-prop-label" style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Recommended Reorder</span>
                    <div class="stock-prop-val" id="smart-reorder-qty-val" style="font-size: 0.95rem; font-weight: 800; color: var(--accent); margin-top: 2px;">-</div>
                </div>
            </div>

            <!-- Smart Reorder Alert Banner (Visible when Reorder Soon or Low/Out) -->
            <div id="smart-reorder-alert-banner" style="display: none; padding: 10px 12px; background: var(--info-tint, rgba(59,130,246,0.1)); border: 1px solid rgba(59,130,246,0.25); border-radius: var(--radius-sm); margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="font-size: 0.78rem; font-weight: 800; color: var(--info, #3b82f6); text-transform: uppercase;" id="smart-alert-banner-title">REORDER SOON</div>
                        <div style="font-size: 0.75rem; color: var(--text); margin-top: 2px;" id="smart-alert-banner-msg">-</div>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" id="btn-smart-quick-add" style="font-size: 0.75rem; padding: 4px 10px; height: 32px;">
                        + Add Stock
                    </button>
                </div>
            </div>

            <!-- Transparent Explanation -->
            <div style="font-size: 0.7rem; color: var(--text-muted); line-height: 1.35; padding-top: 6px; border-top: 1px dashed var(--border);" id="smart-stock-explanation">
                Calculating stock metrics...
            </div>
        </section>

        <!-- STAGE 5: MARKET PRICE REFERENCE & COMPARISON CARD -->
        <section class="card" id="market-price-card" style="padding: 18px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="scale" style="width: 16px; height: 16px; color: var(--accent);"></i>
                    <h2 style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; margin: 0;">Market Price Reference</h2>
                </div>
                <span class="market-card-badge" id="market-ref-source-badge">Govt Reference</span>
            </div>

            <!-- Mapping Controls -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                <div>
                    <label style="font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">Market Commodity</label>
                    <select id="prod-market-commodity-select" class="form-control" style="height: 38px; font-size: 0.82rem; font-weight: 700;">
                        <option value="">-- Not Configured --</option>
                    </select>
                </div>
                <div>
                    <label style="font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">Market Location</label>
                    <select id="prod-market-location-select" class="form-control" style="height: 38px; font-size: 0.82rem; font-weight: 700;">
                        <option value="Kerala">Kerala</option>
                        <option value="All India">All India</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Delhi">Delhi NCR</option>
                    </select>
                </div>
            </div>

            <!-- Suggested Mapping Banner (If unlinked but AI / string match found) -->
            <div id="market-suggested-mapping-banner" style="display: none; padding: 10px 12px; background: var(--surface-card, var(--surface)); border: 1px dashed var(--accent); border-radius: var(--radius-sm); margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">Suggested Government Commodity:</div>
                        <strong style="font-size: 0.85rem; color: var(--text);" id="market-suggested-name">Rice</strong>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="btn btn-primary btn-sm" id="btn-confirm-suggested-mapping" style="height: 30px; font-size: 0.72rem; padding: 0 10px;">
                            Confirm Link
                        </button>
                    </div>
                </div>
            </div>

            <!-- Price Comparison Matrix -->
            <div id="market-comparison-matrix" style="padding: 12px; background: var(--surface-card, var(--surface)); border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Your Selling Price</span>
                        <div id="compare-your-price" style="font-size: 1.15rem; font-weight: 800; color: var(--text); margin-top: 2px;">₹0.00</div>
                    </div>
                    <div>
                        <span style="font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Market Reference</span>
                        <div id="compare-market-price" style="font-size: 1.15rem; font-weight: 800; color: var(--accent); margin-top: 2px;">₹0.00</div>
                    </div>
                </div>

                <!-- Difference & Status Strip -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed var(--border); flex-wrap: wrap; gap: 6px;">
                    <div>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Difference:</span>
                        <strong id="compare-diff-amount" style="font-size: 0.82rem; margin-left: 4px;">+₹0.00</strong>
                    </div>
                    <span class="badge" id="compare-diff-badge" style="font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 4px;">
                        Reference Available
                    </span>
                </div>
            </div>

            <!-- Unit Conversion Info & Timestamp -->
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: var(--text-muted); flex-wrap: wrap; gap: 6px;">
                <span id="market-unit-conversion-note">Standard unit match (1:1)</span>
                <span id="market-ref-freshness-text">Updated today</span>
            </div>

            <!-- Information Disclaimer -->
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 10px; line-height: 1.35; padding-top: 8px; border-top: 1px solid var(--border);">
                <em>Reference only: Market prices are published benchmark government values. Your shop prices remain independent business decisions and are never altered automatically.</em>
            </div>
        </section>
`;

if (!html.includes('id="smart-stock-card"')) {
    html = html.replace(targetCard, stage5Cards + '\n' + targetCard);
}

fs.writeFileSync('product-details.html', html, 'utf8');
console.log('Successfully updated product-details.html');
