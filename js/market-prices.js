/**
 * Market Prices UI Logic - market-prices.js
 */

let currentMarketLocation = 'Kerala';
let currentMarketSearch = '';
let currentCommoditiesList = [];
let selectedCommodityId = null;
let currentChartRange = '7d';

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'market-prices') return;

    if (typeof Utils !== 'undefined' && Utils.initAppLayout) {
        Utils.initAppLayout('stock');
    }

    // Load initial settings preference
    if (typeof Storage !== 'undefined') {
        const settings = Storage.getSettings();
        if (settings && settings.marketDefaultLocation) {
            currentMarketLocation = settings.marketDefaultLocation;
        }
    }

    initMarketPricesPage();
});

function initMarketPricesPage() {
    const locSelect = document.getElementById('market-location-select');
    if (locSelect) {
        locSelect.value = currentMarketLocation;
        locSelect.addEventListener('change', (e) => {
            currentMarketLocation = e.target.value;
            loadMarketPrices(false);
        });
    }

    const searchInput = document.getElementById('market-search');
    const searchClear = document.getElementById('market-search-clear');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentMarketSearch = e.target.value.toLowerCase().trim();
            if (searchClear) {
                searchClear.style.display = currentMarketSearch ? 'block' : 'none';
            }
            renderMarketCards();
        });
    }

    if (searchClear) {
        searchClear.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            currentMarketSearch = '';
            searchClear.style.display = 'none';
            renderMarketCards();
        });
    }

    const refreshBtn = document.getElementById('btn-refresh-market-prices');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadMarketPrices(true);
        });
    }

    // Setup Modal Listeners
    setupCommodityModalListeners();

    // Initial Load
    loadMarketPrices(false);
}

async function loadMarketPrices(forceRefresh = false) {
    const refreshBtn = document.getElementById('btn-refresh-market-prices');
    const refreshText = document.getElementById('market-refresh-btn-text');
    const container = document.getElementById('market-cards-container');

    if (refreshBtn) refreshBtn.classList.add('loading');
    if (refreshText) refreshText.textContent = 'Updating...';

    try {
        if (typeof marketPriceService === 'undefined') {
            throw new Error('Market price service is not available');
        }

        const res = await marketPriceService.getMarketPrices(currentMarketLocation, forceRefresh);
        currentCommoditiesList = res.data || [];

        // Update status bar
        const sourceLabel = document.getElementById('market-source-label');
        const freshnessLabel = document.getElementById('market-freshness-label');
        const statusBadge = document.getElementById('market-status-badge');

        if (sourceLabel) sourceLabel.textContent = res.source || 'Government price data';
        if (freshnessLabel) freshnessLabel.textContent = marketPriceService.formatFreshness(res.updatedAt);
        if (statusBadge) {
            if (res.isCached) statusBadge.classList.add('cached');
            else statusBadge.classList.remove('cached');
        }

        renderMarketCards();

        if (forceRefresh && typeof Utils !== 'undefined') {
            Utils.showToast('Market prices updated from government database', 'success');
        }
    } catch (err) {
        console.error('Failed to load market prices:', err);
        if (container) {
            container.innerHTML = `
                <div class="card" style="padding: 24px; text-align: center; grid-column: 1 / -1;">
                    <i data-lucide="alert-circle" style="width: 28px; height: 28px; color: var(--danger); margin-bottom: 8px;"></i>
                    <div style="font-weight: 700; color: var(--text); margin-bottom: 4px;">Market prices temporarily unavailable</div>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">Your inventory and shop sales features remain fully functional.</p>
                    <button class="btn btn-outline btn-sm" onclick="loadMarketPrices(true)">Try Again</button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        if (typeof Utils !== 'undefined') {
            Utils.showToast('Market prices temporarily unavailable', 'error');
        }
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('loading');
        if (refreshText) refreshText.textContent = 'Refresh Prices';
    }
}

function renderMarketCards() {
    const container = document.getElementById('market-cards-container');
    if (!container) return;

    let filtered = currentCommoditiesList;
    if (currentMarketSearch) {
        filtered = currentCommoditiesList.filter(c => 
            c.name.toLowerCase().includes(currentMarketSearch) ||
            c.category.toLowerCase().includes(currentMarketSearch)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="card" style="padding: 30px; text-align: center; grid-column: 1 / -1;">
                <i data-lucide="search-x" style="width: 28px; height: 28px; color: var(--text-muted); margin-bottom: 8px;"></i>
                <div style="font-weight: 700; color: var(--text);">No matching commodities found</div>
                <p style="font-size: 0.78rem; color: var(--text-muted);">Try searching for Rice, Wheat, Sugar, Oil, Dal, etc.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    container.innerHTML = filtered.map(comm => {
        const diff = parseFloat(comm.diff) || 0;
        const diffClass = diff > 0 ? 'up' : (diff < 0 ? 'down' : 'neutral');
        const diffSymbol = diff > 0 ? '+' : '';
        const diffIcon = diff > 0 ? 'trending-up' : (diff < 0 ? 'trending-down' : 'minus');
        const freshness = (typeof marketPriceService !== 'undefined') ? marketPriceService.formatFreshness(comm.updatedAt) : 'Updated today';

        return `
            <div class="market-card" data-commodity-id="${comm.id}" role="button" tabindex="0">
                <div>
                    <div class="market-card-top">
                        <div>
                            <h3 class="market-card-title">${comm.name}</h3>
                            <div class="market-card-category">${comm.category}</div>
                        </div>
                        <span class="market-card-badge">${comm.priceType || 'Retail ref'}</span>
                    </div>
                    <div class="market-card-price-wrap">
                        <span class="market-card-price">₹${comm.price.toFixed(2)}</span>
                        <span class="market-card-unit">/ ${comm.unit}</span>
                    </div>
                </div>
                <div class="market-card-footer">
                    <span>${freshness}</span>
                    <span class="market-card-change ${diffClass}">
                        <i data-lucide="${diffIcon}" style="width: 12px; height: 12px;"></i>
                        ${diff !== 0 ? `${diffSymbol}₹${diff.toFixed(2)}` : 'Stable'}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Bind card click
    container.querySelectorAll('.market-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.commodityId;
            openCommodityDetailModal(id);
        });
    });
}

function setupCommodityModalListeners() {
    const modal = document.getElementById('modal-commodity-detail');
    const closeIcon = document.getElementById('modal-comm-close');
    const closeBtn = document.getElementById('modal-comm-close-btn');

    const closeModal = () => {
        if (modal) modal.classList.remove('active');
    };

    if (closeIcon) closeIcon.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Range tab buttons
    const rangeTabs = document.querySelectorAll('.market-range-tab');
    rangeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            rangeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentChartRange = tab.dataset.range;
            renderChartForSelected();
        });
    });
}

function openCommodityDetailModal(commodityId) {
    selectedCommodityId = commodityId;
    const comm = currentCommoditiesList.find(c => c.id === commodityId);
    if (!comm) return;

    const modal = document.getElementById('modal-commodity-detail');
    const titleEl = document.getElementById('modal-comm-title');
    const priceEl = document.getElementById('modal-comm-price');
    const typeEl = document.getElementById('modal-comm-type');
    const changeBadge = document.getElementById('modal-comm-change-badge');
    const locEl = document.getElementById('modal-comm-location');
    const catEl = document.getElementById('modal-comm-category');
    const sourceEl = document.getElementById('modal-comm-source');
    const updatedEl = document.getElementById('modal-comm-updated');

    if (titleEl) titleEl.textContent = comm.name;
    if (priceEl) priceEl.textContent = `₹${comm.price.toFixed(2)} / ${comm.unit}`;
    if (typeEl) typeEl.textContent = comm.priceType || 'Retail reference';
    if (locEl) locEl.textContent = comm.location || currentMarketLocation;
    if (catEl) catEl.textContent = comm.category || 'General';
    if (sourceEl) sourceEl.textContent = comm.source || 'Department of Consumer Affairs';
    if (updatedEl) updatedEl.textContent = (typeof marketPriceService !== 'undefined') ? marketPriceService.formatFreshness(comm.updatedAt) : 'Updated today';

    if (changeBadge) {
        const diff = parseFloat(comm.diff) || 0;
        const pct = parseFloat(comm.changePercent) || 0;
        const diffClass = diff > 0 ? 'up' : (diff < 0 ? 'down' : 'neutral');
        const diffSymbol = diff > 0 ? '+' : '';
        
        changeBadge.className = `market-card-change ${diffClass}`;
        changeBadge.textContent = `${diffSymbol}₹${diff.toFixed(2)} (${diffSymbol}${pct.toFixed(2)}%)`;
    }

    renderChartForSelected();

    if (modal) modal.classList.add('active');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderChartForSelected() {
    const chartContainer = document.getElementById('market-chart-container');
    if (!chartContainer || !selectedCommodityId || typeof marketPriceService === 'undefined') return;

    const history = marketPriceService.getPriceHistory(selectedCommodityId, currentMarketLocation, currentChartRange);
    if (!history || history.length === 0) {
        chartContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 20px;">No historical data available</div>`;
        return;
    }

    // Generate SVG Sparkline / Line Chart
    const width = 450;
    const height = 110;
    const padding = 20;

    const prices = history.map(h => h.price);
    const minP = Math.min(...prices) * 0.98;
    const maxP = Math.max(...prices) * 1.02;
    const rangeP = (maxP - minP) || 1;

    const points = history.map((h, i) => {
        const x = padding + (i / (history.length - 1 || 1)) * (width - 2 * padding);
        const y = height - padding - ((h.price - minP) / rangeP) * (height - 2 * padding);
        return { x, y, date: h.date, price: h.price };
    });

    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');

    // Area fill under line
    const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(height - padding).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - padding).toFixed(1)} Z`;

    const svgHtml = `
        <svg viewBox="0 0 ${width} ${height}" class="market-chart-svg" preserveAspectRatio="none">
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            <!-- Grid Lines -->
            <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="var(--border)" stroke-dasharray="3,3" stroke-width="0.75"/>
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border)" stroke-width="1"/>
            
            <!-- Area & Line -->
            <path d="${areaD}" fill="url(#chartGrad)"/>
            <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- Latest Point Dot -->
            <circle cx="${points[points.length - 1].x.toFixed(1)}" cy="${points[points.length - 1].y.toFixed(1)}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
            
            <!-- Labels -->
            <text x="${padding}" y="${padding - 4}" font-size="9" fill="var(--text-muted)" font-family="sans-serif">₹${maxP.toFixed(1)}</text>
            <text x="${padding}" y="${height - 4}" font-size="9" fill="var(--text-muted)" font-family="sans-serif">₹${minP.toFixed(1)}</text>
            <text x="${width - padding}" y="${height - 4}" text-anchor="end" font-size="9" fill="var(--text-muted)" font-family="sans-serif">Today: ₹${prices[prices.length - 1].toFixed(2)}</text>
        </svg>
    `;

    chartContainer.innerHTML = svgHtml;
}
