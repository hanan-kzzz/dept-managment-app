const fs = require('fs');

let html = fs.readFileSync('stock.html', 'utf8');

// 1. Add css/market-prices.css
if (!html.includes('css/market-prices.css')) {
    html = html.replace(
        '<link rel="stylesheet" href="css/stock.css">',
        '<link rel="stylesheet" href="css/stock.css">\n    <link rel="stylesheet" href="css/market-prices.css">'
    );
}

// 2. Add js/marketPriceService.js
if (!html.includes('js/marketPriceService.js')) {
    html = html.replace(
        '<script src="js/notifications.js"></script>',
        '<script src="js/marketPriceService.js"></script>\n    <script src="js/notifications.js"></script>'
    );
}

// 3. Add STOCK INSIGHTS section to LEFT column in stock.html
const insertAnchor = '                <!-- SECTION 2: STOCK MANAGEMENT -->';
const stockInsightsSection = `                <!-- STAGE 5: STOCK INSIGHTS SECTION -->
                <div class="settings-group" id="section-stock-insights">
                    <div class="settings-group-title">STOCK INSIGHTS</div>
                    <div class="settings-rows-list">
                        <!-- Products Needing Reorder -->
                        <div class="settings-row stock-overview-row" id="row-insight-reorder" data-filter="reorder_soon" role="button" tabindex="0" title="View products recommended for reordering">
                            <div class="settings-row-left">
                                <div class="settings-row-icon" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6;">
                                    <i data-lucide="sparkles"></i>
                                </div>
                                <div class="settings-row-content">
                                    <span class="settings-row-title">Reorder Soon</span>
                                    <span class="settings-row-desc">Estimated stock depleting</span>
                                </div>
                            </div>
                            <div class="settings-row-right">
                                <span class="stock-overview-badge" id="insight-count-reorder" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6;">0</span>
                                <div class="settings-row-chevron"><i data-lucide="chevron-right"></i></div>
                            </div>
                        </div>

                        <!-- Less than 7 days -->
                        <div class="settings-row stock-overview-row" id="row-insight-7days" data-filter="risk_7days" role="button" tabindex="0" title="Products with less than 7 days remaining">
                            <div class="settings-row-left">
                                <div class="settings-row-icon" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b;">
                                    <i data-lucide="clock"></i>
                                </div>
                                <div class="settings-row-content">
                                    <span class="settings-row-title">Stock Risk (&lt;7 Days)</span>
                                    <span class="settings-row-desc">High run-out probability</span>
                                </div>
                            </div>
                            <div class="settings-row-right">
                                <span class="stock-overview-badge warning" id="insight-count-7days">0</span>
                                <div class="settings-row-chevron"><i data-lucide="chevron-right"></i></div>
                            </div>
                        </div>

                        <!-- Market Prices Reference Page Link -->
                        <a href="market-prices.html" class="settings-row" id="row-link-market-prices" style="text-decoration: none; color: inherit;" title="Browse Government Market Price References">
                            <div class="settings-row-left">
                                <div class="settings-row-icon" style="background: var(--accent-tint); color: var(--accent);">
                                    <i data-lucide="scale"></i>
                                </div>
                                <div class="settings-row-content">
                                    <span class="settings-row-title">Market Prices</span>
                                    <span class="settings-row-desc">Government commodity references</span>
                                </div>
                            </div>
                            <div class="settings-row-right">
                                <span class="stock-overview-badge" style="background: var(--accent-tint); color: var(--accent);" id="insight-market-count">18</span>
                                <div class="settings-row-chevron"><i data-lucide="chevron-right"></i></div>
                            </div>
                        </a>
                    </div>
                </div>
`;

if (!html.includes('id="section-stock-insights"')) {
    html = html.replace(insertAnchor, stockInsightsSection + '\n' + insertAnchor);
}

fs.writeFileSync('stock.html', html, 'utf8');
console.log('Successfully updated stock.html');
