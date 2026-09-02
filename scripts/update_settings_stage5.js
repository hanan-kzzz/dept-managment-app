const fs = require('fs');

let html = fs.readFileSync('settings.html', 'utf8');

// 1. Add Market Prices & Smart Inventory Section to settings.html
const sectionAnchor = '            <!-- SECTION 2: CONNECTIONS -->';
const marketSettingsSection = `            <!-- STAGE 5: MARKET PRICES & SMART INVENTORY -->
            <div class="settings-group">
                <div class="settings-group-title">Market Reference & Inventory</div>
                <div class="settings-rows-list">
                    <div class="settings-row" id="row-market-settings">
                        <div class="settings-row-left">
                            <div class="settings-row-icon" style="background: var(--accent-tint); color: var(--accent);">
                                <i data-lucide="scale"></i>
                            </div>
                            <div class="settings-row-content">
                                <span class="settings-row-title">Market Price & Smart Stock</span>
                                <span class="settings-row-desc">Government data source, location & reorder parameters</span>
                            </div>
                        </div>
                        <div class="settings-row-right">
                            <span class="settings-row-value" id="val-market-loc">Kerala</span>
                            <div class="settings-row-chevron"><i data-lucide="chevron-right"></i></div>
                        </div>
                    </div>
                </div>
            </div>
`;

if (!html.includes('id="row-market-settings"')) {
    html = html.replace(sectionAnchor, marketSettingsSection + '\n' + sectionAnchor);
}

// 2. Add Market Settings Modal to settings.html
const modalAnchor = '    <!-- MODAL: INVOICE SETTINGS -->';
const marketModalHtml = `    <!-- MODAL: MARKET PRICE & SMART STOCK SETTINGS (STAGE 5) -->
    <div class="modal-overlay" id="modal-market-settings">
        <div class="modal-container" style="max-height: 85vh; display: flex; flex-direction: column;">
            <div class="modal-header" style="flex-shrink: 0;">
                <h3 class="modal-title">Market Price & Smart Stock</h3>
                <button class="modal-close" id="modal-market-settings-close"><i data-lucide="x"></i></button>
            </div>
            <form id="form-market-settings" style="padding: 16px; overflow-y: auto; flex: 1;" novalidate>
                <!-- Source Info Box -->
                <div style="background: var(--surface-card, var(--surface)); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Data Source</span>
                        <span class="status-tag connected" style="font-size: 0.65rem;">Available</span>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: var(--text);">Government Consumer Price Monitoring</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Department of Consumer Affairs, Govt. of India</div>
                </div>

                <!-- Location Selector -->
                <div class="form-group" style="margin-bottom: 14px;">
                    <label for="setting-market-location" style="font-size: 0.78rem; font-weight: 700;">Default Benchmark Location</label>
                    <select id="setting-market-location" class="form-control" style="height: 42px;">
                        <option value="Kerala">Kerala</option>
                        <option value="All India">All India (National Average)</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Delhi">Delhi NCR</option>
                    </select>
                </div>

                <!-- Refresh Frequency -->
                <div class="form-group" style="margin-bottom: 14px;">
                    <label for="setting-market-refresh-freq" style="font-size: 0.78rem; font-weight: 700;">Price Refresh Frequency</label>
                    <select id="setting-market-refresh-freq" class="form-control" style="height: 42px;">
                        <option value="manual">Manual (On-Demand Refresh)</option>
                        <option value="daily">Daily Automatic Check</option>
                    </select>
                </div>

                <!-- Price Change Alert Toggle -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-top: 1px dashed var(--border); border-bottom: 1px dashed var(--border); margin-bottom: 14px;">
                    <div>
                        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text);">Price Change Alerts</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">Notify when commodity prices fluctuate significantly</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-price-alerts-toggle">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <!-- Price Change Alert Threshold -->
                <div class="form-group" style="margin-bottom: 16px;">
                    <label for="setting-price-alert-threshold" style="font-size: 0.78rem; font-weight: 700;">Alert Threshold</label>
                    <select id="setting-price-alert-threshold" class="form-control" style="height: 42px;">
                        <option value="3">3% Change</option>
                        <option value="5" selected>5% Change (Recommended)</option>
                        <option value="10">10% Change</option>
                    </select>
                </div>

                <!-- Smart Stock Safety Parameters -->
                <div class="prod-section-header" style="margin: 16px 0 10px 0;">
                    <span class="prod-section-title" style="font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Smart Stock Intelligence Parameters</span>
                </div>

                <div class="grid-2" style="margin-bottom: 14px;">
                    <div class="form-group">
                        <label for="setting-safety-buffer-days" style="font-size: 0.75rem; font-weight: 700;">Safety Stock Buffer (Days)</label>
                        <input type="number" id="setting-safety-buffer-days" class="form-control" value="3" min="1" max="30" style="height: 42px;">
                    </div>
                    <div class="form-group">
                        <label for="setting-supplier-lead-days" style="font-size: 0.75rem; font-weight: 700;">Supplier Lead Time (Days)</label>
                        <input type="number" id="setting-supplier-lead-days" class="form-control" value="3" min="1" max="30" style="height: 42px;">
                    </div>
                </div>

                <div class="modal-footer" style="padding-top: 10px;">
                    <button type="button" class="btn btn-secondary" id="btn-market-settings-cancel" style="flex: 1; height: 44px;">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="btn-market-settings-save" style="flex: 1; height: 44px;">Save Settings</button>
                </div>
            </form>
        </div>
    </div>
`;

if (!html.includes('id="modal-market-settings"')) {
    html = html.replace(modalAnchor, marketModalHtml + '\n' + modalAnchor);
}

fs.writeFileSync('settings.html', html, 'utf8');
console.log('Successfully updated settings.html');
