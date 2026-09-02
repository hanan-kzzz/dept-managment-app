/**
 * Sales POS Cashier & Professional Billing Engine - js/sales.js
 * Stage 2: Professional Bill / Invoice System
 */

let cart = [];
let currentStep = 0;
let selectedPaymentMethod = 'Cash';
let salesHistoryKeyword = '';
let salesStatusFilter = 'all'; // 'all' | 'paid' | 'partial' | 'due'
let salesHistoryLimit = 10;
let lastCompletedSale = null;
let isProcessingSale = false;

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'sales') return;

    initSalesPage();
});

function initSalesPage() {
    populateCustomersDropdown();
    renderPOSCatalog();
    setupStepNavigation();
    setupSalesEventListeners();
    setupFilterPills();
    updateCartUI();
    setupCustomerSearchEvents();
    selectCustomer('walk-in');

    // Render sales history dashboard
    renderSalesHubDashboard();

    // Bind sales history search
    const salesSearch = document.getElementById('sales-history-search');
    if (salesSearch) {
        salesSearch.addEventListener('input', (e) => {
            salesHistoryKeyword = e.target.value.toLowerCase().trim();
            renderSalesHubDashboard();
        });
    }

    // Bind start new sale button
    const startNewSaleBtn = document.getElementById('btn-start-new-sale-main');
    if (startNewSaleBtn) {
        startNewSaleBtn.addEventListener('click', () => {
            changeStep(1);
        });
    }

    // Check URL parameters for direct customer pre-selection or POS entry
    const params = new URLSearchParams(window.location.search);
    const customerIdParam = params.get('customerId');
    if (customerIdParam) {
        selectCustomer(customerIdParam);
    }

    const shouldOpenNewSale = 
        params.get('openNewSale') === 'true' || 
        params.get('newSale') === 'true' || 
        params.get('openAdd') === 'true' || 
        params.get('new') === 'true' || 
        params.get('action') === 'new' || 
        params.get('action') === 'newSale' || 
        window.location.hash === '#new' || 
        window.location.hash === '#new-sale' || 
        Boolean(customerIdParam);

    if (shouldOpenNewSale) {
        changeStep(1);
    } else {
        changeStep(0);
    }
}

// ==========================================
// STEP 0: SALES HISTORY & DASHBOARD HUB
// ==========================================

function setupFilterPills() {
    const pills = document.querySelectorAll('.sales-filter-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            salesStatusFilter = pill.dataset.filter || 'all';
            renderSalesHubDashboard();
        });
    });
}

function renderSalesHubDashboard() {
    const totalSumEl = document.getElementById('sales-sum-total');
    const countEl = document.getElementById('sales-sum-count');
    const avgEl = document.getElementById('sales-sum-avg');
    const listFeed = document.getElementById('sales-history-list');

    if (!listFeed) return;

    const sales = Storage.getSales();

    // Get today's start date (ignoring time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter today's sales for top summary metrics
    const todaySales = sales.filter(s => {
        const saleDate = new Date(s.date || s.createdAt);
        return saleDate >= today;
    });

    const totalSum = todaySales.reduce((sum, s) => sum + (parseFloat(s.grandTotal !== undefined ? s.grandTotal : s.total) || 0), 0);
    const countVal = todaySales.length;
    const avgVal = countVal > 0 ? totalSum / countVal : 0;

    if (totalSumEl) totalSumEl.textContent = Utils.formatCurrency(totalSum);
    if (countEl) countEl.textContent = countVal;
    if (avgEl) avgEl.textContent = Utils.formatCurrency(avgVal);

    // Filter sales based on search keyword and status pill
    let filteredSales = [...sales];

    // Status filter
    if (salesStatusFilter !== 'all') {
        filteredSales = filteredSales.filter(s => {
            const status = s.paymentStatus || (s.dueAmount > 0 ? (s.paymentAmount > 0 ? 'partial' : 'due') : 'paid');
            return status.toLowerCase() === salesStatusFilter.toLowerCase();
        });
    }

    // Keyword filter (invoice number, customer name, customer phone, product name, barcode)
    if (salesHistoryKeyword) {
        filteredSales = filteredSales.filter(s => {
            const inv = (s.invoiceNumber || s.id || '').toLowerCase();
            const cust = (s.customerName || '').toLowerCase();
            const phone = (s.customerPhone || '').replace(/[\s\-()]/g, '');
            const method = (s.paymentMethod || '').toLowerCase();
            const itemsMatch = s.items && s.items.some(it => 
                (it.productName && it.productName.toLowerCase().includes(salesHistoryKeyword)) ||
                (it.barcode && it.barcode.includes(salesHistoryKeyword)) ||
                (it.sku && it.sku.includes(salesHistoryKeyword))
            );

            return inv.includes(salesHistoryKeyword) ||
                   cust.includes(salesHistoryKeyword) ||
                   phone.includes(salesHistoryKeyword.replace(/[\s\-()]/g, '')) ||
                   method.includes(salesHistoryKeyword) ||
                   itemsMatch;
        });
    }

    // Sort by date descending
    filteredSales.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    if (filteredSales.length === 0) {
        let emptyTitle = "No Sales Yet";
        let emptyDesc = "Create your first bill to start tracking daily revenue & customer invoices.";
        let showCta = true;

        if (salesStatusFilter !== 'all' || salesHistoryKeyword) {
            emptyTitle = "No Matching Transactions";
            emptyDesc = salesStatusFilter === 'due' 
                ? "No due transactions right now." 
                : "Try adjusting your filter or search keywords to find transaction records.";
            showCta = false;
        }

        listFeed.innerHTML = `
            <div class="sales-empty-state-card" style="text-center: center; padding: 36px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; margin-top: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                <div class="empty-state-icon-box" style="width: 48px; height: 48px; border-radius: 50%; background: var(--surface-sec); color: var(--text-muted); display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                    <i data-lucide="receipt" style="width: 24px; height: 24px;"></i>
                </div>
                <h3 class="empty-state-title" style="font-size: 1rem; font-weight: 800; color: var(--text); margin: 0;">${emptyTitle}</h3>
                <p class="empty-state-desc" style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin: 0; max-width: 260px; text-align: center;">${emptyDesc}</p>
                ${showCta ? `
                    <button type="button" class="btn btn-primary empty-state-cta" onclick="changeStep(1)" style="margin-top: 8px; border-radius: 12px; padding: 10px 18px; font-weight: 800; font-size: 0.85rem;">
                        <i data-lucide="plus"></i> Create New Sale
                    </button>
                ` : `
                    <button type="button" class="btn btn-outline empty-state-reset-btn" onclick="document.getElementById('sales-history-search').value=''; salesHistoryKeyword=''; salesStatusFilter='all'; document.querySelectorAll('.sales-filter-pill').forEach(p => p.classList.toggle('active', p.dataset.filter === 'all')); renderSalesHubDashboard();" style="margin-top: 8px; border-radius: 12px; padding: 8px 16px; font-weight: 700; font-size: 0.8rem;">
                        <i data-lucide="rotate-ccw"></i> Reset Filters
                    </button>
                `}
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // Pagination limit (e.g., 10 items initially)
    const totalCount = filteredSales.length;
    const paginatedSales = filteredSales.slice(0, salesHistoryLimit);

    // Group sales by Today, Yesterday, and Older
    const groups = {
        'Today': [],
        'Yesterday': [],
        'Older Transactions': []
    };

    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    paginatedSales.forEach(s => {
        const d = new Date(s.date || s.createdAt);
        const dStr = d.toDateString();

        if (dStr === todayStr) {
            groups['Today'].push(s);
        } else if (dStr === yesterdayStr) {
            groups['Yesterday'].push(s);
        } else {
            groups['Older Transactions'].push(s);
        }
    });

    let html = '';

    for (const [groupName, groupSales] of Object.entries(groups)) {
        if (groupSales.length === 0) continue;

        html += `
            <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin: 18px 0 10px 4px; letter-spacing: 0.8px;">${groupName} (${groupSales.length})</div>
        `;

        html += groupSales.map(s => {
            const dateStr = Utils.formatDateTime(s.date || s.createdAt);
            const invNum = s.invoiceNumber || `INV-${s.id.slice(-6).toUpperCase()}`;
            const name = s.customerName || 'Walk-in Customer';
            const method = s.paymentMethod || 'Cash';
            const grandTotal = parseFloat(s.grandTotal !== undefined ? s.grandTotal : s.total) || 0;
            const dueAmount = parseFloat(s.amountDue !== undefined ? s.amountDue : s.dueAmount) || 0;
            const paidAmount = parseFloat(s.amountPaid !== undefined ? s.amountPaid : s.paymentAmount) || 0;
            const itemQty = s.items ? s.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 1), 0) : 0;
            
            // Status bar & badge calculation
            let statusBadge = '';
            if (dueAmount <= 0.001) {
                statusBadge = `<span style="padding: 3px 8px; background: rgba(34, 197, 94, 0.12); color: #166534; border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: 0.5px;">PAID</span>`;
            } else if (paidAmount > 0.001) {
                statusBadge = `<span style="padding: 3px 8px; background: rgba(245, 158, 11, 0.12); color: #92400E; border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: 0.5px;">PARTIAL (DUE: ${Utils.formatCurrency(dueAmount)})</span>`;
            } else {
                statusBadge = `<span style="padding: 3px 8px; background: rgba(239, 68, 68, 0.12); color: #991B1B; border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: 0.5px;">DUE: ${Utils.formatCurrency(dueAmount)}</span>`;
            }

            // Method icon selection
            let methodIcon = 'banknote';
            const mLower = method.toLowerCase();
            if (mLower.includes('upi')) methodIcon = 'qr-code';
            else if (mLower.includes('card')) methodIcon = 'credit-card';
            else if (mLower.includes('credit') || mLower.includes('udhar')) methodIcon = 'book-open';

            return `
                <div class="card card-hover-lift" style="padding: 14px 16px; margin-bottom: 10px; border-radius: 16px; border: 1px solid var(--border); background: var(--surface); box-shadow: var(--shadow-2xs); cursor: pointer; transition: all 0.2s ease;" data-id="${s.id}">
                    <!-- Top Row: Invoice ID Tag & Status Pill -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-family: monospace; font-size: 11px; font-weight: 800; background: var(--surface-sec); color: var(--text-muted); border: 1px solid var(--border); padding: 2px 8px; border-radius: 6px;">${invNum}</span>
                        ${statusBadge}
                    </div>

                    <!-- Middle Row: Timestamp & Customer Name -->
                    <div style="margin-bottom: 10px;">
                        <div style="font-size: 0.95rem; font-weight: 800; color: var(--text); line-height: 1.3;">${Utils.escapeHtml(name)}</div>
                        <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-top: 2px;">${dateStr}</div>
                    </div>

                    <!-- Bottom Row: Payment Method Tag & Item Count Left, Amount & View Bill Right -->
                    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-light, #F1F5F9); pt-2.5; padding-top: 10px;">
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">
                            <span style="display: flex; align-items: center; gap: 4px; background: var(--surface-sec); border: 1px solid var(--border); padding: 2px 7px; border-radius: 6px; font-size: 11px;">
                                <i data-lucide="${methodIcon}" style="width: 12px; height: 12px; color: var(--accent);"></i> ${method}
                            </span>
                            <span>&middot;</span>
                            <span>${itemQty} item${itemQty !== 1 ? 's' : ''}</span>
                        </div>

                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.05rem; font-weight: 900; color: var(--text); font-family: monospace;">${Utils.formatCurrency(grandTotal)}</span>
                            <button type="button" class="btn btn-outline btn-sm btn-view-historical-bill" data-id="${s.id}" style="border-radius: 8px; padding: 3px 8px; font-size: 11px; font-weight: 700;">
                                View Bill
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Append Load More button if total items exceed limit
    if (totalCount > salesHistoryLimit) {
        html += `
            <div style="text-align: center; margin: 16px 0 24px;">
                <button type="button" class="btn btn-outline" id="btn-load-more-sales" style="border-radius: 12px; font-weight: 800; font-size: 0.8rem; padding: 8px 20px;">
                    Load More Transactions (${totalCount - salesHistoryLimit} remaining)
                </button>
            </div>
        `;
    }

    listFeed.innerHTML = html;

    // Bind Load More button
    const loadMoreBtn = document.getElementById('btn-load-more-sales');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            salesHistoryLimit += 10;
            renderSalesHubDashboard();
        });
    }

    // Bind card tap & View Bill buttons
    listFeed.querySelectorAll('.card-hover-lift').forEach(card => {
        card.addEventListener('click', (e) => {
            const saleId = card.dataset.id;
            if (typeof Utils !== 'undefined' && typeof Utils.showBillModal === 'function') {
                Utils.showBillModal(saleId);
            }
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Populate customer selector dropdown
function populateCustomersDropdown() {
    const select = document.getElementById('sale-customer-select');
    if (!select) return;

    select.innerHTML = '<option value="walk-in">Walk-in Customer</option>';
    const customers = Storage.getCustomers();
    
    customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.phone})`;
        select.appendChild(opt);
    });
}

// ==========================================
// STEP 1: CATALOG SEARCH & ADD TO CART
// ==========================================

function renderPOSCatalog(query = '') {
    const container = document.getElementById('pos-catalog-list');
    if (!container) return;

    const products = Storage.getProducts();
    let filtered = products;

    if (query) {
        filtered = products.filter(p => 
            p.productName.toLowerCase().includes(query) || 
            (p.sku && p.sku.toLowerCase().includes(query)) || 
            (p.barcode && p.barcode.includes(query))
        );
    }

    // Sort alphabetically by name
    filtered.sort((a, b) => a.productName.localeCompare(b.productName));

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 28px 0; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-md); text-align: center;">
                <p class="empty-state-text" style="color: var(--text-muted); font-size: 0.85rem;">No products match search criteria.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(p => {
        const qty = parseFloat(p.currentQuantity) || 0;
        const min = parseFloat(p.minimumStockLevel) || 0;
        const isOutOfStock = qty <= 0;
        
        let stockBadge = `${qty} ${p.unit || 'Piece'}(s) available`;
        let badgeColor = 'color: var(--text-muted);';
        
        if (isOutOfStock) {
            stockBadge = 'Out of Stock';
            badgeColor = 'color: var(--danger); font-weight: 700;';
        } else if (qty <= min) {
            stockBadge = `Low Stock (${qty} left)`;
            badgeColor = 'color: var(--warning); font-weight: 700;';
        }

        const inCartItem = cart && cart.find(item => item.productId === p.id);
        const inCart = Boolean(inCartItem);
        const rowClass = inCart ? 'product-row-clean selected-product' : 'product-row-clean';

        return `
            <div class="${rowClass}" data-id="${p.id}" style="cursor: pointer;">
                <div class="product-info-col" style="pointer-events: none;">
                    <span class="product-name-txt">${p.productName}</span>
                    <span class="product-meta-txt" style="${badgeColor}">${stockBadge}</span>
                </div>
                <div class="product-action-col">
                    <span class="product-price-txt" style="pointer-events: none;">${Utils.formatCurrency(p.sellingRate)}</span>
                    <button type="button" class="btn-add-quick" data-id="${p.id}" ${isOutOfStock ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} aria-label="Add to cart" title="Add to cart">
                        ${inCart ? `<i data-lucide="check" style="width:14px; height:14px; stroke-width: 3px;"></i> ${inCartItem.quantity} in Cart` : `<i data-lucide="plus" style="width:14px; height:14px; stroke-width: 2.5px;"></i> Add`}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Bind Quick Add Buttons & Row Clicks
    container.querySelectorAll('.product-row-clean').forEach(row => {
        row.addEventListener('click', (e) => {
            const prodId = row.dataset.id;
            const product = Storage.getProduct(prodId);
            if (product) {
                addToCart(product);
            }
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addToCart(product) {
    if (!product) return;
    const currentStock = parseFloat(product.currentQuantity) || 0;

    if (currentStock <= 0) {
        Utils.showToast(`"${product.productName}" is completely out of stock!`, "error");
        return;
    }

    const existingIdx = cart.findIndex(item => item.productId === product.id);
    if (existingIdx !== -1) {
        const item = cart[existingIdx];
        if (item.quantity + 1 > currentStock) {
            Utils.showToast(`Insufficient stock! Only ${currentStock} remaining.`, "error");
            return;
        }
        item.quantity += 1;
    } else {
        cart.push({
            productId: product.id,
            name: product.productName,
            barcode: product.barcode || '',
            sku: product.sku || '',
            sellingRate: parseFloat(product.sellingRate) || 0,
            unit: product.unit || 'Piece',
            quantity: 1
        });
    }

    Utils.showToast(`Added "${product.productName}" to cart`, "success");
    updateCartUI();
}

// ==========================================
// STEP 2: CART REVIEW & PRICING
// ==========================================

function updateCartUI() {
    const feed = document.getElementById('sale-cart-feed');
    const bottomCart = document.getElementById('pos-bottom-cart');
    const cartCountEl = document.getElementById('cart-bar-count');
    const cartPriceEl = document.getElementById('cart-bar-price');

    if (!feed) return;

    if (cart.length === 0) {
        feed.innerHTML = `
            <div class="empty-state" style="padding: 32px 0; background-color: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-md); text-align: center;">
                <p class="empty-state-text" style="color: var(--text-muted); font-size: 0.85rem;">No products added to cart.</p>
            </div>
        `;
        if (bottomCart) bottomCart.style.display = 'none';
        renderPOSCatalog(document.getElementById('sale-product-lookup')?.value.trim().toLowerCase() || '');
        recalculatePricing();
        return;
    }

    // Step 1 Bottom Cart Bar & Catalog sync
    if (bottomCart) {
        bottomCart.style.display = 'flex';
        const subtotal = getSubtotal();
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCountEl) cartCountEl.textContent = `${count} product${count > 1 ? 's' : ''}`;
        if (cartPriceEl) cartPriceEl.textContent = Utils.formatCurrency(subtotal);
    }
    renderPOSCatalog(document.getElementById('sale-product-lookup')?.value.trim().toLowerCase() || '');

    // Step 2 Cart List
    feed.innerHTML = cart.map((item, idx) => {
        return `
            <div class="cart-item-row">
                <div style="flex: 1; min-width: 0; padding-right: 8px;">
                    <div style="font-weight: 700; font-size: 0.9rem; color: var(--text);">${item.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1px;">${Utils.formatCurrency(item.sellingRate)} per ${item.unit}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="qty-controls">
                        <button type="button" class="qty-btn btn-minus" data-idx="${idx}">-</button>
                        <input type="number" class="qty-input input-qty" data-idx="${idx}" value="${item.quantity}" min="0.01" step="0.01">
                        <button type="button" class="qty-btn btn-plus" data-idx="${idx}">+</button>
                    </div>
                    <span style="font-weight: 800; font-size: 0.9rem; color: var(--text); min-width: 68px; text-align: right;">${Utils.formatCurrency(item.sellingRate * item.quantity)}</span>
                    <button type="button" class="btn-delete-cart" data-idx="${idx}" title="Remove Item">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Bind Cart Controllers
    document.querySelectorAll('.btn-minus').forEach(btn => btn.addEventListener('click', (e) => adjustCartQty(parseInt(e.target.dataset.idx), -1)));
    document.querySelectorAll('.btn-plus').forEach(btn => btn.addEventListener('click', (e) => adjustCartQty(parseInt(e.target.dataset.idx), 1)));
    document.querySelectorAll('.input-qty').forEach(input => input.addEventListener('change', (e) => setCartQty(parseInt(e.target.dataset.idx), parseFloat(e.target.value))));
    document.querySelectorAll('.btn-delete-cart').forEach(btn => btn.addEventListener('click', (e) => removeFromCart(parseInt(e.target.dataset.idx))));

    recalculatePricing();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    renderPOSCatalog(document.getElementById('sale-product-lookup')?.value.trim().toLowerCase() || '');
}

function adjustCartQty(idx, delta) {
    const item = cart[idx];
    if (!item) return;
    const product = Storage.getProduct(item.productId);
    if (!product) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        removeFromCart(idx);
        return;
    }

    if (newQty > product.currentQuantity) {
        Utils.showToast(`Insufficient stock! Only ${product.currentQuantity} remaining.`, "error");
        return;
    }

    item.quantity = newQty;
    updateCartUI();
}

function setCartQty(idx, val) {
    const item = cart[idx];
    if (!item) return;
    const product = Storage.getProduct(item.productId);
    if (!product) return;

    if (isNaN(val) || val <= 0) {
        removeFromCart(idx);
        return;
    }

    if (val > product.currentQuantity) {
        Utils.showToast(`Insufficient stock! Only ${product.currentQuantity} remaining.`, "error");
        updateCartUI();
        return;
    }

    item.quantity = val;
    updateCartUI();
}

function removeFromCart(idx) {
    const item = cart[idx];
    if (item) {
        cart.splice(idx, 1);
        Utils.showToast(`"${item.name}" removed from cart`, "info");
    }
    updateCartUI();
}

function getSubtotal() {
    return cart.reduce((sum, item) => sum + (item.sellingRate * item.quantity), 0);
}

function getDiscount() {
    const discountInput = document.getElementById('sale-discount');
    return parseFloat(discountInput?.value) || 0;
}

function getTax() {
    const settings = Storage.getSettings();
    if (!settings.taxEnabled || !settings.taxRate) return 0;
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const taxableAmount = Math.max(0, subtotal - discount);
    return (taxableAmount * parseFloat(settings.taxRate)) / 100;
}

function getNetTotal() {
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const tax = getTax();
    return Math.max(0, subtotal - discount + tax);
}

function recalculatePricing() {
    const subtotal = getSubtotal();
    const discountInput = document.getElementById('sale-discount');
    
    let discount = parseFloat(discountInput?.value) || 0;
    if (discount > subtotal) {
        discount = subtotal;
        if (discountInput) discountInput.value = subtotal;
    }

    const settings = Storage.getSettings();
    const tax = getTax();
    const netTotal = Math.max(0, subtotal - discount + tax);

    // Update Step 2 Summary
    const sumSubtotalEl = document.getElementById('sum-subtotal');
    const sumTotalEl = document.getElementById('sum-total');
    const sumTaxRow = document.getElementById('sum-tax-row');
    const sumTaxVal = document.getElementById('sum-tax');
    const sumTaxLabel = document.getElementById('sum-tax-label');

    if (sumSubtotalEl) sumSubtotalEl.textContent = Utils.formatCurrency(subtotal);
    if (sumTotalEl) sumTotalEl.textContent = Utils.formatCurrency(netTotal);

    if (sumTaxRow && sumTaxVal) {
        if (settings.taxEnabled && settings.taxRate > 0) {
            sumTaxRow.style.display = 'flex';
            sumTaxLabel.textContent = `Tax / GST (${settings.taxRate}%)`;
            sumTaxVal.textContent = Utils.formatCurrency(tax);
        } else {
            sumTaxRow.style.display = 'none';
        }
    }

    // Update Step 3 Summary
    const paySubtotalVal = document.getElementById('pay-subtotal-val');
    const payDiscountVal = document.getElementById('pay-discount-val');
    const payTaxRow = document.getElementById('pay-tax-row');
    const payTaxVal = document.getElementById('pay-tax-val');
    const payTotalDisplay = document.getElementById('pay-total-display');

    if (paySubtotalVal) paySubtotalVal.textContent = Utils.formatCurrency(subtotal);
    if (payDiscountVal) payDiscountVal.textContent = `-${Utils.formatCurrency(discount)}`;
    if (payTotalDisplay) payTotalDisplay.textContent = Utils.formatCurrency(netTotal);

    if (payTaxRow && payTaxVal) {
        if (settings.taxEnabled && settings.taxRate > 0) {
            payTaxRow.style.display = 'flex';
            payTaxVal.textContent = `+${Utils.formatCurrency(tax)}`;
        } else {
            payTaxRow.style.display = 'none';
        }
    }

    // Update Step 3 Dynamic Panel Calculations
    updatePaymentPanelsCalculation(netTotal);
}

// ==========================================
// STEP 3: DEDICATED PAYMENT INTERFACE
// ==========================================

function updatePaymentPanelsCalculation(netTotal) {
    const customerSelect = document.getElementById('sale-customer-select');
    const customerId = customerSelect ? customerSelect.value : 'walk-in';
    const isWalkIn = customerId === 'walk-in';

    // 1. Cash Calculation
    const paidInput = document.getElementById('sale-amount-paid');
    const changeLine = document.getElementById('cash-change-line');
    const changeVal = document.getElementById('cash-change-val');
    const remainingLine = document.getElementById('cash-remaining-line');
    const remainingVal = document.getElementById('cash-remaining-val');

    const received = parseFloat(paidInput?.value) || 0;
    const diff = received - netTotal;

    if (changeLine && remainingLine && changeVal && remainingVal) {
        if (diff >= 0) {
            changeLine.style.display = 'flex';
            changeVal.textContent = Utils.formatCurrency(diff);
            remainingLine.style.display = 'none';
        } else {
            changeLine.style.display = 'none';
            remainingLine.style.display = 'flex';
            remainingVal.textContent = Utils.formatCurrency(Math.abs(diff));
        }
    }

    // 2. UPI & Card Amounts
    const upiVal = document.getElementById('upi-amount-val');
    const cardVal = document.getElementById('card-amount-val');
    if (upiVal) upiVal.textContent = Utils.formatCurrency(netTotal);
    if (cardVal) cardVal.textContent = Utils.formatCurrency(netTotal);

    // 3. Due Details
    const dueWalkinWarn = document.getElementById('due-walkin-warning');
    const dueDetails = document.getElementById('due-registered-details');
    const dueCustName = document.getElementById('due-customer-name');
    const dueOldBal = document.getElementById('due-old-balance');
    const dueNewSale = document.getElementById('due-new-sale');
    const duePartialInput = document.getElementById('due-partial-paid-input');
    const saleDueAmount = document.getElementById('sale-due-amount');

    if (isWalkIn) {
        if (dueWalkinWarn) dueWalkinWarn.style.display = 'block';
        if (dueDetails) dueDetails.style.display = 'none';
    } else {
        if (dueWalkinWarn) dueWalkinWarn.style.display = 'none';
        if (dueDetails) dueDetails.style.display = 'flex';

        const customer = Storage.getCustomer(customerId);
        if (customer) {
            const oldDue = parseFloat(customer.currentDue) || 0;
            const partialPaid = parseFloat(duePartialInput?.value) || 0;
            const newDueFromSale = Math.max(0, netTotal - partialPaid);
            const totalNewDue = oldDue + newDueFromSale;

            if (dueCustName) dueCustName.textContent = customer.name;
            if (dueOldBal) dueOldBal.textContent = Utils.formatCurrency(oldDue);
            if (dueNewSale) dueNewSale.textContent = Utils.formatCurrency(netTotal);
            if (saleDueAmount) saleDueAmount.textContent = Utils.formatCurrency(totalNewDue);

            // Set default Due Date if empty
            const dueDateInput = document.getElementById('due-target-date');
            const dueDaysNotice = document.getElementById('due-days-notice');
            if (dueDateInput && !dueDateInput.value) {
                const settings = Storage.getSettings();
                const dueDays = settings.defaultDueDays || 7;
                const targetD = new Date();
                targetD.setDate(targetD.getDate() + dueDays);
                dueDateInput.value = targetD.toISOString().split('T')[0];
                if (dueDaysNotice) dueDaysNotice.textContent = `Due in ${dueDays} days`;
            }
        }
    }
}

function updatePaymentModeView() {
    const panels = {
        'Cash': document.getElementById('panel-pay-cash'),
        'UPI': document.getElementById('panel-pay-upi'),
        'Card': document.getElementById('panel-pay-card'),
        'Credit/Due': document.getElementById('panel-pay-due')
    };

    Object.keys(panels).forEach(mode => {
        if (panels[mode]) {
            panels[mode].style.display = mode === selectedPaymentMethod ? 'block' : 'none';
        }
    });

    const netTotal = getNetTotal();

    // If Cash, generate quick suggestion buttons
    if (selectedPaymentMethod === 'Cash') {
        const cashTagsContainer = document.getElementById('quick-cash-tags');
        const paidInput = document.getElementById('sale-amount-paid');

        if (cashTagsContainer) {
            const exact = Math.ceil(netTotal);
            const round50 = Math.ceil(netTotal / 50) * 50;
            const round100 = Math.ceil(netTotal / 100) * 100;
            const round500 = Math.ceil(netTotal / 500) * 500;

            const suggestions = new Set([exact]);
            if (round50 > exact) suggestions.add(round50);
            if (round100 > exact) suggestions.add(round100);
            if (round500 > exact) suggestions.add(round500);

            cashTagsContainer.innerHTML = Array.from(suggestions).map(val => `
                <button type="button" class="btn btn-outline btn-sm btn-cash-tag" data-val="${val}" style="height: 32px; font-weight: 700; font-size: 0.8rem; border-radius: var(--radius-sm); padding: 2px 10px;">
                    ₹${val}
                </button>
            `).join('');

            cashTagsContainer.querySelectorAll('.btn-cash-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    const tagVal = parseFloat(tag.dataset.val);
                    if (paidInput) {
                        paidInput.value = tagVal;
                        recalculatePricing();
                    }
                });
            });
        }
    }

    recalculatePricing();
}

// Step Navigation Bindings
function setupStepNavigation() {
    // Go back to sales hub (Step 1 -> Step 0)
    const backToHubBtn = document.getElementById('btn-back-to-step0');
    if (backToHubBtn) {
        backToHubBtn.addEventListener('click', () => {
            resetPOS();
        });
    }

    // Go to cart review (Step 1 -> Step 2)
    const btnGoToCheckout = document.getElementById('btn-go-to-checkout');
    if (btnGoToCheckout) {
        btnGoToCheckout.addEventListener('click', () => {
            if (cart.length === 0) {
                Utils.showToast("Cannot checkout an empty cart", "error");
                return;
            }
            changeStep(2);
        });
    }

    // Go back to catalog (Step 2 -> Step 1)
    const btnBackToStep1 = document.getElementById('btn-back-to-step1');
    if (btnBackToStep1) {
        btnBackToStep1.addEventListener('click', () => {
            changeStep(1);
        });
    }

    // Go to payment (Step 2 -> Step 3)
    const btnGoToPayment = document.getElementById('btn-go-to-payment');
    if (btnGoToPayment) {
        btnGoToPayment.addEventListener('click', () => {
            if (cart.length === 0) {
                Utils.showToast("Cannot checkout an empty cart", "error");
                return;
            }

            // Populate Step 3 Customer line
            const customerSelect = document.getElementById('sale-customer-select');
            const custId = customerSelect ? customerSelect.value : 'walk-in';
            const custSummaryLine = document.getElementById('pay-customer-summary-line');
            if (custSummaryLine) {
                if (custId === 'walk-in') {
                    custSummaryLine.textContent = 'Customer: Walk-in Customer';
                } else {
                    const cust = Storage.getCustomer(custId);
                    custSummaryLine.textContent = cust ? `Customer: ${cust.name} (${cust.phone})` : 'Customer: Walk-in Customer';
                }
            }

            // Default Cash input to exact net total
            const paidInput = document.getElementById('sale-amount-paid');
            if (paidInput && (!paidInput.value || parseFloat(paidInput.value) <= 0)) {
                paidInput.value = getNetTotal();
            }

            updatePaymentModeView();
            changeStep(3);
        });
    }

    // Go back to cart (Step 3 -> Step 2)
    const btnBackToStep2 = document.getElementById('btn-back-to-step2');
    if (btnBackToStep2) {
        btnBackToStep2.addEventListener('click', () => {
            changeStep(2);
        });
    }

    // Start fresh sale from Success Screen (Step 4 -> Step 1)
    const btnFreshSale = document.getElementById('btn-start-fresh-sale');
    if (btnFreshSale) {
        btnFreshSale.addEventListener('click', () => {
            resetPOS();
            changeStep(1);
        });
    }

    // Pick customer trigger from Due warning inside payment screen
    const btnDuePickCust = document.getElementById('btn-due-pick-customer');
    if (btnDuePickCust) {
        btnDuePickCust.addEventListener('click', () => {
            changeStep(2);
            const searchInput = document.getElementById('customer-search-input');
            const changeBtn = document.getElementById('btn-change-customer-trigger');
            if (changeBtn) changeBtn.click();
            if (searchInput) searchInput.focus();
        });
    }
}

function changeStep(stepNum) {
    document.querySelectorAll('.pos-step').forEach(step => {
        step.classList.remove('active');
    });
    const stepEl = document.getElementById(`pos-step-${stepNum}`);
    if (stepEl) {
        stepEl.classList.add('active');
    }
    currentStep = stepNum;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}
window.changeStep = changeStep;

function setupSalesEventListeners() {
    const lookupInput = document.getElementById('sale-product-lookup');
    const clearBtn = document.getElementById('sale-search-clear');
    const discountInput = document.getElementById('sale-discount');
    const paidInput = document.getElementById('sale-amount-paid');
    const duePartialInput = document.getElementById('due-partial-paid-input');
    const checkoutBtn = document.getElementById('btn-complete-sale');
    const customerSelect = document.getElementById('sale-customer-select');

    // Instant product lookup
    if (lookupInput) {
        lookupInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
            renderPOSCatalog(query);
        });

        // Enter key for barcode scanner
        lookupInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const raw = lookupInput.value.trim();
                if (!raw) return;
                const product = Storage.getProductByBarcode(raw);
                if (product) {
                    addToCart(product);
                    lookupInput.value = '';
                    if (clearBtn) clearBtn.style.display = 'none';
                    renderPOSCatalog();
                } else {
                    Utils.showToast(`No product found matching "${raw}"`, "warning");
                }
            }
        });
    }

    if (clearBtn && lookupInput) {
        clearBtn.addEventListener('click', () => {
            lookupInput.value = '';
            clearBtn.style.display = 'none';
            renderPOSCatalog();
        });
    }

    // Barcode Scanner button click
    const scanBtn = document.getElementById('btn-scan-barcode-sale');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            if (typeof BarcodeScanner !== 'undefined') {
                BarcodeScanner.open((code, product) => {
                    if (product) {
                        addToCart(product);
                    }
                }, 'pos');
            }
        });
    }

    // Customer selector change
    if (customerSelect) {
        customerSelect.addEventListener('change', () => {
            recalculatePricing();
            updatePaymentModeView();
        });
    }

    // Payment Grid Selection
    const paymentCards = document.querySelectorAll('#pos-payment-mode-grid .payment-card');
    paymentCards.forEach(card => {
        card.addEventListener('click', () => {
            paymentCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            selectedPaymentMethod = card.dataset.mode || 'Cash';
            const methodSelect = document.getElementById('sale-payment-method');
            if (methodSelect) methodSelect.value = selectedPaymentMethod;

            updatePaymentModeView();
        });
    });

    // Discount input listener
    if (discountInput) {
        discountInput.addEventListener('input', () => {
            recalculatePricing();
        });
    }

    // Cash Amount Received input listener
    if (paidInput) {
        paidInput.addEventListener('input', () => {
            recalculatePricing();
        });
    }

    // Due Partial Paid input listener
    if (duePartialInput) {
        duePartialInput.addEventListener('input', () => {
            recalculatePricing();
        });
    }

    // Due Date input listener
    const dueDateInput = document.getElementById('due-target-date');
    if (dueDateInput) {
        dueDateInput.addEventListener('change', () => {
            const dueDaysNotice = document.getElementById('due-days-notice');
            if (dueDaysNotice && dueDateInput.value) {
                const targetDate = new Date(dueDateInput.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                targetDate.setHours(0, 0, 0, 0);
                const diffTime = targetDate - today;
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 0) {
                    dueDaysNotice.textContent = 'Due Today';
                } else if (diffDays === 1) {
                    dueDaysNotice.textContent = 'Due Tomorrow';
                } else if (diffDays > 1) {
                    dueDaysNotice.textContent = `Due in ${diffDays} days`;
                } else {
                    dueDaysNotice.textContent = `Due ${Math.abs(diffDays)} days ago`;
                }
            }
        });
    }

    // Checkout Submit
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleSaleCheckout);
    }
}

// ==========================================
// SALE CONFIRMATION & BILL GENERATION
// ==========================================

function handleSaleCheckout() {
    if (isProcessingSale) return; // Double-submission protection

    const customerSelect = document.getElementById('sale-customer-select');
    const customerId = customerSelect ? customerSelect.value : 'walk-in';
    const isWalkIn = customerId === 'walk-in';

    // 1. Validate Cart
    if (cart.length === 0) {
        Utils.showToast("Cannot checkout an empty cart.", "error");
        return;
    }

    // 2. Validate Stock Availability
    let stockValid = true;
    for (const item of cart) {
        const prod = Storage.getProduct(item.productId);
        if (!prod || item.quantity > prod.currentQuantity) {
            Utils.showToast(`Insufficient stock: Only ${prod ? prod.currentQuantity : 0} left of "${item.name}".`, "error");
            stockValid = false;
            break;
        }
    }
    if (!stockValid) return;

    const subtotal = getSubtotal();
    const discount = getDiscount();
    const tax = getTax();
    const grandTotal = getNetTotal();

    let amountPaid = 0;
    let amountDue = 0;
    let change = 0;

    // 3. Payment Method Specific Validations
    if (selectedPaymentMethod === 'Cash') {
        const paidInput = document.getElementById('sale-amount-paid');
        const received = parseFloat(paidInput?.value) || 0;

        if (received < grandTotal) {
            if (isWalkIn) {
                Utils.showToast(`Amount received (${Utils.formatCurrency(received)}) is less than total payable (${Utils.formatCurrency(grandTotal)}). Walk-in customers cannot have remaining due.`, "error");
                return;
            } else {
                // Customer is registered: record remaining as due
                amountPaid = received;
                amountDue = grandTotal - received;
                change = 0;
            }
        } else {
            amountPaid = grandTotal;
            amountDue = 0;
            change = received - grandTotal;
        }
    } else if (selectedPaymentMethod === 'UPI' || selectedPaymentMethod === 'Card') {
        amountPaid = grandTotal;
        amountDue = 0;
        change = 0;
    } else if (selectedPaymentMethod === 'Credit/Due') {
        if (isWalkIn) {
            Utils.showToast("Credit sales require a registered customer account. Please add or select a customer.", "error");
            return;
        }

        const duePartialInput = document.getElementById('due-partial-paid-input');
        const partialPaid = parseFloat(duePartialInput?.value) || 0;

        amountPaid = Math.min(grandTotal, Math.max(0, partialPaid));
        amountDue = Math.max(0, grandTotal - amountPaid);
        change = 0;

        // Verify customer credit limit
        const customer = Storage.getCustomer(customerId);
        if (customer) {
            const newTotalDue = (customer.currentDue || 0) + amountDue;
            if (customer.creditLimit && newTotalDue > customer.creditLimit) {
                Utils.showToast(`Customer credit limit exceeded! Total due would reach ${Utils.formatCurrency(newTotalDue)} (Limit: ${Utils.formatCurrency(customer.creditLimit)}).`, "error");
                return;
            }
        }
    }

    // 4. Lock button and start processing
    isProcessingSale = true;
    const checkoutBtn = document.getElementById('btn-complete-sale');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Processing Sale...`;
    }

    const customerObj = !isWalkIn ? Storage.getCustomer(customerId) : null;
    const customerName = customerObj ? customerObj.name : 'Walk-in Customer';
    const customerPhone = customerObj ? customerObj.phone : '';

    const mappedItems = cart.map(item => ({
        productId: item.productId,
        productName: item.name,
        barcode: item.barcode || '',
        sku: item.sku || '',
        quantity: item.quantity,
        unit: item.unit,
        rate: item.sellingRate,
        total: item.sellingRate * item.quantity
    }));

    const dueDateInput = document.getElementById('due-target-date');
    const dueDateVal = (amountDue > 0 && dueDateInput && dueDateInput.value) ? dueDateInput.value : null;

    const saleRecord = {
        customerId: customerId,
        customerName: customerName,
        customerPhone: customerPhone,
        date: new Date().toISOString(),
        dueDate: dueDateVal,
        items: mappedItems,
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        grandTotal: grandTotal,
        paymentMethod: selectedPaymentMethod,
        amountPaid: amountPaid,
        amountDue: amountDue,
        change: change
    };

    // Save finalized sale object
    try {
        const savedSale = Storage.saveSale(saleRecord);
        if (typeof NotificationService !== 'undefined') {
            NotificationService.onSaleCompleted(savedSale);
        } else {
            Storage.runStockCheckAndNotify();
        }
        lastCompletedSale = savedSale;

        // Render Step 4 Success Screen
        renderSaleSuccessScreen(savedSale);

        Utils.showToast(`Sale confirmed! Invoice #${savedSale.invoiceNumber} generated.`, "success");
        changeStep(4);
    } catch (err) {
        console.error("Sale checkout failure:", err);
        Utils.showToast("Failed to finalize transaction. Please try again.", "error");
    } finally {
        isProcessingSale = false;
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = `<i data-lucide="check"></i> Complete Sale`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

function renderSaleSuccessScreen(sale) {
    if (!sale) return;

    const invBadge = document.getElementById('success-invoice-badge');
    const totalVal = document.getElementById('success-total-value');
    const custEl = document.getElementById('success-customer');
    const methodEl = document.getElementById('success-method');
    const paidEl = document.getElementById('success-paid');
    const dueRow = document.getElementById('success-due-row');
    const dueEl = document.getElementById('success-due');

    const grandTotal = parseFloat(sale.grandTotal !== undefined ? sale.grandTotal : sale.total) || 0;
    const paid = parseFloat(sale.amountPaid !== undefined ? sale.amountPaid : sale.paymentAmount) || 0;
    const due = parseFloat(sale.amountDue !== undefined ? sale.amountDue : sale.dueAmount) || 0;

    if (invBadge) invBadge.textContent = sale.invoiceNumber || 'INV-000000';
    if (totalVal) totalVal.textContent = Utils.formatCurrency(grandTotal);
    if (custEl) custEl.textContent = sale.customerName || 'Walk-in Customer';
    if (methodEl) methodEl.textContent = sale.paymentMethod || 'Cash';
    if (paidEl) paidEl.textContent = Utils.formatCurrency(paid);

    if (dueRow && dueEl) {
        if (due > 0.001) {
            dueRow.style.display = 'flex';
            dueEl.textContent = Utils.formatCurrency(due);
        } else {
            dueRow.style.display = 'none';
        }
    }

    // Bind action buttons
    const viewBillBtn = document.getElementById('btn-success-view-bill');
    const printBtn = document.getElementById('btn-success-print');
    const pdfBtn = document.getElementById('btn-success-pdf');
    const shareBtn = document.getElementById('btn-success-share');

    if (viewBillBtn) {
        const newBtn = viewBillBtn.cloneNode(true);
        viewBillBtn.parentNode.replaceChild(newBtn, viewBillBtn);
        newBtn.addEventListener('click', () => {
            Utils.showBillModal(sale);
        });
    }

    if (printBtn) {
        const newBtn = printBtn.cloneNode(true);
        printBtn.parentNode.replaceChild(newBtn, printBtn);
        newBtn.addEventListener('click', () => {
            Utils.printBill(sale);
        });
    }

    if (pdfBtn) {
        const newBtn = pdfBtn.cloneNode(true);
        pdfBtn.parentNode.replaceChild(newBtn, pdfBtn);
        newBtn.addEventListener('click', () => {
            Utils.downloadBillPDF(sale);
        });
    }

    if (shareBtn) {
        const newBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newBtn, shareBtn);
        newBtn.addEventListener('click', () => {
            Utils.shareBill(sale);
        });
    }
}

function resetPOS() {
    cart = [];
    lastCompletedSale = null;

    const lookupInput = document.getElementById('sale-product-lookup');
    const discountInput = document.getElementById('sale-discount');
    const paidInput = document.getElementById('sale-amount-paid');
    const duePartialInput = document.getElementById('due-partial-paid-input');
    const methodSelect = document.getElementById('sale-payment-method');

    if (lookupInput) lookupInput.value = '';
    if (discountInput) discountInput.value = 0;
    if (paidInput) paidInput.value = '';
    if (duePartialInput) duePartialInput.value = 0;

    selectedPaymentMethod = 'Cash';
    if (methodSelect) methodSelect.value = 'Cash';

    const paymentCards = document.querySelectorAll('#pos-payment-mode-grid .payment-card');
    paymentCards.forEach(c => {
        if (c.dataset.mode === 'Cash') c.classList.add('active');
        else c.classList.remove('active');
    });

    selectCustomer('walk-in');
    updateCartUI();
    renderPOSCatalog();
    renderSalesHubDashboard();

    changeStep(0);
}

// ==========================================
// SEARCHABLE CUSTOMER SELECTION UX
// ==========================================

function getInitials(name) {
    if (!name) return 'WC';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'WC';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalizeIndianPhone(phone) {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    const match = cleaned.match(/([6-9]\d{9})$/);
    if (match) {
        const digits = match[1];
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return phone.trim();
}

function validateIndianPhone(phone) {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    const indianRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    return indianRegex.test(cleaned);
}

function selectCustomer(customerId) {
    const select = document.getElementById('sale-customer-select');
    if (!select) return;

    select.value = customerId;
    select.dispatchEvent(new Event('change'));

    const searchState = document.getElementById('search-customer-state');
    const selectedState = document.getElementById('selected-customer-state');

    const avatarEl = document.getElementById('selected-cust-avatar-text');
    const nameEl = document.getElementById('selected-cust-name-text');
    const phoneEl = document.getElementById('selected-cust-phone-text');
    const dueEl = document.getElementById('selected-cust-due-text');

    if (customerId === 'walk-in') {
        if (avatarEl) avatarEl.textContent = 'WC';
        if (nameEl) nameEl.textContent = 'Walk-in Customer';
        if (phoneEl) phoneEl.textContent = 'Walk-in / Cash Customer';
        if (dueEl) {
            dueEl.style.display = 'none';
            dueEl.textContent = '';
        }
    } else {
        const customer = Storage.getCustomer(customerId);
        if (customer) {
            if (avatarEl) avatarEl.textContent = getInitials(customer.name);
            if (nameEl) nameEl.textContent = customer.name;
            if (phoneEl) phoneEl.textContent = customer.phone;
            if (dueEl) {
                dueEl.style.display = 'block';
                if (customer.currentDue > 0) {
                    dueEl.textContent = `${Utils.formatCurrency(customer.currentDue)} current due`;
                    dueEl.style.color = 'var(--danger)';
                } else {
                    dueEl.textContent = 'No Due';
                    dueEl.style.color = 'var(--text-muted)';
                }
            }
        }
    }

    if (searchState) searchState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'block';
    
    // Hide suggestions
    const suggestionsPanel = document.getElementById('search-suggestions-dropdown');
    if (suggestionsPanel) suggestionsPanel.style.display = 'none';
    
    const searchInput = document.getElementById('customer-search-input');
    if (searchInput) searchInput.value = '';

    recalculatePricing();
}

function renderCustomerSuggestions(query = '') {
    const dropdown = document.getElementById('search-suggestions-dropdown');
    if (!dropdown) return;

    const customers = Storage.getCustomers();
    const cleanQuery = query.toLowerCase().trim();

    let filtered = customers;
    if (cleanQuery) {
        filtered = customers.filter(c => 
            c.name.toLowerCase().includes(cleanQuery) || 
            c.phone.replace(/[\s\-()]/g, '').includes(cleanQuery.replace(/[\s\-()]/g, ''))
        );
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));
    dropdown.innerHTML = '';

    // 1. Walk-in option
    const walkInHeader = document.createElement('div');
    walkInHeader.className = 'suggestion-section-header';
    walkInHeader.textContent = 'WALK-IN CUSTOMER';
    dropdown.appendChild(walkInHeader);

    const walkInItem = document.createElement('div');
    walkInItem.className = 'search-suggestion-item walk-in-option';
    walkInItem.dataset.id = 'walk-in';
    walkInItem.innerHTML = `
        <div class="suggestion-top-row">
            <div class="suggestion-left">
                <div class="suggestion-avatar walk-in-avatar">WC</div>
                <span class="suggestion-name">Walk-in / Cash Customer</span>
            </div>
        </div>
    `;
    dropdown.appendChild(walkInItem);

    // 2. Customer list section
    if (filtered.length > 0) {
        const listHeader = document.createElement('div');
        listHeader.className = 'suggestion-section-header';
        listHeader.textContent = 'Registered Customers';
        dropdown.appendChild(listHeader);

        filtered.forEach(c => {
            const hasDue = c.currentDue > 0;
            const initials = getInitials(c.name);
            const dueText = hasDue ? `${Utils.formatCurrency(c.currentDue)} Due` : 'No Due';
            const dueClass = hasDue ? 'due' : 'no-due';

            const item = document.createElement('div');
            item.className = 'search-suggestion-item';
            item.dataset.id = c.id;
            item.innerHTML = `
                <div class="suggestion-top-row">
                    <div class="suggestion-left">
                        <div class="suggestion-avatar">${initials}</div>
                        <span class="suggestion-name">${c.name}</span>
                    </div>
                    <span class="suggestion-phone">${c.phone}</span>
                </div>
                <div class="suggestion-bottom-row">
                    <span class="suggestion-due-status ${dueClass}">${dueText}</span>
                </div>
            `;
            dropdown.appendChild(item);
        });
    } else if (cleanQuery) {
        const noResults = document.createElement('div');
        noResults.className = 'suggestion-no-results';
        
        const isPhone = /^\+?[0-9\s\-]{3,}$/.test(cleanQuery);
        let buttonText = isPhone ? `+ Add New Customer` : `+ Add "${query}"`;

        noResults.innerHTML = `
            <div class="no-results-text">No customer found</div>
            <button type="button" class="btn-add-suggested" id="btn-add-suggested-action">
                <i data-lucide="plus"></i> ${buttonText}
            </button>
        `;
        dropdown.appendChild(noResults);

        noResults.querySelector('#btn-add-suggested-action').addEventListener('click', () => {
            openQuickCustomerModal(query);
            dropdown.style.display = 'none';
        });
    }

    // Bind click events on all items
    dropdown.querySelectorAll('.search-suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const custId = item.dataset.id;
            selectCustomer(custId);
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
    dropdown.style.display = 'flex';
}

function openQuickCustomerModal(prefillVal = '') {
    const modal = document.getElementById('modal-quick-customer');
    if (!modal) return;

    const formContainer = document.getElementById('quick-customer-form-container');
    const duplicateContainer = document.getElementById('quick-customer-duplicate-container');

    if (formContainer) formContainer.style.display = 'flex';
    if (duplicateContainer) duplicateContainer.style.display = 'none';

    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    const notesInput = document.getElementById('cust-notes');

    if (nameInput) {
        nameInput.value = '';
        nameInput.classList.remove('is-invalid');
    }
    if (phoneInput) {
        phoneInput.value = '';
        phoneInput.classList.remove('is-invalid');
    }
    if (notesInput) notesInput.value = '';

    if (prefillVal) {
        const containsDigits = /\d/.test(prefillVal);
        if (containsDigits && phoneInput) {
            phoneInput.value = prefillVal;
        } else if (nameInput) {
            nameInput.value = prefillVal;
        }
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeQuickCustomerModal() {
    const modal = document.getElementById('modal-quick-customer');
    if (!modal) return;
    modal.classList.remove('active');
    const activeModals = document.querySelectorAll('.modal-overlay.active');
    if (activeModals.length === 0) {
        document.body.style.overflow = '';
    }
}

function handleQuickCustomerSubmit(e) {
    e.preventDefault();

    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    const notesInput = document.getElementById('cust-notes');

    let isValid = true;

    if (!nameInput || !nameInput.value.trim()) {
        if (nameInput) nameInput.classList.add('is-invalid');
        isValid = false;
    } else {
        nameInput.classList.remove('is-invalid');
    }

    const phoneVal = phoneInput ? phoneInput.value.trim() : '';
    if (!validateIndianPhone(phoneVal)) {
        if (phoneInput) phoneInput.classList.add('is-invalid');
        isValid = false;
    } else {
        if (phoneInput) phoneInput.classList.remove('is-invalid');
    }

    if (!isValid) return;

    const normalizedPhone = normalizeIndianPhone(phoneVal);

    // Duplicate check
    const customers = Storage.getCustomers();
    const existing = customers.find(c => c.phone.replace(/[\s\-()]/g, '') === normalizedPhone.replace(/[\s\-()]/g, ''));

    if (existing) {
        const formContainer = document.getElementById('quick-customer-form-container');
        const duplicateContainer = document.getElementById('quick-customer-duplicate-container');
        
        document.getElementById('duplicate-cust-name').textContent = existing.name;
        document.getElementById('duplicate-cust-phone').textContent = existing.phone;

        if (formContainer) formContainer.style.display = 'none';
        if (duplicateContainer) duplicateContainer.style.display = 'flex';

        const selectBtn = document.getElementById('btn-duplicate-select');
        const newSelectBtn = selectBtn.cloneNode(true);
        selectBtn.parentNode.replaceChild(newSelectBtn, selectBtn);

        newSelectBtn.addEventListener('click', () => {
            selectCustomer(existing.id);
            closeQuickCustomerModal();
        });

        const backBtn = document.getElementById('btn-duplicate-back');
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        newBackBtn.addEventListener('click', () => {
            if (formContainer) formContainer.style.display = 'flex';
            if (duplicateContainer) duplicateContainer.style.display = 'none';
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // Save new customer
    const newCustomer = {
        name: nameInput.value.trim(),
        phone: normalizedPhone,
        notes: notesInput ? notesInput.value.trim() : '',
        openingDue: 0,
        currentDue: 0,
        creditLimit: 10000,
        address: ''
    };

    const saved = Storage.saveCustomer(newCustomer);
    if (saved) {
        populateCustomersDropdown();
        selectCustomer(saved.id);
        closeQuickCustomerModal();
        Utils.showToast(`Customer "${saved.name}" added and linked to sale.`, "success");
    } else {
        Utils.showToast("Failed to save customer", "error");
    }
}

function setupCustomerSearchEvents() {
    const searchInput = document.getElementById('customer-search-input');
    const dropdown = document.getElementById('search-suggestions-dropdown');

    if (!searchInput || !dropdown) return;

    searchInput.addEventListener('focus', () => {
        renderCustomerSuggestions(searchInput.value);
    });

    searchInput.addEventListener('input', (e) => {
        renderCustomerSuggestions(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        const openBtn = document.getElementById('btn-add-customer-open');
        if (e.target !== searchInput && !dropdown.contains(e.target) && (!openBtn || (e.target !== openBtn && !openBtn.contains(e.target)))) {
            dropdown.style.display = 'none';
        }
    });

    const openBtn = document.getElementById('btn-add-customer-open');
    if (openBtn) {
        openBtn.addEventListener('click', () => openQuickCustomerModal());
    }

    const closeBtn = document.getElementById('modal-cust-close');
    if (closeBtn) closeBtn.addEventListener('click', closeQuickCustomerModal);

    const cancelBtn = document.getElementById('btn-cust-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeQuickCustomerModal);

    const form = document.getElementById('form-quick-customer');
    if (form) {
        form.addEventListener('submit', handleQuickCustomerSubmit);
    }

    const changeBtn = document.getElementById('btn-change-customer-trigger');
    if (changeBtn) {
        changeBtn.addEventListener('click', () => {
            const selectedState = document.getElementById('selected-customer-state');
            const searchState = document.getElementById('search-customer-state');
            if (selectedState) selectedState.style.display = 'none';
            if (searchState) searchState.style.display = 'block';
            searchInput.focus();
            renderCustomerSuggestions(searchInput.value);
        });
    }
}
