/**
 * Stock & Inventory Management Logic - stock.js (Settings UX Pattern Redesign)
 */

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    if (page === 'stock') {
        initStockPage();
    } else if (page === 'product-details') {
        initProductDetailsPage();
    }
});

// ==========================================================================
// STOCK / INVENTORY PAGE LOGIC
// ==========================================================================
let currentStockFilter = 'all'; // 'all', 'low_stock', 'out_of_stock'
let currentStockSort = 'recommended';
let productSearchKeyword = '';
let selectedCategory = '';

function initStockPage() {
    // Check URL parameters for initial filters (e.g. from dashboard or alerts)
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter');
    
    if (filterParam) {
        currentStockFilter = filterParam;
    }

    // 1. Overview Row Click Handlers
    setupOverviewFilterRows();

    // 2. Stock Management Row Click Handlers
    setupStockManagementRows();

    // 3. Header Action Buttons
    const addStockHeaderBtn = document.getElementById('btn-add-stock-header');
    if (addStockHeaderBtn) {
        addStockHeaderBtn.addEventListener('click', () => openAddStockModal());
    }

    const addProductHeaderBtn = document.getElementById('btn-add-product-header');
    if (addProductHeaderBtn) {
        addProductHeaderBtn.addEventListener('click', () => openAddProductModal());
    }

    // 4. Search and Clear
    const searchInput = document.getElementById('product-search');
    const clearBtn = document.getElementById('prod-search-clear');
    const scanSearchBtn = document.getElementById('btn-scan-search-barcode');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            productSearchKeyword = e.target.value.toLowerCase().trim();
            if (clearBtn) {
                clearBtn.style.display = productSearchKeyword ? 'flex' : 'none';
            }
            renderProductsList();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            productSearchKeyword = '';
            clearBtn.style.display = 'none';
            renderProductsList();
        });
    }

    if (scanSearchBtn) {
        scanSearchBtn.addEventListener('click', () => {
            if (typeof BarcodeScanner !== 'undefined') {
                BarcodeScanner.open((code) => {
                    if (searchInput) {
                        searchInput.value = code;
                        productSearchKeyword = code.toLowerCase().trim();
                        if (clearBtn) clearBtn.style.display = 'flex';
                        renderProductsList();
                        if (typeof Utils !== 'undefined') Utils.showToast(`Searched barcode: ${code}`, "info");
                    }
                }, 'lookup');
            }
        });
    }

    // 5. Category & Sort Filter Dropdowns
    const catSelect = document.getElementById('category-filter');
    if (catSelect) {
        catSelect.addEventListener('change', (e) => {
            selectedCategory = e.target.value;
            renderProductsList();
        });
    }

    const sortSelect = document.getElementById('stock-sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentStockSort = e.target.value;
            renderProductsList();
        });
    }

    // Clear Active Filter Strip
    const filterStripClear = document.getElementById('filter-strip-clear');
    if (filterStripClear) {
        filterStripClear.addEventListener('click', () => {
            setStockFilter('all');
        });
    }

    // 6. Setup Modal Listeners
    setupAddStockModalListeners();
    setupAddProductModalListeners();
    setupStockAdjustmentModalListeners();
    setupStockHistoryModalListeners();

    // Populate category options
    populateCategoryDropdowns();
    setupCategoryCustomInputListener();

    // Initial render
    renderProductsList();

    // Handle auto-open URL params
    const prefillBarcode = params.get('barcode') || '';
    if (params.get('openAddStock') === 'true') {
        openAddStockModal();
    } else if (params.get('openAddProduct') === 'true' || params.get('openAdd') === 'true') {
        openAddProductModal(null, prefillBarcode);
    } else if (params.get('restockProdId')) {
        openAddStockModal(params.get('restockProdId'));
    }
}

// --------------------------------------------------------------------------
// Overview Rows & Filters
// --------------------------------------------------------------------------
function setupOverviewFilterRows() {
    const overviewRows = document.querySelectorAll('.stock-overview-row');
    overviewRows.forEach(row => {
        row.addEventListener('click', () => {
            const filter = row.dataset.filter || 'all';
            setStockFilter(filter);
        });

        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const filter = row.dataset.filter || 'all';
                setStockFilter(filter);
            }
        });
    });
}

function setStockFilter(filter) {
    currentStockFilter = filter;
    
    // Update active highlight on overview rows
    const rows = document.querySelectorAll('.stock-overview-row');
    rows.forEach(r => {
        if (r.dataset.filter === filter) {
            r.classList.add('active');
        } else {
            r.classList.remove('active');
        }
    });

    renderProductsList();
}

function updateOverviewCounts(products) {
    const totalCount = products.length;
    const lowCount = products.filter(p => {
        const q = parseFloat(p.currentQuantity) || 0;
        const m = parseFloat(p.minimumStockLevel) || 0;
        return q <= m && q > 0;
    }).length;
    const outCount = products.filter(p => (parseFloat(p.currentQuantity) || 0) === 0).length;
    const reorderCount = lowCount + outCount;

    const countAllEl = document.getElementById('overview-count-all');
    const countLowEl = document.getElementById('overview-count-low');
    const countOutEl = document.getElementById('overview-count-out');
    const countReorderEl = document.getElementById('insight-count-reorder');

    if (countAllEl) countAllEl.textContent = totalCount;
    if (countLowEl) countLowEl.textContent = lowCount;
    if (countOutEl) countOutEl.textContent = outCount;
    if (countReorderEl) countReorderEl.textContent = reorderCount;
}

// --------------------------------------------------------------------------
// Stock Management Row Click Handlers
// --------------------------------------------------------------------------
function setupStockManagementRows() {
    const addRow = document.getElementById('row-stock-mgmt-add');
    if (addRow) {
        addRow.addEventListener('click', () => openAddStockModal());
        addRow.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openAddStockModal();
            }
        });
    }

    const adjustRow = document.getElementById('row-stock-mgmt-adjust');
    if (adjustRow) {
        adjustRow.addEventListener('click', () => openStockAdjustmentModal());
        adjustRow.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openStockAdjustmentModal();
            }
        });
    }

    const historyRow = document.getElementById('row-stock-mgmt-history');
    if (historyRow) {
        historyRow.addEventListener('click', () => openStockHistoryModal());
        historyRow.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openStockHistoryModal();
            }
        });
    }
}

// --------------------------------------------------------------------------
// Products List Rendering
// --------------------------------------------------------------------------
function renderProductsList() {
    const listContainer = document.getElementById('products-grouped-list');
    if (!listContainer) return;

    const allProducts = Storage.getProducts();

    // Update Overview numbers
    updateOverviewCounts(allProducts);

    // Update Filter Active Strip
    const strip = document.getElementById('stock-active-filter-strip');
    const stripLabel = document.getElementById('filter-strip-label');
    if (strip && stripLabel) {
        if (currentStockFilter === 'low_stock') {
            stripLabel.textContent = 'Showing: Low Stock Products';
            strip.style.display = 'flex';
        } else if (currentStockFilter === 'out_of_stock') {
            stripLabel.textContent = 'Showing: Out of Stock Products';
            strip.style.display = 'flex';
        } else if (selectedCategory) {
            stripLabel.textContent = `Showing Category: ${selectedCategory}`;
            strip.style.display = 'flex';
        } else {
            strip.style.display = 'none';
        }
    }

    let products = [...allProducts];

    // Apply Search Filter
    if (productSearchKeyword) {
        products = products.filter(p => 
            p.productName.toLowerCase().includes(productSearchKeyword) || 
            (p.sku && p.sku.toLowerCase().includes(productSearchKeyword)) || 
            (p.barcode && p.barcode.includes(productSearchKeyword))
        );
    }

    // Apply Category Filter
    if (selectedCategory) {
        products = products.filter(p => p.category === selectedCategory);
    }

    // Apply Overview Filter
    if (currentStockFilter === 'low_stock') {
        products = products.filter(p => {
            const q = parseFloat(p.currentQuantity) || 0;
            const m = parseFloat(p.minimumStockLevel) || 0;
            return q <= m && q > 0;
        });
    } else if (currentStockFilter === 'out_of_stock') {
        products = products.filter(p => (parseFloat(p.currentQuantity) || 0) === 0);
    } else if (currentStockFilter === 'reorder_soon' || currentStockFilter === 'risk_7days') {
        products = products.filter(p => {
            const q = parseFloat(p.currentQuantity) || 0;
            const m = parseFloat(p.minimumStockLevel) || 0;
            return q <= m;
        });
    }

    // Update count badge
    const countBadge = document.getElementById('products-count-badge');
    if (countBadge) {
        countBadge.textContent = `${products.length} product${products.length !== 1 ? 's' : ''}`;
    }

    // Apply Sorting
    if (currentStockSort === 'name_asc') {
        products.sort((a, b) => a.productName.localeCompare(b.productName));
    } else if (currentStockSort === 'name_desc') {
        products.sort((a, b) => b.productName.localeCompare(a.productName));
    } else if (currentStockSort === 'stock_low') {
        products.sort((a, b) => (parseFloat(a.currentQuantity) || 0) - (parseFloat(b.currentQuantity) || 0));
    } else if (currentStockSort === 'stock_high') {
        products.sort((a, b) => (parseFloat(b.currentQuantity) || 0) - (parseFloat(a.currentQuantity) || 0));
    } else if (currentStockSort === 'recent') {
        products.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else {
        // Recommended sort: Out of stock first, then low stock, then alphabetical
        products.sort((a, b) => {
            const aQty = parseFloat(a.currentQuantity) || 0;
            const bQty = parseFloat(b.currentQuantity) || 0;
            const aMin = parseFloat(a.minimumStockLevel) || 0;
            const bMin = parseFloat(b.minimumStockLevel) || 0;

            const aOut = aQty === 0;
            const bOut = bQty === 0;
            if (aOut && !bOut) return -1;
            if (!aOut && bOut) return 1;

            const aLow = aQty <= aMin && aQty > 0;
            const bLow = bQty <= bMin && bQty > 0;
            if (aLow && !bLow) return -1;
            if (!aLow && bLow) return 1;

            return a.productName.localeCompare(b.productName);
        });
    }

    // Handle Empty States
    if (products.length === 0) {
        if (allProducts.length === 0) {
            listContainer.innerHTML = `
                <div class="no-results-card">
                    <i data-lucide="package-plus" style="width: 32px; height: 32px; color: var(--accent); margin-bottom: 8px;"></i>
                    <div style="font-weight: 700; color: var(--text); font-size: 15px;">No products in stock</div>
                    <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">Add your first product to start managing inventory.</div>
                    <button type="button" class="stock-btn-primary" id="btn-empty-add-prod" style="margin-top: 14px; height: 40px; padding: 0 16px; font-size: 13px; display: inline-flex;">
                        <i data-lucide="package-plus"></i> + Add Product
                    </button>
                </div>
            `;
            const emptyBtn = document.getElementById('btn-empty-add-prod');
            if (emptyBtn) emptyBtn.addEventListener('click', () => openAddProductModal());
        } else if (productSearchKeyword) {
            listContainer.innerHTML = `
                <div class="no-results-card">
                    <i data-lucide="search-x" style="width: 28px; height: 28px; color: var(--text-muted); margin-bottom: 8px;"></i>
                    <div style="font-weight: 600; color: var(--text);">No matching products</div>
                    <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">No products match "${productSearchKeyword}".</div>
                </div>
            `;
        } else if (currentStockFilter === 'low_stock' || currentStockFilter === 'out_of_stock') {
            const label = currentStockFilter === 'low_stock' ? 'low stock' : 'out of stock';
            listContainer.innerHTML = `
                <div class="no-results-card">
                    <i data-lucide="check-circle" style="width: 28px; height: 28px; color: var(--success); margin-bottom: 8px;"></i>
                    <div style="font-weight: 600; color: var(--text);">No ${label} items</div>
                    <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">All products currently have healthy stock levels.</div>
                </div>
            `;
        } else {
            listContainer.innerHTML = `
                <div class="no-results-card">
                    <i data-lucide="package" style="width: 28px; height: 28px; color: var(--text-muted); margin-bottom: 8px;"></i>
                    <div style="font-weight: 600; color: var(--text);">No products match filter</div>
                </div>
            `;
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // Render Compact Product Rows
    listContainer.innerHTML = products.map(p => {
        const qty = parseFloat(p.currentQuantity) || 0;
        const min = parseFloat(p.minimumStockLevel) || 0;
        const unit = getShortUnit(p.unit, qty);
        const formattedRate = formatCompactRate(p.sellingRate);

        let statusClass = 'row-in-stock';
        let statusHtml = '';
        if (qty === 0) {
            statusClass = 'row-out-of-stock';
            statusHtml = '<span class="stock-status-tag out-of-stock">OUT OF STOCK</span>';
        } else if (qty <= min) {
            statusClass = 'row-low-stock';
            statusHtml = '<span class="stock-status-tag low-stock">LOW STOCK</span>';
        }

        const catIcon = getCategoryIconHtml(p.category);

        return `
            <a href="product-details.html?id=${p.id}" class="product-list-row ${statusClass}" data-id="${p.id}" title="View details for ${p.productName}">
                <div class="product-row-left" style="flex-direction: row; align-items: center; gap: 12px;">
                    ${catIcon}
                    <div class="product-row-info" style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
                        <span class="product-row-title">${p.productName}</span>
                        <span class="product-row-desc">${p.category || 'Groceries'} · ${formattedRate}/${unit}</span>
                    </div>
                </div>
                <div class="product-row-right">
                    <div class="product-row-qty-wrap">
                        <span class="product-row-qty" style="font-family: monospace; font-weight: 800;">${qty} ${unit}</span>
                        ${statusHtml}
                    </div>
                    <div class="settings-row-chevron" style="color: var(--text-muted); opacity: 0.6;"><i data-lucide="chevron-right"></i></div>
                </div>
            </a>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getCategoryIconHtml(cat) {
    if (!cat) return `<div class="product-cat-avatar"><i data-lucide="package"></i></div>`;
    const c = cat.toLowerCase();
    if (c.includes('dairy') || c.includes('milk') || c.includes('cheese') || c.includes('butter')) {
        return `<div class="product-cat-avatar icon-cat-dairy"><i data-lucide="milk"></i></div>`;
    } else if (c.includes('fruit') || c.includes('veg') || c.includes('produce') || c.includes('apple') || c.includes('fresh')) {
        return `<div class="product-cat-avatar icon-cat-produce"><i data-lucide="apple"></i></div>`;
    } else if (c.includes('bake') || c.includes('bread') || c.includes('cake')) {
        return `<div class="product-cat-avatar icon-cat-bakery"><i data-lucide="sandwich"></i></div>`;
    } else if (c.includes('bev') || c.includes('drink') || c.includes('juice') || c.includes('soda') || c.includes('water')) {
        return `<div class="product-cat-avatar icon-cat-beverage"><i data-lucide="cup-soda"></i></div>`;
    } else if (c.includes('snack') || c.includes('biscuit') || c.includes('chip')) {
        return `<div class="product-cat-avatar icon-cat-snack"><i data-lucide="cookie"></i></div>`;
    } else if (c.includes('meat') || c.includes('fish') || c.includes('poultry')) {
        return `<div class="product-cat-avatar icon-cat-meat"><i data-lucide="beef"></i></div>`;
    } else if (c.includes('grain') || c.includes('rice') || c.includes('flour') || c.includes('pulse') || c.includes('oil')) {
        return `<div class="product-cat-avatar icon-cat-grain"><i data-lucide="wheat"></i></div>`;
    }
    return `<div class="product-cat-avatar"><i data-lucide="shopping-bag"></i></div>`;
}

function getShortUnit(unit, qty = 1) {
    if (!unit) return 'pc';
    const u = unit.toLowerCase().trim();
    if (u === 'kilogram' || u === 'kg' || u === 'kgs') return 'kg';
    if (u === 'gram' || u === 'g' || u === 'gms') return 'g';
    if (u === 'liter' || u === 'litre' || u === 'l' || u === 'ltr') return 'L';
    if (u === 'milliliter' || u === 'ml') return 'mL';
    if (u === 'piece' || u === 'pc' || u === 'pcs') return qty === 1 ? 'pc' : 'pcs';
    if (u === 'pack' || u === 'packs' || u === 'packet' || u === 'packets') return 'pack';
    if (u === 'box' || u === 'boxes') return 'box';
    if (u === 'bottle' || u === 'bottles') return 'btl';
    if (u === 'dozen' || u === 'dozens') return 'doz';
    if (u === 'meter' || u === 'meters' || u === 'm') return 'm';
    return unit.length > 6 ? unit.slice(0, 5) : unit;
}

function formatCompactRate(rate) {
    const num = parseFloat(rate);
    if (isNaN(num)) return '₹0';
    if (num % 1 === 0) {
        return `₹${Math.round(num)}`;
    }
    return `₹${num.toFixed(2)}`;
}

// --------------------------------------------------------------------------
// ADD STOCK MODAL LOGIC
// --------------------------------------------------------------------------
function setupAddStockModalListeners() {
    const modal = document.getElementById('modal-add-stock');
    if (!modal) return;

    document.getElementById('modal-add-stock-close')?.addEventListener('click', () => closeModal(modal));
    document.getElementById('btn-add-stock-cancel')?.addEventListener('click', () => closeModal(modal));
    document.getElementById('form-add-stock')?.addEventListener('submit', handleAddStockSubmit);

    // Step 1: Search product suggestions
    const lookupInput = document.getElementById('add-stock-prod-lookup');
    if (lookupInput) {
        lookupInput.addEventListener('input', handleAddStockLookupInput);
    }

    // Step 2: Quantity changes -> update preview
    const qtyInput = document.getElementById('add-stock-qty');
    if (qtyInput) {
        qtyInput.addEventListener('input', updateAddStockPreview);
    }

    // Change product button
    document.getElementById('btn-add-stock-change-product')?.addEventListener('click', () => {
        document.getElementById('add-stock-step-1').style.display = 'flex';
        document.getElementById('add-stock-step-2').style.display = 'none';
        document.getElementById('add-stock-prod-id').value = '';
    });
}

function openAddStockModal(productId = null) {
    const modal = document.getElementById('modal-add-stock');
    if (!modal) return;

    // Reset fields
    const lookupInput = document.getElementById('add-stock-prod-lookup');
    if (lookupInput) lookupInput.value = '';
    
    const qtyInput = document.getElementById('add-stock-qty');
    if (qtyInput) qtyInput.value = '10';

    if (productId) {
        selectProductForAddStock(productId);
    } else {
        document.getElementById('add-stock-step-1').style.display = 'flex';
        document.getElementById('add-stock-step-2').style.display = 'none';
        handleAddStockLookupInput();
    }

    openModal(modal);
}

function handleAddStockLookupInput() {
    const lookupInput = document.getElementById('add-stock-prod-lookup');
    const query = lookupInput ? lookupInput.value.toLowerCase().trim() : '';
    const suggestionsPanel = document.getElementById('add-stock-suggestions');
    if (!suggestionsPanel) return;

    const products = Storage.getProducts();
    let filtered = products;

    if (query) {
        filtered = products.filter(p => 
            p.productName.toLowerCase().includes(query) || 
            (p.sku && p.sku.toLowerCase().includes(query)) || 
            (p.barcode && p.barcode.includes(query))
        );
    } else {
        // Sort out of stock and low stock first
        filtered = [...products].sort((a, b) => {
            const aOut = (parseFloat(a.currentQuantity) || 0) === 0;
            const bOut = (parseFloat(b.currentQuantity) || 0) === 0;
            if (aOut && !bOut) return -1;
            if (!aOut && bOut) return 1;

            const aLow = (parseFloat(a.currentQuantity) || 0) <= (parseFloat(a.minimumStockLevel) || 0);
            const bLow = (parseFloat(b.currentQuantity) || 0) <= (parseFloat(b.minimumStockLevel) || 0);
            if (aLow && !bLow) return -1;
            if (!aLow && bLow) return 1;

            return a.productName.localeCompare(b.productName);
        });
    }

    if (filtered.length === 0) {
        suggestionsPanel.innerHTML = `
            <div class="no-results-card">
                <div style="font-size: 13px; color: var(--text-muted);">No products found matching query.</div>
            </div>
        `;
        suggestionsPanel.style.display = 'block';
        return;
    }

    suggestionsPanel.innerHTML = filtered.map(p => {
        const qty = parseFloat(p.currentQuantity) || 0;
        const unit = getShortUnit(p.unit, qty);
        return `
            <div class="stock-suggestion-row" data-id="${p.id}">
                <div>
                    <strong style="color: var(--text); font-size: 14px;">${p.productName}</strong>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 1px;">Current: ${qty} ${unit} · ${p.category || 'General'}</div>
                </div>
                <button type="button" class="suggestion-select-btn">Select</button>
            </div>
        `;
    }).join('');

    suggestionsPanel.style.display = 'block';

    // Bind item clicks
    suggestionsPanel.querySelectorAll('.stock-suggestion-row').forEach(row => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            selectProductForAddStock(row.dataset.id);
        });
    });
}

function selectProductForAddStock(productId) {
    const product = Storage.getProduct(productId);
    if (!product) return;

    document.getElementById('add-stock-prod-id').value = product.id;
    document.getElementById('add-stock-selected-name').textContent = product.productName;
    document.getElementById('add-stock-selected-current').textContent = product.currentQuantity;
    document.getElementById('add-stock-selected-unit').textContent = product.unit || 'pc';

    const pRateInput = document.getElementById('add-stock-purchase-rate');
    if (pRateInput) pRateInput.value = product.purchaseRate || '';

    const supplierInput = document.getElementById('add-stock-supplier');
    if (supplierInput) supplierInput.value = product.supplier || '';

    updateAddStockPreview();

    // Transition to step 2
    document.getElementById('add-stock-step-1').style.display = 'none';
    document.getElementById('add-stock-step-2').style.display = 'flex';
}

function updateAddStockPreview() {
    const currentQtyEl = document.getElementById('add-stock-selected-current');
    const unitEl = document.getElementById('add-stock-selected-unit');
    const targetPreview = document.getElementById('add-stock-target-preview');
    const qtyInput = document.getElementById('add-stock-qty');

    if (!currentQtyEl || !targetPreview || !qtyInput) return;

    const current = parseFloat(currentQtyEl.textContent) || 0;
    const addQty = parseFloat(qtyInput.value) || 0;
    const unit = unitEl ? unitEl.textContent : 'pc';

    targetPreview.textContent = `${(current + addQty).toFixed(1).replace(/\.0$/, '')} ${unit}`;
}

function handleAddStockSubmit(e) {
    e.preventDefault();
    const prodId = document.getElementById('add-stock-prod-id').value;
    const qtyInput = document.getElementById('add-stock-qty');
    const pRateInput = document.getElementById('add-stock-purchase-rate');
    const supplierInput = document.getElementById('add-stock-supplier');
    const expiryInput = document.getElementById('add-stock-expiry');
    const feedbackEl = document.getElementById('edit-stock-qty-feedback');

    const qtyVal = parseFloat(qtyInput.value);
    const pRateVal = parseFloat(pRateInput.value);

    let isValid = true;
    if (isNaN(qtyVal) || qtyVal <= 0) {
        qtyInput.classList.add('is-invalid');
        if (feedbackEl) feedbackEl.textContent = "Quantity must be greater than zero.";
        isValid = false;
    } else {
        qtyInput.classList.remove('is-invalid');
    }

    if (isNaN(pRateVal) || pRateVal < 0) {
        pRateInput.classList.add('is-invalid');
        isValid = false;
    } else {
        pRateInput.classList.remove('is-invalid');
    }

    if (!isValid) return;

    const product = Storage.getProduct(prodId);
    if (!product) {
        Utils.showToast("Selected product not found", "error");
        return;
    }

    const newQty = (parseFloat(product.currentQuantity) || 0) + qtyVal;
    const supplierVal = supplierInput ? supplierInput.value.trim() : '';
    const expiryVal = expiryInput ? expiryInput.value : '';

    Storage.updateProduct(prodId, {
        currentQuantity: newQty,
        purchaseRate: pRateVal,
        supplier: supplierVal || product.supplier,
        expiryDate: expiryVal || product.expiryDate,
        adjustmentNote: `Added stock (+${qtyVal} ${product.unit})`
    });

    // Check alerts
    Storage.runStockCheckAndNotify();

    Utils.initAppLayout(document.body.dataset.page);
    Utils.showToast(`✓ Added ${qtyVal} ${product.unit} to "${product.productName}"`, "success");

    closeModal(document.getElementById('modal-add-stock'));

    if (document.body.dataset.page === 'product-details') {
        loadProductProfileDetails();
    } else {
        renderProductsList();
    }
}

// --------------------------------------------------------------------------
// ==========================================================================
// ADD / EDIT PRODUCT MODAL & CUSTOM PICKER LOGIC (PREMIUM MOBILE UX)
// ==========================================================================
const UNIT_OPTIONS = [
    { label: 'Piece (pc)', code: 'pc', value: 'Piece' },
    { label: 'Kilogram (kg)', code: 'kg', value: 'Kilogram' },
    { label: 'Gram (g)', code: 'g', value: 'Gram' },
    { label: 'Liter (L)', code: 'L', value: 'Liter' },
    { label: 'Milliliter (mL)', code: 'mL', value: 'Milliliter' },
    { label: 'Pack', code: 'pack', value: 'Pack' },
    { label: 'Box', code: 'box', value: 'Box' },
    { label: 'Bottle (btl)', code: 'btl', value: 'Bottle' },
    { label: 'Dozen (doz)', code: 'doz', value: 'Dozen' },
    { label: 'Meter (m)', code: 'm', value: 'Meter' },
    { label: 'Other', code: 'other', value: 'Other' }
];

let initialProductFormSnapshot = null;
let currentPickerType = null; // 'category' or 'unit'
let pickerOptions = [];
let onPickerSelectCallback = null;

function setupAddProductModalListeners() {
    const modal = document.getElementById('modal-product-edit');
    if (!modal) return;

    // Close button & Cancel button with dirty check
    document.getElementById('modal-prod-edit-close')?.addEventListener('click', () => requestCloseProductModal());
    document.getElementById('btn-prod-edit-cancel')?.addEventListener('click', () => requestCloseProductModal());
    document.getElementById('btn-prod-edit-save')?.addEventListener('click', (e) => handleProductFormSubmit(e));
    document.getElementById('form-product-edit')?.addEventListener('submit', handleProductFormSubmit);

    // Backdrop click on product edit modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            requestCloseProductModal();
        }
    });

    // Custom Picker Triggers
    document.getElementById('btn-select-category')?.addEventListener('click', () => {
        const currentCat = document.getElementById('edit-prod-category')?.value || 'Groceries';
        openCustomPicker('category', currentCat, (selectedVal) => {
            updateSelectedCategory(selectedVal);
        });
    });

    document.getElementById('btn-select-unit')?.addEventListener('click', () => {
        const currentUnit = document.getElementById('edit-prod-unit')?.value || 'Piece';
        openCustomPicker('unit', currentUnit, (selectedVal) => {
            updateSelectedUnit(selectedVal);
        });
    });

    // Custom Picker Modal Close & Search
    setupCustomPickerListeners();

    // Barcode buttons
    setupBarcodeFormButtons();

    // Supplier autocomplete
    setupSupplierAutocomplete();

    // Clear input validation state on user input
    setupInputValidationReset();
}

function setupInputValidationReset() {
    const form = document.getElementById('form-product-edit');
    if (!form) return;

    form.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            const feedback = input.closest('.settings-form-group')?.querySelector('.invalid-feedback');
            if (feedback && feedback.id === 'edit-prod-name-feedback') {
                feedback.textContent = 'Product name is required.';
            }
        });
    });
}

function openAddProductModal(prodId = null, prefillBarcode = '') {
    const modal = document.getElementById('modal-product-edit');
    if (!modal) return;

    const titleEl = document.getElementById('modal-prod-title');
    const subtitleEl = document.getElementById('modal-prod-subtitle');
    const titleIcon = document.getElementById('prod-modal-title-icon');
    const saveBtnText = document.getElementById('btn-prod-edit-save-text');
    const qtySection = document.getElementById('edit-qty-section');
    const idInput = document.getElementById('edit-prod-id');
    const form = document.getElementById('form-product-edit');
    const customGroup = document.getElementById('edit-prod-custom-category-group');

    // Reset validation styles
    form?.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    if (prodId) {
        // Edit Mode
        const product = Storage.getProduct(prodId);
        if (!product) return;

        if (titleEl) titleEl.textContent = 'Edit Product Details';
        if (subtitleEl) subtitleEl.textContent = 'Update product details and inventory rates';
        if (saveBtnText) saveBtnText.textContent = 'Save Changes';
        if (titleIcon) titleIcon.setAttribute('data-lucide', 'pencil');
        if (qtySection) qtySection.style.display = 'none';

        if (idInput) idInput.value = product.id;
        document.getElementById('edit-prod-name').value = product.productName || '';
        updateSelectedCategory(product.category || 'Groceries');
        updateSelectedUnit(product.unit || 'Piece');
        document.getElementById('edit-prod-purchase').value = product.purchaseRate !== undefined ? product.purchaseRate : '';
        document.getElementById('edit-prod-selling').value = product.sellingRate !== undefined ? product.sellingRate : '';
        document.getElementById('edit-prod-min').value = product.minimumStockLevel !== undefined ? product.minimumStockLevel : '';
        document.getElementById('edit-prod-sku').value = product.sku || '';
        document.getElementById('edit-prod-barcode').value = product.barcode || '';
        document.getElementById('edit-prod-supplier').value = product.supplier || '';
        document.getElementById('edit-prod-expiry').value = product.expiryDate || '';

        if (customGroup) customGroup.style.display = 'none';
    } else {
        // Create Mode
        if (titleEl) titleEl.textContent = 'Add Product';
        if (subtitleEl) subtitleEl.textContent = 'Enter product details and inventory rates';
        if (saveBtnText) saveBtnText.textContent = 'Save Product';
        if (titleIcon) titleIcon.setAttribute('data-lucide', 'package-plus');
        if (qtySection) qtySection.style.display = 'block';

        if (form) form.reset();
        if (idInput) idInput.value = '';

        updateSelectedCategory('Groceries');
        updateSelectedUnit('Piece');

        const barcodeInput = document.getElementById('edit-prod-barcode');
        if (barcodeInput) {
            barcodeInput.value = prefillBarcode || '';
        }

        if (customGroup) customGroup.style.display = 'none';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Capture initial snapshot for dirty state checking
    initialProductFormSnapshot = getProductFormSnapshot();

    openModal(modal);
}

function getProductFormSnapshot() {
    return JSON.stringify({
        id: document.getElementById('edit-prod-id')?.value || '',
        name: document.getElementById('edit-prod-name')?.value || '',
        category: document.getElementById('edit-prod-category')?.value || '',
        customCategory: document.getElementById('edit-prod-custom-category')?.value || '',
        unit: document.getElementById('edit-prod-unit')?.value || '',
        purchase: document.getElementById('edit-prod-purchase')?.value || '',
        selling: document.getElementById('edit-prod-selling')?.value || '',
        qty: document.getElementById('edit-prod-qty')?.value || '',
        min: document.getElementById('edit-prod-min')?.value || '',
        sku: document.getElementById('edit-prod-sku')?.value || '',
        barcode: document.getElementById('edit-prod-barcode')?.value || '',
        supplier: document.getElementById('edit-prod-supplier')?.value || '',
        expiry: document.getElementById('edit-prod-expiry')?.value || ''
    });
}

function isProductFormDirty() {
    if (!initialProductFormSnapshot) return false;
    return initialProductFormSnapshot !== getProductFormSnapshot();
}

function requestCloseProductModal() {
    const modal = document.getElementById('modal-product-edit');
    if (!modal || !modal.classList.contains('active')) return;

    if (isProductFormDirty()) {
        Utils.confirm(
            "Discard changes?",
            "You have unsaved changes in this form. Are you sure you want to discard them?",
            () => {
                forceCloseProductModal();
            },
            null,
            "Discard",
            "Keep Editing"
        );
    } else {
        forceCloseProductModal();
    }
}

function forceCloseProductModal() {
    const modal = document.getElementById('modal-product-edit');
    if (modal) {
        closeModal(modal);
        initialProductFormSnapshot = null;
        const customGroup = document.getElementById('edit-prod-custom-category-group');
        if (customGroup) customGroup.style.display = 'none';
    }
}

// --------------------------------------------------------------------------
// Unit & Category Selection & Badge Synchronization
// --------------------------------------------------------------------------
function updateSelectedUnit(unitValue) {
    const unitInput = document.getElementById('edit-prod-unit');
    const unitLabel = document.getElementById('unit-select-label');
    const stockBadge = document.getElementById('badge-stock-unit');
    const reorderBadge = document.getElementById('badge-reorder-unit');

    const matched = UNIT_OPTIONS.find(u => u.value.toLowerCase() === (unitValue || '').toLowerCase() || u.label.toLowerCase() === (unitValue || '').toLowerCase());
    const label = matched ? matched.label : (unitValue || 'Piece (pc)');
    const storedVal = matched ? matched.value : (unitValue || 'Piece');
    const shortCode = getShortUnit(storedVal, 1);

    if (unitInput) unitInput.value = storedVal;
    if (unitLabel) unitLabel.textContent = label;
    if (stockBadge) stockBadge.textContent = shortCode;
    if (reorderBadge) reorderBadge.textContent = shortCode;
}

function updateSelectedCategory(catValue) {
    const catInput = document.getElementById('edit-prod-category');
    const catLabel = document.getElementById('category-select-label');
    const customGroup = document.getElementById('edit-prod-custom-category-group');

    if (catInput) catInput.value = catValue || 'Groceries';
    if (catLabel) catLabel.textContent = catValue || 'Groceries';

    if (catValue === '__new__') {
        if (customGroup) customGroup.style.display = 'block';
        const customInp = document.getElementById('edit-prod-custom-category');
        if (customInp) customInp.focus();
    } else {
        if (customGroup) customGroup.style.display = 'none';
        const customInp = document.getElementById('edit-prod-custom-category');
        if (customInp) customInp.value = '';
    }
}

// --------------------------------------------------------------------------
// Custom Dropdown Picker Component (Mobile Bottom Sheet & Tablet Popover)
// --------------------------------------------------------------------------
function setupCustomPickerListeners() {
    const pickerModal = document.getElementById('modal-custom-picker');
    const closeBtn = document.getElementById('custom-picker-close');
    const searchInput = document.getElementById('custom-picker-search');
    const clearBtn = document.getElementById('custom-picker-search-clear');
    const addCustomBtn = document.getElementById('custom-picker-add-btn');

    if (closeBtn && pickerModal) {
        closeBtn.addEventListener('click', () => closeModal(pickerModal));
    }

    if (pickerModal) {
        pickerModal.addEventListener('click', (e) => {
            if (e.target === pickerModal) closeModal(pickerModal);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value;
            if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';
            const currentVal = currentPickerType === 'category' 
                ? (document.getElementById('edit-prod-category')?.value || '')
                : (document.getElementById('edit-prod-unit')?.value || '');
            renderPickerOptions(currentVal, q);
        });
    }

    if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            const currentVal = currentPickerType === 'category' 
                ? (document.getElementById('edit-prod-category')?.value || '')
                : (document.getElementById('edit-prod-unit')?.value || '');
            renderPickerOptions(currentVal, '');
            searchInput.focus();
        });
    }

    if (addCustomBtn) {
        addCustomBtn.addEventListener('click', () => {
            showCustomPrompt("Enter new category name:", "Category Name", (newCategory) => {
                const trimmedCat = newCategory.trim();
                closeModal(pickerModal);
                updateSelectedCategory(trimmedCat);
                if (onPickerSelectCallback) onPickerSelectCallback(trimmedCat);
            });
        });
    }
}

function openCustomPicker(type, currentValue, onSelect) {
    currentPickerType = type;
    onPickerSelectCallback = onSelect;
    const modal = document.getElementById('modal-custom-picker');
    const titleEl = document.getElementById('custom-picker-title');
    const searchInput = document.getElementById('custom-picker-search');
    const clearBtn = document.getElementById('custom-picker-search-clear');
    const footerEl = document.getElementById('custom-picker-footer');

    if (!modal) return;

    if (type === 'category') {
        if (titleEl) titleEl.textContent = 'Select Category';
        if (searchInput) searchInput.placeholder = 'Search categories...';
        const products = Storage.getProducts();
        const defaultCategories = ["Groceries", "Dairy", "Grains & Rice", "Oil & Ghee", "Snacks & Biscuits", "Beverages", "Household", "Personal Care"];
        const productCategories = products.map(p => p.category).filter(Boolean);
        const allCategories = Array.from(new Set([...defaultCategories, ...productCategories]));
        pickerOptions = allCategories.map(c => ({ label: c, value: c }));
        if (footerEl) footerEl.style.display = 'block';
    } else if (type === 'unit') {
        if (titleEl) titleEl.textContent = 'Select Unit';
        if (searchInput) searchInput.placeholder = 'Search units...';
        pickerOptions = UNIT_OPTIONS.map(u => ({ label: u.label, value: u.value, code: u.code }));
        if (footerEl) footerEl.style.display = 'none';
    }

    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';

    renderPickerOptions(currentValue, '');
    openModal(modal);

    setTimeout(() => {
        if (window.innerWidth >= 768 && searchInput) {
            searchInput.focus();
        }
    }, 120);
}

function renderPickerOptions(currentSelected, searchQuery = '') {
    const listEl = document.getElementById('custom-picker-options');
    if (!listEl) return;

    const query = (searchQuery || '').toLowerCase().trim();
    const filtered = pickerOptions.filter(opt => 
        opt.label.toLowerCase().includes(query) || 
        (opt.value && opt.value.toLowerCase().includes(query)) ||
        (opt.code && opt.code.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 13.5px;">
                No matches found
            </div>
        `;
        return;
    }

    listEl.innerHTML = filtered.map(opt => {
        const isSelected = (opt.value && opt.value.toLowerCase() === (currentSelected || '').toLowerCase()) || 
                           (opt.label && opt.label.toLowerCase() === (currentSelected || '').toLowerCase());
        return `
            <div class="custom-picker-option ${isSelected ? 'selected' : ''}" data-value="${opt.value}" role="option" aria-selected="${isSelected}">
                <span>${opt.label}</span>
                <i data-lucide="check" class="custom-picker-option-check"></i>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    listEl.querySelectorAll('.custom-picker-option').forEach(item => {
        item.addEventListener('click', () => {
            const val = item.dataset.value;
            if (onPickerSelectCallback) {
                onPickerSelectCallback(val);
            }
            closeModal(document.getElementById('modal-custom-picker'));
        });
    });
}

// --------------------------------------------------------------------------
// Supplier Autocomplete
// --------------------------------------------------------------------------
function setupSupplierAutocomplete() {
    const supplierInput = document.getElementById('edit-prod-supplier');
    const suggestionsPanel = document.getElementById('supplier-suggestions-panel');
    if (!supplierInput || !suggestionsPanel) return;

    supplierInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const products = Storage.getProducts();
        const productSuppliers = products.map(p => p.supplier).filter(Boolean);
        const defaultSuppliers = ["Metro Wholesalers", "Reliance Retail", "Amul Distributor", "National Grocers", "Direct Farm Source"];
        const allSuppliers = Array.from(new Set([...productSuppliers, ...defaultSuppliers]));

        if (!query) {
            suggestionsPanel.style.display = 'none';
            return;
        }

        const filtered = allSuppliers.filter(s => s.toLowerCase().includes(query));
        if (filtered.length === 0) {
            suggestionsPanel.style.display = 'none';
            return;
        }

        suggestionsPanel.innerHTML = filtered.map(s => `
            <div class="supplier-suggestion-item" data-value="${s}">
                <i data-lucide="building-2" style="width: 14px; height: 14px; color: var(--text-muted); flex-shrink: 0;"></i>
                <span>${s}</span>
            </div>
        `).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
        suggestionsPanel.style.display = 'block';

        suggestionsPanel.querySelectorAll('.supplier-suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                supplierInput.value = item.dataset.value;
                suggestionsPanel.style.display = 'none';
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!supplierInput.contains(e.target) && !suggestionsPanel.contains(e.target)) {
            suggestionsPanel.style.display = 'none';
        }
    });
}

// --------------------------------------------------------------------------
// Barcode Form Actions (Generate & Scan)
// --------------------------------------------------------------------------
function setupBarcodeFormButtons() {
    const genBtn = document.getElementById('btn-generate-barcode-form');
    const scanBtn = document.getElementById('btn-scan-barcode-form');
    const barcodeInput = document.getElementById('edit-prod-barcode');

    if (genBtn) {
        genBtn.onclick = () => {
            if (typeof BarcodeService !== 'undefined') {
                const currentCode = barcodeInput ? barcodeInput.value.trim() : '';
                if (currentCode) {
                    Utils.confirm(
                        "Replace existing barcode?",
                        `This product already has barcode "${currentCode}". Do you want to generate a new unique barcode?`,
                        () => {
                            const newCode = BarcodeService.generateUniqueBarcode('GROC');
                            if (barcodeInput) {
                                barcodeInput.value = newCode;
                                barcodeInput.classList.remove('is-invalid');
                                Utils.showToast("✓ Generated unique barcode", "success");
                            }
                        }
                    );
                } else {
                    const newCode = BarcodeService.generateUniqueBarcode('GROC');
                    if (barcodeInput) {
                        barcodeInput.value = newCode;
                        barcodeInput.classList.remove('is-invalid');
                        Utils.showToast("✓ Generated unique barcode", "success");
                    }
                }
            }
        };
    }

    if (scanBtn) {
        scanBtn.onclick = () => {
            if (typeof BarcodeScanner !== 'undefined') {
                BarcodeScanner.open((code) => {
                    if (barcodeInput) {
                        barcodeInput.value = code;
                        barcodeInput.classList.remove('is-invalid');
                        if (typeof Utils !== 'undefined') Utils.showToast(`Scanned barcode: ${code}`, "success");
                    }
                }, 'input');
            }
        };
    }
}

// --------------------------------------------------------------------------
// Form Submit & Robust Validation
// --------------------------------------------------------------------------
function handleProductFormSubmit(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('modal-product-edit');
    const saveBtn = document.getElementById('btn-prod-edit-save');
    const saveBtnText = document.getElementById('btn-prod-edit-save-text');
    const id = document.getElementById('edit-prod-id')?.value || '';
    const nameEl = document.getElementById('edit-prod-name');
    const pRateEl = document.getElementById('edit-prod-purchase');
    const sRateEl = document.getElementById('edit-prod-selling');
    const qtyEl = document.getElementById('edit-prod-qty');
    const minEl = document.getElementById('edit-prod-min');
    const skuEl = document.getElementById('edit-prod-sku');
    const barcodeInput = document.getElementById('edit-prod-barcode');
    const barcodeFeedback = document.getElementById('edit-prod-barcode-feedback');

    let isValid = true;
    let firstInvalidEl = null;

    const markInvalid = (el) => {
        if (!el) return;
        el.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = el;
    };

    const markValid = (el) => {
        if (!el) return;
        el.classList.remove('is-invalid');
    };

    // 1. Product Name Validation
    if (!nameEl || !nameEl.value.trim()) {
        markInvalid(nameEl);
    } else {
        markValid(nameEl);
    }

    // 2. Category Validation
    let categoryVal = document.getElementById('edit-prod-category')?.value || 'Groceries';
    if (categoryVal === '__new__') {
        const customCatEl = document.getElementById('edit-prod-custom-category');
        const customCatVal = customCatEl ? customCatEl.value.trim() : '';
        if (!customCatVal) {
            markInvalid(customCatEl);
        } else {
            markValid(customCatEl);
            categoryVal = customCatVal;
        }
    }

    // 3. Unit Validation
    const unitVal = document.getElementById('edit-prod-unit')?.value || 'Piece';
    if (!unitVal) {
        const unitTrigger = document.getElementById('btn-select-unit');
        markInvalid(unitTrigger);
    }

    // 4. Rate Validations (Purchase & Selling)
    const pRateVal = parseFloat(pRateEl ? pRateEl.value : '');
    if (isNaN(pRateVal) || pRateVal < 0 || (pRateEl && pRateEl.value === '')) {
        markInvalid(pRateEl);
    } else {
        markValid(pRateEl);
    }

    const sRateVal = parseFloat(sRateEl ? sRateEl.value : '');
    if (isNaN(sRateVal) || sRateVal < 0 || (sRateEl && sRateEl.value === '')) {
        markInvalid(sRateEl);
    } else {
        markValid(sRateEl);
    }

    // 5. Stock & Minimum Levels
    const isCreateMode = !id;
    if (isCreateMode && qtyEl) {
        const qtyVal = parseFloat(qtyEl.value);
        if (isNaN(qtyVal) || qtyVal < 0 || qtyEl.value === '') {
            markInvalid(qtyEl);
        } else {
            markValid(qtyEl);
        }
    }

    const minVal = parseFloat(minEl ? minEl.value : '');
    if (isNaN(minVal) || minVal < 0 || (minEl && minEl.value === '')) {
        markInvalid(minEl);
    } else {
        markValid(minEl);
    }

    // 6. Barcode Validation
    const barcodeVal = BarcodeService.sanitize(barcodeInput ? barcodeInput.value : '');
    if (barcodeVal) {
        const dupCheck = BarcodeService.checkDuplicate(barcodeVal, id || null);
        if (dupCheck.isDuplicate) {
            markInvalid(barcodeInput);
            if (barcodeFeedback) {
                barcodeFeedback.textContent = `Barcode already assigned to: ${dupCheck.conflictProduct ? dupCheck.conflictProduct.productName : ''}`;
            }
            Utils.showToast(`Barcode already assigned to "${dupCheck.conflictProduct.productName}".`, "error");
        } else {
            markValid(barcodeInput);
        }
    } else if (barcodeInput) {
        markValid(barcodeInput);
    }

    // 7. Duplicate Product Name + Unit Check
    if (nameEl && nameEl.value.trim()) {
        const allProducts = Storage.getProducts();
        const cleanName = nameEl.value.trim().toLowerCase();
        const duplicateProduct = allProducts.find(p => 
            p.id !== id && 
            p.productName.trim().toLowerCase() === cleanName && 
            (p.unit || 'Piece').trim().toLowerCase() === (unitVal || 'Piece').trim().toLowerCase()
        );

        if (duplicateProduct) {
            markInvalid(nameEl);
            const nameFeedback = document.getElementById('edit-prod-name-feedback');
            if (nameFeedback) {
                nameFeedback.textContent = `A product named "${nameEl.value.trim()}" (${unitVal}) already exists.`;
            }
            Utils.showToast(`A product named "${nameEl.value.trim()}" with unit ${unitVal} already exists.`, "error");
        }
    }

    // If form has errors, keep modal open and focus the first invalid field
    if (!isValid) {
        if (firstInvalidEl) {
            firstInvalidEl.focus();
            firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // Enter saving state
    if (saveBtn) saveBtn.disabled = true;
    if (saveBtnText) saveBtnText.textContent = 'Saving...';

    const skuVal = skuEl ? skuEl.value.trim() : '';
    const supplierVal = document.getElementById('edit-prod-supplier')?.value.trim() || '';
    const expiryVal = document.getElementById('edit-prod-expiry')?.value || '';

    setTimeout(() => {
        try {
            if (id) {
                // Update Mode
                Storage.updateProduct(id, {
                    productName: nameEl.value.trim(),
                    category: categoryVal,
                    unit: unitVal,
                    purchaseRate: pRateVal,
                    sellingRate: sRateVal,
                    minimumStockLevel: minVal,
                    sku: skuVal,
                    barcode: barcodeVal,
                    supplier: supplierVal,
                    expiryDate: expiryVal
                });
                Utils.showToast("Product updated successfully", "success");
            } else {
                // Create Mode
                const newProduct = {
                    productName: nameEl.value.trim(),
                    category: categoryVal,
                    unit: unitVal,
                    purchaseRate: pRateVal,
                    sellingRate: sRateVal,
                    currentQuantity: parseFloat(qtyEl ? qtyEl.value : 0) || 0,
                    minimumStockLevel: minVal,
                    sku: skuVal,
                    barcode: barcodeVal,
                    supplier: supplierVal,
                    expiryDate: expiryVal
                };
                Storage.saveProduct(newProduct);
                Utils.showToast("Product added successfully", "success");
            }

            Storage.runStockCheckAndNotify();
            populateCategoryDropdowns();

            forceCloseProductModal();

            if (document.body.dataset.page === 'product-details') {
                loadProductProfileDetails();
            } else {
                renderProductsList();
            }
        } catch (err) {
            console.error("Error saving product:", err);
            Utils.showToast("Error saving product. Please try again.", "error");
        } finally {
            if (saveBtn) saveBtn.disabled = false;
            if (saveBtnText) saveBtnText.textContent = id ? 'Save Changes' : 'Save Product';
        }
    }, 150);
}

// --------------------------------------------------------------------------
// STOCK ADJUSTMENT MODAL LOGIC
// --------------------------------------------------------------------------
function setupStockAdjustmentModalListeners() {
    const modal = document.getElementById('modal-stock-adjust');
    if (!modal) return;

    document.getElementById('modal-adjust-close')?.addEventListener('click', () => closeModal(modal));
    document.getElementById('btn-adjust-cancel')?.addEventListener('click', () => closeModal(modal));
    document.getElementById('form-stock-adjust')?.addEventListener('submit', handleStockAdjustSubmit);

    // Step 1: Product lookup
    const lookupInput = document.getElementById('adjust-stock-prod-lookup');
    if (lookupInput) {
        lookupInput.addEventListener('input', handleAdjustStockLookupInput);
    }

    // Step 2: Change product button
    document.getElementById('btn-adjust-change-product')?.addEventListener('click', () => {
        document.getElementById('adjust-stock-step-1').style.display = 'flex';
        document.getElementById('adjust-stock-step-2').style.display = 'none';
        document.getElementById('adjust-prod-id').value = '';
    });

    // Segmented adjustment types
    const typeAdd = document.getElementById('btn-adjust-type-add');
    const typeRemove = document.getElementById('btn-adjust-type-remove');
    const typeCorrect = document.getElementById('btn-adjust-type-correct');

    if (typeAdd) typeAdd.addEventListener('click', () => { setAdjustmentType('add'); updateAdjustmentPreview(); });
    if (typeRemove) typeRemove.addEventListener('click', () => { setAdjustmentType('remove'); updateAdjustmentPreview(); });
    if (typeCorrect) typeCorrect.addEventListener('click', () => { setAdjustmentType('correction'); updateAdjustmentPreview(); });

    // Stepper buttons
    const qtyInput = document.getElementById('adjust-quantity');
    document.getElementById('btn-adjust-qty-minus')?.addEventListener('click', () => {
        if (qtyInput) {
            let val = parseFloat(qtyInput.value) || 0;
            val = Math.max(0.01, val - 1);
            qtyInput.value = val;
            updateAdjustmentPreview();
        }
    });

    document.getElementById('btn-adjust-qty-plus')?.addEventListener('click', () => {
        if (qtyInput) {
            let val = parseFloat(qtyInput.value) || 0;
            val = val + 1;
            qtyInput.value = val;
            updateAdjustmentPreview();
        }
    });

    if (qtyInput) {
        qtyInput.addEventListener('input', updateAdjustmentPreview);
    }
}

function openStockAdjustmentModal(productId = null) {
    const modal = document.getElementById('modal-stock-adjust');
    if (!modal) return;

    const lookupInput = document.getElementById('adjust-stock-prod-lookup');
    if (lookupInput) lookupInput.value = '';

    const qtyInput = document.getElementById('adjust-quantity');
    if (qtyInput) qtyInput.value = '1';

    setAdjustmentType('add');

    if (productId) {
        selectProductForAdjustment(productId);
    } else {
        const step1 = document.getElementById('adjust-stock-step-1');
        const step2 = document.getElementById('adjust-stock-step-2');
        if (step1) step1.style.display = 'flex';
        if (step2) step2.style.display = 'none';
        handleAdjustStockLookupInput();
    }

    openModal(modal);
}

function handleAdjustStockLookupInput() {
    const lookupInput = document.getElementById('adjust-stock-prod-lookup');
    const query = lookupInput ? lookupInput.value.toLowerCase().trim() : '';
    const suggestionsPanel = document.getElementById('adjust-stock-suggestions');
    if (!suggestionsPanel) return;

    const products = Storage.getProducts();
    let filtered = products;

    if (query) {
        filtered = products.filter(p => 
            p.productName.toLowerCase().includes(query) || 
            (p.sku && p.sku.toLowerCase().includes(query)) || 
            (p.barcode && p.barcode.includes(query))
        );
    }

    if (filtered.length === 0) {
        suggestionsPanel.innerHTML = `
            <div class="no-results-card">
                <div style="font-size: 13px; color: var(--text-muted);">No products found matching query.</div>
            </div>
        `;
        suggestionsPanel.style.display = 'block';
        return;
    }

    suggestionsPanel.innerHTML = filtered.map(p => {
        const qty = parseFloat(p.currentQuantity) || 0;
        const unit = getShortUnit(p.unit, qty);
        return `
            <div class="stock-suggestion-row" data-id="${p.id}">
                <div>
                    <strong style="color: var(--text); font-size: 14px;">${p.productName}</strong>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 1px;">Current: ${qty} ${unit} · ${p.category || 'General'}</div>
                </div>
                <button type="button" class="suggestion-select-btn">Select</button>
            </div>
        `;
    }).join('');

    suggestionsPanel.style.display = 'block';

    suggestionsPanel.querySelectorAll('.stock-suggestion-row').forEach(row => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            selectProductForAdjustment(row.dataset.id);
        });
    });
}

function selectProductForAdjustment(productId) {
    const product = Storage.getProduct(productId);
    if (!product) return;

    const prodIdInput = document.getElementById('adjust-prod-id');
    if (prodIdInput) prodIdInput.value = product.id;

    const selectedNameEl = document.getElementById('adjust-selected-name');
    if (selectedNameEl) selectedNameEl.textContent = product.productName;

    const currentStockLabel = document.getElementById('adjust-current-stock-label');
    if (currentStockLabel) currentStockLabel.textContent = `${product.currentQuantity} ${product.unit || 'pc'}`;

    updateAdjustmentPreview();

    const step1 = document.getElementById('adjust-stock-step-1');
    const step2 = document.getElementById('adjust-stock-step-2');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'flex';
}

function setAdjustmentType(type) {
    const dirInput = document.getElementById('adjust-direction');
    if (dirInput) dirInput.value = type;

    const btns = {
        add: document.getElementById('btn-adjust-type-add'),
        remove: document.getElementById('btn-adjust-type-remove'),
        correction: document.getElementById('btn-adjust-type-correct')
    };

    Object.keys(btns).forEach(key => {
        if (btns[key]) {
            if (key === type) {
                btns[key].classList.add('active');
            } else {
                btns[key].classList.remove('active');
            }
        }
    });
}

function updateAdjustmentPreview() {
    const prodId = document.getElementById('adjust-prod-id')?.value;
    const targetPreview = document.getElementById('adjust-target-preview');
    const qtyInput = document.getElementById('adjust-quantity');
    const dirInput = document.getElementById('adjust-direction');

    if (!targetPreview || !qtyInput) return;

    const product = prodId ? Storage.getProduct(prodId) : null;
    const current = product ? (parseFloat(product.currentQuantity) || 0) : 0;
    const unit = product ? (product.unit || 'pc') : 'pc';

    const adjQty = parseFloat(qtyInput.value) || 0;
    const direction = dirInput ? dirInput.value : 'add';

    let target = current;
    if (direction === 'add') target += adjQty;
    else if (direction === 'remove') target = Math.max(0, target - adjQty);
    else if (direction === 'correction') target = Math.max(0, adjQty);

    targetPreview.textContent = `${target.toFixed(1).replace(/\.0$/, '')} ${unit}`;
}

function handleStockAdjustSubmit(e) {
    e.preventDefault();
    const prodId = document.getElementById('adjust-prod-id').value;
    const direction = document.getElementById('adjust-direction').value;
    const qtyEl = document.getElementById('adjust-quantity');
    const reasonEl = document.getElementById('adjust-reason');
    const feedbackEl = document.getElementById('adjust-qty-feedback');

    const adjustQty = parseFloat(qtyEl.value);
    let isValid = true;

    if (isNaN(adjustQty) || adjustQty <= 0) {
        qtyEl.classList.add('is-invalid');
        if (feedbackEl) feedbackEl.textContent = "Quantity must be greater than zero.";
        isValid = false;
    } else {
        qtyEl.classList.remove('is-invalid');
    }

    if (!isValid) return;

    const product = Storage.getProduct(prodId);
    if (!product) {
        Utils.showToast("Selected product not found", "error");
        return;
    }

    let newQty = parseFloat(product.currentQuantity) || 0;
    let reasonVal = reasonEl ? reasonEl.value.trim() : 'Manual correction';
    let notesVal = '';

    if (direction === 'add') {
        newQty += adjustQty;
        notesVal = `Adjustment addition: ${reasonVal}`;
    } else if (direction === 'remove') {
        if (adjustQty > (parseFloat(product.currentQuantity) || 0)) {
            qtyEl.classList.add('is-invalid');
            if (feedbackEl) feedbackEl.textContent = `Insufficient stock! Cannot remove ${adjustQty} from ${product.currentQuantity} remaining.`;
            return;
        }
        newQty = Math.max(0, newQty - adjustQty);
        notesVal = `Adjustment removal: ${reasonVal}`;
    } else if (direction === 'correction') {
        newQty = adjustQty;
        notesVal = `Correction (Set to ${newQty}): ${reasonVal}`;
    }

    Storage.updateProduct(prodId, {
        currentQuantity: newQty,
        adjustmentNote: notesVal
    });

    Storage.runStockCheckAndNotify();

    Utils.initAppLayout(document.body.dataset.page);
    Utils.showToast("✓ Stock adjusted successfully", "success");
    
    closeModal(document.getElementById('modal-stock-adjust'));

    if (document.body.dataset.page === 'product-details') {
        loadProductProfileDetails();
    } else {
        renderProductsList();
    }
}

// --------------------------------------------------------------------------
// STOCK HISTORY MODAL LOGIC
// --------------------------------------------------------------------------
function setupStockHistoryModalListeners() {
    const modal = document.getElementById('modal-stock-history');
    if (!modal) return;

    document.getElementById('modal-stock-history-close')?.addEventListener('click', () => closeModal(modal));
    document.getElementById('btn-stock-history-close')?.addEventListener('click', () => closeModal(modal));
}

function openStockHistoryModal() {
    const modal = document.getElementById('modal-stock-history');
    const feed = document.getElementById('stock-history-feed');
    if (!modal || !feed) return;

    const products = Storage.getProducts();
    let allHistory = [];

    products.forEach(p => {
        if (p.stockHistory && Array.isArray(p.stockHistory)) {
            p.stockHistory.forEach(h => {
                allHistory.push({
                    ...h,
                    productName: p.productName,
                    unit: p.unit || 'pc'
                });
            });
        }
    });

    if (allHistory.length === 0) {
        feed.innerHTML = `
            <div class="no-results-card" style="padding: 24px 0;">
                <i data-lucide="history" style="width: 28px; height: 28px; color: var(--text-muted); margin-bottom: 8px;"></i>
                <div style="font-weight: 600; color: var(--text);">No Stock History</div>
                <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">No inventory adjustments or sales movements recorded yet.</div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        openModal(modal);
        return;
    }

    // Sort descending by date
    allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    feed.innerHTML = allHistory.map(st => {
        const timeStr = Utils.formatDateTime(st.date);
        const isIn = st.type === 'Stock In' || (st.note && st.note.includes('addition'));
        const symbol = isIn ? '+' : '-';
        const stClass = isIn ? 'in' : 'out';

        return `
            <div class="stock-timeline-item">
                <div class="stock-timeline-dot ${stClass}"></div>
                <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:13.5px;">
                    <div>
                        <strong style="color:var(--text);">${st.productName}</strong>
                        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                            ${st.type || 'Adjustment'} · ${timeStr} ${st.note ? `· ${st.note}` : ''}
                        </div>
                    </div>
                    <div style="text-align:right; flex-shrink: 0; margin-left: 8px;">
                        <strong style="color:${isIn ? 'var(--accent)' : 'var(--danger)'}">${symbol}${st.quantity || 0} ${st.unit}</strong>
                        <div style="font-size:11px; color:var(--text-light); margin-top: 1px;">Bal: ${st.newQuantity || 0}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
    openModal(modal);
}

// --------------------------------------------------------------------------
// Category Dropdown Helpers
// --------------------------------------------------------------------------
function populateCategoryDropdowns() {
    const products = Storage.getProducts();
    const defaultCategories = ["Groceries", "Dairy", "Grains & Rice", "Oil & Ghee", "Snacks & Biscuits", "Beverages", "Household", "Personal Care"];
    const productCategories = products.map(p => p.category).filter(Boolean);
    const allCategories = Array.from(new Set([...defaultCategories, ...productCategories]));
    
    const filterSelect = document.getElementById('category-filter');
    const editSelect = document.getElementById('edit-prod-category');
    
    if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="">All Categories</option>' + 
            allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        filterSelect.value = currentVal;
    }
    
    if (editSelect) {
        const currentVal = editSelect.value;
        editSelect.innerHTML = allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('') + 
            '<option value="__new__">+ Add Custom Category...</option>';
        editSelect.value = currentVal;
    }
}

function setupCategoryCustomInputListener() {
    const editSelect = document.getElementById('edit-prod-category');
    const customGroup = document.getElementById('edit-prod-custom-category-group');
    if (!editSelect || !customGroup) return;
    
    editSelect.addEventListener('change', (e) => {
        if (e.target.value === '__new__') {
            customGroup.style.display = 'block';
            const input = document.getElementById('edit-prod-custom-category');
            if (input) input.focus();
        } else {
            customGroup.style.display = 'none';
            const input = document.getElementById('edit-prod-custom-category');
            if (input) input.value = '';
        }
    });
}

// --------------------------------------------------------------------------
// PRODUCT DETAILS PAGE (Preserve Full Functionality)
// --------------------------------------------------------------------------
let activeProductId = null;

function initProductDetailsPage() {
    const params = new URLSearchParams(window.location.search);
    activeProductId = params.get('id');

    if (!activeProductId) {
        window.location.href = (window.BASE_PATH || '') + `pages/inventory/stock.html`;
        return;
    }

    loadProductProfileDetails();
    setupProductDetailsEventListeners();
}

function switchProductTab(tabName) {
    const tabs = ['overview', 'market', 'history'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const pane = document.getElementById(`tab-content-${t}`);
        if (btn) btn.classList.toggle('active', t === tabName);
        if (pane) pane.style.display = (t === tabName) ? 'block' : 'none';
    });
}

function loadProductProfileDetails() {
    const product = Storage.getProduct(activeProductId);
    if (!product) {
        Utils.showToast("Product not found", "error");
        setTimeout(() => { window.location.href = (window.BASE_PATH || '') + `pages/inventory/stock.html`; }, 1500);
        return;
    }

    // Set UI elements
    const nameEl = document.getElementById('prod-details-name');
    const qtyEl = document.getElementById('prod-details-qty');
    const unitEl = document.getElementById('prod-details-unit');
    const statusEl = document.getElementById('prod-details-status');
    const catTagEl = document.getElementById('prod-details-cat-tag');

    if (nameEl) nameEl.textContent = product.productName;
    if (qtyEl) qtyEl.textContent = product.currentQuantity;
    if (unitEl) unitEl.textContent = product.unit || 'Piece';
    if (catTagEl) catTagEl.textContent = product.category || 'Groceries';

    const qty = parseFloat(product.currentQuantity) || 0;
    const min = parseFloat(product.minimumStockLevel) || 0;

    if (statusEl) {
        statusEl.className = 'status-pill';
        if (qty === 0) {
            statusEl.textContent = 'OUT OF STOCK';
            statusEl.classList.add('status-out-of-stock');
        } else if (qty <= min) {
            statusEl.textContent = 'LOW STOCK';
            statusEl.classList.add('status-low-stock');
        } else {
            statusEl.textContent = 'IN STOCK';
            statusEl.classList.add('status-in-stock');
        }
    }

    const setField = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setField('prop-category', product.category || 'Groceries');
    
    // Optional field fallback: Supplier
    const supplierVal = product.supplier ? product.supplier.trim() : '';
    setField('prop-supplier', supplierVal || 'Not Set');

    setField('prop-selling', Utils.formatCurrency(product.sellingRate));
    setField('prop-purchase', Utils.formatCurrency(product.purchaseRate));
    setField('prop-reorder-level', `${product.minimumStockLevel} ${product.unit || 'pc'}`);
    setField('prop-code', product.sku || 'SKU-8042');

    // Optional field fallback: Expiry Date with urgency color coding
    const expiryEl = document.getElementById('prop-expiry');
    if (expiryEl) {
        if (product.expiryDate) {
            const expDate = new Date(product.expiryDate);
            const now = new Date();
            const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysLeft < 0) {
                expiryEl.innerHTML = `<span class="text-rose-500 font-extrabold">${Utils.formatDate(product.expiryDate)} (Expired)</span>`;
            } else if (daysLeft <= 14) {
                expiryEl.innerHTML = `<span class="text-amber-500 font-extrabold">${Utils.formatDate(product.expiryDate)} (${daysLeft} days left)</span>`;
            } else {
                expiryEl.textContent = Utils.formatDate(product.expiryDate);
            }
        } else {
            expiryEl.textContent = 'Non-perishable';
        }
    }

    // Barcode display
    const barcodeVal = product.barcode ? String(product.barcode).trim() : '';
    const propBarcodeEl = document.getElementById('prop-barcode-val');
    const showBarcodeBtn = document.getElementById('btn-show-barcode');
    if (propBarcodeEl) {
        propBarcodeEl.textContent = barcodeVal || 'No barcode assigned';
        if (!barcodeVal) {
            propBarcodeEl.style.color = 'var(--text-muted)';
            propBarcodeEl.style.fontWeight = '500';
        } else {
            propBarcodeEl.style.color = 'var(--text)';
            propBarcodeEl.style.fontWeight = '800';
        }
    }
    if (showBarcodeBtn) {
        showBarcodeBtn.innerHTML = barcodeVal 
            ? '<i data-lucide="barcode" style="width: 14px; height: 14px;"></i> Show Barcode' 
            : '<i data-lucide="wand-sparkles" style="width: 14px; height: 14px;"></i> Assign Barcode';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Render Smart Stock & Market Reference
    try {
        if (typeof renderSmartStockDetails === 'function') renderSmartStockDetails(product);
        if (typeof renderMarketPriceDetails === 'function') renderMarketPriceDetails(product);
    } catch (e) {
        console.error("Missing render functions for smart stock / market price.", e);
    }

    // Render stock ledger logs
    renderStockLedgerLogs(product.stockHistory || []);
}

function renderStockLedgerLogs(history) {
    const listFeed = document.getElementById('stock-ledger-list-feed');
    const countBadge = document.getElementById('history-log-count-badge');
    if (!listFeed) return;

    if (countBadge) {
        countBadge.textContent = `${history.length} entr${history.length === 1 ? 'y' : 'ies'}`;
    }

    if (history.length === 0) {
        listFeed.innerHTML = `
            <div class="text-center py-8 px-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
                <div class="w-10 h-10 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto text-lg">📜</div>
                <div class="font-extrabold text-slate-300 text-xs">No Inventory Movements Recorded</div>
                <p class="text-[11px] text-slate-500 font-medium">Stock adjustments, purchases, and sale movements will appear here chronologically.</p>
            </div>
        `;
        return;
    }

    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

    listFeed.innerHTML = sorted.map(st => {
        const timeStr = Utils.formatDateTime(st.date);
        const isIn = st.type === 'Stock In' || (st.note && st.note.includes('addition'));
        const symbol = isIn ? '+' : '-';
        const stClass = isIn ? 'in' : 'out';
        
        return `
            <div class="stock-timeline-item">
                <div class="stock-timeline-dot ${stClass}"></div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
                    <div>
                        <strong style="color:var(--text); font-weight:800;">${st.type || 'Adjustment'}</strong>
                        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${timeStr} · ${st.note || ''}</div>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:${isIn ? 'var(--accent)' : 'var(--danger)'}; font-family:monospace; font-weight:900;">${symbol}${st.quantity}</strong>
                        <div style="font-size:0.65rem; color:var(--text-muted); font-family:monospace;">Bal: ${st.newQuantity}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function setupProductDetailsEventListeners() {
    // 1. Add Stock Modal
    document.getElementById('btn-stock-add')?.addEventListener('click', () => {
        openAddStockModal(activeProductId);
    });

    // 2. Adjust Stock Modal
    document.getElementById('btn-stock-adjust')?.addEventListener('click', () => {
        openStockAdjustmentModal(activeProductId);
    });

    // 3. Edit Product
    document.getElementById('btn-edit-product')?.addEventListener('click', () => {
        openAddProductModal(activeProductId);
    });

    // 4. Barcode Show Modal
    const showBarcodeBtn = document.getElementById('btn-show-barcode');
    if (showBarcodeBtn) {
        showBarcodeBtn.onclick = (e) => {
            if (e) e.preventDefault();
            let product = Storage.getProduct(activeProductId);
            if (!product) {
                Utils.showToast("Product details not loaded", "error");
                return;
            }

            if (!product.barcode) {
                const newCode = BarcodeService.generateUniqueBarcode('GROC');
                product = Storage.updateProduct(activeProductId, { barcode: newCode });
                loadProductProfileDetails();
                Utils.showToast(`✓ Assigned barcode: ${newCode}`, "success");
            }

            let showBarcodeModal = document.getElementById('modal-show-barcode');
            if (!showBarcodeModal) {
                // Dynamically inject Barcode Modal if absent
                showBarcodeModal = document.createElement('div');
                showBarcodeModal.id = 'modal-show-barcode';
                showBarcodeModal.className = 'modal-overlay';
                showBarcodeModal.innerHTML = `
                    <div class="modal-container text-center">
                        <div class="modal-header">
                            <h3 class="modal-title" id="barcode-modal-prod-name">${product.productName}</h3>
                            <button class="modal-close" id="modal-show-barcode-close" onclick="closeModal(document.getElementById('modal-show-barcode'))"><i data-lucide="x"></i></button>
                        </div>
                        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                            <p style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;" id="barcode-modal-prod-meta">₹${product.sellingRate}/${product.unit}</p>
                            <div style="padding: 16px; background: #ffffff; border: 1px solid var(--border); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                                <svg id="barcode-modal-svg"></svg>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding-top: 8px;">
                                <button type="button" class="btn btn-outline" id="btn-download-barcode-png" style="font-size: 0.78rem; font-weight: 700;">PNG</button>
                                <button type="button" class="btn btn-outline" id="btn-download-barcode-svg" style="font-size: 0.78rem; font-weight: 700;">SVG</button>
                                <button type="button" class="btn btn-primary" id="btn-print-barcode-label" style="font-size: 0.78rem; font-weight: 700;">Print</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(showBarcodeModal);
            }

            // Always bind handlers (using onclick to prevent duplicate bindings on multiple clicks)
            const closeBtn = document.getElementById('modal-show-barcode-close');
            if (closeBtn) closeBtn.onclick = () => closeModal(showBarcodeModal);
            
            const btnPng = document.getElementById('btn-download-barcode-png');
            if (btnPng) btnPng.onclick = () => {
                const p = Storage.getProduct(activeProductId);
                if (p) BarcodeService.downloadBarcode(p, 'png');
            };
            
            const btnSvg = document.getElementById('btn-download-barcode-svg');
            if (btnSvg) btnSvg.onclick = () => {
                const p = Storage.getProduct(activeProductId);
                if (p) BarcodeService.downloadBarcode(p, 'svg');
            };
            
            const btnPrint = document.getElementById('btn-print-barcode-label');
            if (btnPrint) btnPrint.onclick = () => {
                const p = Storage.getProduct(activeProductId);
                if (p) BarcodeService.printBarcode(p);
            };

            const nameEl = document.getElementById('barcode-modal-prod-name');
            const metaEl = document.getElementById('barcode-modal-prod-meta');
            if (nameEl) nameEl.textContent = product.productName;
            if (metaEl) metaEl.textContent = `${Utils.formatCurrency(product.sellingRate)} / ${product.unit || 'pc'}`;

            if (typeof BarcodeService !== 'undefined' && typeof BarcodeService.render === 'function') {
                BarcodeService.render('#barcode-modal-svg', product.barcode, {
                    width: 2.2,
                    height: 75,
                    displayValue: true,
                    fontSize: 15
                });
            }

            openModal(showBarcodeModal);
        };
    }

    // 5. Scan Test
    const scanTestBtn = document.getElementById('btn-scan-test-barcode');
    if (scanTestBtn) {
        scanTestBtn.onclick = (e) => {
            if (e) e.preventDefault();
            if (typeof BarcodeScanner !== 'undefined') {
                BarcodeScanner.open((code, product) => {
                    if (product) {
                        Utils.showToast(`✓ Test Passed: Recognized "${product.productName}"`, "success");
                    } else {
                        Utils.showToast(`Scanned Code: ${code}`, "info");
                    }
                }, 'lookup');
            } else {
                Utils.showToast("Camera Scanner module not ready", "warning");
            }
        };
    }

    // Setup modal close buttons for details page modals
    setupAddStockModalListeners();
    setupStockAdjustmentModalListeners();
    setupAddProductModalListeners();
}

function handleDeleteProductAction(prodId) {
    const targetId = prodId || activeProductId;
    const product = Storage.getProduct(targetId);
    if (!product) {
        Utils.showToast("Product not found", "error");
        return;
    }

    Utils.confirm(
        "Delete Product Profile?",
        `Are you sure you want to delete "${product.productName}"? This action cannot be undone!`,
        () => {
            Storage.deleteProduct(targetId);
            Utils.showToast("Product deleted successfully", "success");
            setTimeout(() => { window.location.href = (window.BASE_PATH || '') + `pages/inventory/stock.html`; }, 800);
        }
    );
}

// --------------------------------------------------------------------------
// Modal Show/Hide Helpers & Global Escape Key Handler
// --------------------------------------------------------------------------
function openModal(modal) {
    if (!modal) return;
    Utils.openModal(modal);
}

function closeModal(modal) {
    if (!modal) return;
    Utils.closeModal(modal);
}

// Global escape key listener
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const pickerModal = document.getElementById('modal-custom-picker');
        if (pickerModal && pickerModal.classList.contains('active')) {
            closeModal(pickerModal);
            return;
        }

        const prodModal = document.getElementById('modal-product-edit');
        if (prodModal && prodModal.classList.contains('active')) {
            requestCloseProductModal();
            return;
        }

        const activeModals = document.querySelectorAll('.modal-overlay.active');
        if (activeModals.length > 0) {
            closeModal(activeModals[activeModals.length - 1]);
        }
    }
});

function showCustomPrompt(title, placeholder, onConfirm) {
    let overlay = document.getElementById('modal-custom-prompt');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modal-custom-prompt';
        overlay.style.zIndex = '2000'; // Ensure it is above other modals
        overlay.innerHTML = `
            <div class="modal-container" style="max-width: 320px; width: 90%; padding: 24px; margin: auto; border-radius: 12px; display: flex; flex-direction: column; gap: 16px; background: var(--bg-card, #fff);">
                <h3 class="modal-title" id="modal-custom-prompt-title" style="margin: 0; font-size: 18px; color: var(--text-main, #333);">${title}</h3>
                <input type="text" id="modal-custom-prompt-input" class="settings-form-control" placeholder="${placeholder}" autocomplete="off" style="width: 100%; padding: 10px; border: 1px solid var(--border, #ccc); border-radius: 8px;">
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
                    <button type="button" class="settings-btn-secondary" id="modal-custom-prompt-cancel" style="margin: 0;">Cancel</button>
                    <button type="button" class="settings-btn-primary" id="modal-custom-prompt-confirm" style="margin: 0;">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const cancelBtn = document.getElementById('modal-custom-prompt-cancel');
        const confirmBtn = document.getElementById('modal-custom-prompt-confirm');
        const input = document.getElementById('modal-custom-prompt-input');

        cancelBtn.addEventListener('click', () => {
            closeModal(overlay);
        });

        confirmBtn.addEventListener('click', () => {
            const val = input.value.trim();
            if (val) {
                closeModal(overlay);
                if (overlay._onConfirm) overlay._onConfirm(val);
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmBtn.click();
            }
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });
    } else {
        document.getElementById('modal-custom-prompt-title').textContent = title;
        document.getElementById('modal-custom-prompt-input').placeholder = placeholder;
    }

    const input = document.getElementById('modal-custom-prompt-input');
    input.value = '';
    overlay._onConfirm = onConfirm;
    
    if (typeof openModal === 'function') {
        openModal(overlay);
    } else {
        overlay.style.display = 'flex';
        overlay.classList.add('active');
    }
    
    setTimeout(() => {
        input.focus();
    }, 150);
}
