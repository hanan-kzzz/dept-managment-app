/**
 * Barcode Management Hub Logic — js/barcode-management.js
 * Manages inventory barcodes, bulk missing barcode generation, label exports, and multi-product printing.
 */

let barcodeFilter = 'all';
let barcodeSearchKeyword = '';
let selectedProductIds = new Set();
let activeModalProductId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'barcode-management') return;
    initBarcodeManagementPage();
});

function initBarcodeManagementPage() {
    renderBarcodeList();
    setupBarcodeManagementListeners();
}

function setupBarcodeManagementListeners() {
    const searchInput = document.getElementById('barcode-search-input');
    const clearBtn = document.getElementById('barcode-search-clear');

    // Search events
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            barcodeSearchKeyword = e.target.value.toLowerCase().trim();
            if (clearBtn) {
                clearBtn.style.display = barcodeSearchKeyword ? 'flex' : 'none';
            }
            renderBarcodeList();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            barcodeSearchKeyword = '';
            clearBtn.style.display = 'none';
            renderBarcodeList();
        });
    }

    // Segmented Filter Tabs
    const tabs = document.querySelectorAll('.filter-tab-seg');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            barcodeFilter = tab.dataset.filter;
            renderBarcodeList();
        });
    });

    // Bulk Generate Missing Barcodes
    const bulkGenBtn = document.getElementById('btn-bulk-generate-missing');
    if (bulkGenBtn) {
        bulkGenBtn.addEventListener('click', () => {
            const allProducts = Storage.getProducts();
            const missingCount = allProducts.filter(p => !BarcodeService.sanitize(p.barcode)).length;

            if (missingCount === 0) {
                Utils.showToast("All products already have barcodes assigned!", "info");
                return;
            }

            Utils.confirm(
                "Generate Missing Barcodes",
                `${missingCount} product(s) currently have no barcode. Generate unique barcodes for all of them?`,
                () => {
                    const result = BarcodeService.generateMissingBarcodes();
                    Utils.showToast(`✓ ${result.updatedCount} barcodes generated successfully!`, "success");
                    renderBarcodeList();
                }
            );
        });
    }

    // Select All Checkbox
    const selectAllCheckbox = document.getElementById('select-all-barcodes');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const visibleProducts = getFilteredProducts();
            if (e.target.checked) {
                visibleProducts.forEach(p => selectedProductIds.add(p.id));
            } else {
                visibleProducts.forEach(p => selectedProductIds.delete(p.id));
            }
            updateSelectionState();
            renderBarcodeList(false); // don't reset selection
        });
    }

    // Download Selected
    const downloadSelectedBtn = document.getElementById('btn-download-selected');
    if (downloadSelectedBtn) {
        downloadSelectedBtn.addEventListener('click', () => {
            const products = Storage.getProducts().filter(p => selectedProductIds.has(p.id));
            if (products.length === 0) return;

            let downloadCount = 0;
            products.forEach((prod, index) => {
                if (prod.barcode) {
                    setTimeout(() => {
                        BarcodeService.downloadBarcode(prod, 'png');
                    }, index * 250);
                    downloadCount++;
                }
            });

            if (downloadCount > 0) {
                Utils.showToast(`Downloading ${downloadCount} barcode label(s)...`, "info");
            } else {
                Utils.showToast("Selected products don't have barcodes yet.", "warning");
            }
        });
    }

    // Print Selected Multi-Sheet
    const printSelectedBtn = document.getElementById('btn-print-selected');
    if (printSelectedBtn) {
        printSelectedBtn.addEventListener('click', () => {
            const products = Storage.getProducts().filter(p => selectedProductIds.has(p.id) && p.barcode);
            if (products.length === 0) {
                Utils.showToast("Please select products with barcodes to print.", "warning");
                return;
            }
            printBatchBarcodes(products);
        });
    }

    // Modal Events
    const modal = document.getElementById('modal-show-barcode');
    document.getElementById('modal-show-barcode-close')?.addEventListener('click', () => closeModal(modal));
    
    document.getElementById('btn-download-barcode-png')?.addEventListener('click', () => {
        if (!activeModalProductId) return;
        const product = Storage.getProduct(activeModalProductId);
        if (product) BarcodeService.downloadBarcode(product, 'png');
    });

    document.getElementById('btn-download-barcode-svg')?.addEventListener('click', () => {
        if (!activeModalProductId) return;
        const product = Storage.getProduct(activeModalProductId);
        if (product) BarcodeService.downloadBarcode(product, 'svg');
    });

    document.getElementById('btn-print-barcode-label')?.addEventListener('click', () => {
        if (!activeModalProductId) return;
        const product = Storage.getProduct(activeModalProductId);
        if (product) BarcodeService.printBarcode(product);
    });
}

function getFilteredProducts() {
    const allProducts = Storage.getProducts();
    let filtered = [...allProducts];

    // Search query
    if (barcodeSearchKeyword) {
        filtered = filtered.filter(p =>
            p.productName.toLowerCase().includes(barcodeSearchKeyword) ||
            (p.sku && p.sku.toLowerCase().includes(barcodeSearchKeyword)) ||
            (p.barcode && p.barcode.toLowerCase().includes(barcodeSearchKeyword))
        );
    }

    // Status tabs
    if (barcodeFilter === 'with_barcode') {
        filtered = filtered.filter(p => !!BarcodeService.sanitize(p.barcode));
    } else if (barcodeFilter === 'without_barcode') {
        filtered = filtered.filter(p => !BarcodeService.sanitize(p.barcode));
    }

    // Sort alphabetically
    filtered.sort((a, b) => a.productName.localeCompare(b.productName));

    return filtered;
}

function renderBarcodeList(updateCounts = true) {
    const listFeed = document.getElementById('barcode-products-feed');
    if (!listFeed) return;

    const allProducts = Storage.getProducts();
    const withCount = allProducts.filter(p => !!BarcodeService.sanitize(p.barcode)).length;
    const withoutCount = allProducts.length - withCount;

    // Update Tab Counters with Status Indicators
    if (updateCounts) {
        const tabAll = document.getElementById('tab-b-all');
        const tabWith = document.getElementById('tab-b-with');
        const tabWithout = document.getElementById('tab-b-without');

        if (tabAll) tabAll.textContent = `All ${allProducts.length}`;
        if (tabWith) tabWith.textContent = `With Barcode ${withCount}`;
        if (tabWithout) {
            if (withoutCount === 0) {
                tabWithout.innerHTML = `Without Barcode <span style="display: inline-flex; align-items: center; gap: 3px; background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 1px 6px; border-radius: 10px; font-size: 0.72rem; margin-left: 4px;">0 ✓</span>`;
            } else {
                tabWithout.innerHTML = `Without Barcode <span style="display: inline-flex; align-items: center; gap: 3px; background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 1px 6px; border-radius: 10px; font-size: 0.72rem; margin-left: 4px;">${withoutCount} ⚠️</span>`;
            }
        }
    }

    const filtered = getFilteredProducts();

    if (filtered.length === 0) {
        listFeed.innerHTML = `
            <div class="empty-state" style="background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-md); padding: 32px 20px; text-align: center;">
                <div class="empty-state-icon"><i data-lucide="barcode"></i></div>
                <h3 class="empty-state-title" style="margin-top: 8px;">No products found</h3>
                <p class="empty-state-text">No products match the selected barcode filter or search criteria.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        updateSelectionState();
        return;
    }

    listFeed.innerHTML = filtered.map(p => {
        const cleanCode = BarcodeService.sanitize(p.barcode);
        const hasBarcode = !!cleanCode;
        const isChecked = selectedProductIds.has(p.id);
        const isPrinted = p.printed !== false; // track print status

        const miniBarcodeGraphic = hasBarcode 
            ? `<div class="mini-barcode-graphic" style="display: inline-flex; align-items: center; height: 18px; gap: 1.5px; background: #FFFFFF; padding: 1px 4px; border-radius: 3px; flex-shrink: 0;">
                 <span style="width: 1.5px; height: 100%; background: #000;"></span>
                 <span style="width: 2.5px; height: 100%; background: #000;"></span>
                 <span style="width: 1.5px; height: 100%; background: transparent;"></span>
                 <span style="width: 2px; height: 100%; background: #000;"></span>
                 <span style="width: 1px; height: 100%; background: #000;"></span>
                 <span style="width: 3px; height: 100%; background: #000;"></span>
               </div>`
            : '';

        const printStatusTag = hasBarcode
            ? (isPrinted 
                ? `<span class="barcode-print-tag printed" style="font-size: 0.7rem; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 3px;">Printed ✓</span>`
                : `<span class="barcode-print-tag unprinted" style="font-size: 0.7rem; font-weight: 700; background: rgba(245, 158, 11, 0.15); color: #fbbf24; padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.3); display: inline-flex; align-items: center; gap: 3px;">Needs Print ⚡</span>`)
            : '';

        return `
            <div class="barcode-list-row" data-id="${p.id}" style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.15s;">
                <!-- Line 1: Checkbox, Product Name, Category & Price -->
                <div style="display: flex; align-items: flex-start; gap: 10px; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                        <input type="checkbox" class="prod-select-chk" data-id="${p.id}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer; flex-shrink: 0;">
                        <div style="min-width: 0;">
                            <div style="font-weight: 750; font-size: 0.9rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.productName}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${p.category || 'Groceries'} · SKU: ${p.sku || 'N/A'}</div>
                        </div>
                    </div>
                    <div style="font-weight: 800; font-size: 0.88rem; color: var(--accent); white-space: nowrap; text-align: right; flex-shrink: 0;">
                        ${Utils.formatCurrency(p.sellingRate)} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">/${p.unit}</span>
                    </div>
                </div>

                <!-- Line 2: Rendered Visual Barcode Graphic + Print Status Tag + Action Buttons -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 8px; border-top: 1px solid var(--border-light, rgba(255,255,255,0.06));">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0; cursor: pointer;" onclick="openBarcodeModal('${p.id}')">
                        ${hasBarcode 
                            ? `<div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.2); padding: 3px 8px; border-radius: 8px; border: 1px solid var(--border);">
                                 ${miniBarcodeGraphic}
                                 <span style="font-family: monospace; font-size: 0.78rem; font-weight: 700; color: var(--text); letter-spacing: 0.5px;">${cleanCode}</span>
                               </div>` 
                            : `<span class="barcode-code-pill none" style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">No barcode assigned</span>`}
                    </div>

                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        ${printStatusTag}
                        ${hasBarcode 
                            ? `<button type="button" class="btn btn-secondary btn-sm btn-view-single-barcode" data-id="${p.id}" style="min-height: 32px; padding: 0 10px; font-weight: 700; border-radius: 8px; font-size: 0.75rem;">
                                   <i data-lucide="eye" style="width: 13px; height: 13px;"></i> View
                               </button>` 
                            : `<button type="button" class="btn btn-primary btn-sm btn-gen-single-barcode" data-id="${p.id}" style="min-height: 32px; padding: 0 10px; font-weight: 700; border-radius: 8px; font-size: 0.75rem;">
                                   <i data-lucide="wand-sparkles" style="width: 13px; height: 13px;"></i> Generate
                               </button>`}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Bind item checkboxes
    listFeed.querySelectorAll('.prod-select-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const id = chk.dataset.id;
            if (e.target.checked) {
                selectedProductIds.add(id);
            } else {
                selectedProductIds.delete(id);
            }
            updateSelectionState();
        });
    });

    // Bind View Barcode buttons
    listFeed.querySelectorAll('.btn-view-single-barcode').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            openBarcodeModal(id);
        });
    });

    // Bind Generate Barcode buttons
    listFeed.querySelectorAll('.btn-gen-single-barcode').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const newCode = BarcodeService.generateUniqueBarcode('GROC');
            Storage.updateProduct(id, { barcode: newCode });
            Utils.showToast(`✓ Generated barcode: ${newCode}`, "success");
            renderBarcodeList();
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
    updateSelectionState();
}

function updateSelectionState() {
    const count = selectedProductIds.size;
    const countEl = document.getElementById('selected-barcodes-count');
    const dlBtn = document.getElementById('btn-download-selected');
    const prBtn = document.getElementById('btn-print-selected');
    const selectAllCheckbox = document.getElementById('select-all-barcodes');

    if (countEl) countEl.textContent = `(${count} selected)`;

    const hasSelection = count > 0;
    if (dlBtn) {
        dlBtn.disabled = !hasSelection;
        dlBtn.style.opacity = hasSelection ? '1' : '0.5';
    }
    if (prBtn) {
        prBtn.disabled = !hasSelection;
        prBtn.style.opacity = hasSelection ? '1' : '0.5';
    }

    const visible = getFilteredProducts();
    if (selectAllCheckbox && visible.length > 0) {
        const allVisibleSelected = visible.every(p => selectedProductIds.has(p.id));
        selectAllCheckbox.checked = allVisibleSelected;
    }
}

function openBarcodeModal(productId) {
    const product = Storage.getProduct(productId);
    if (!product) return;

    activeModalProductId = productId;
    const modal = document.getElementById('modal-show-barcode');
    if (!modal) return;

    document.getElementById('barcode-modal-prod-name').textContent = product.productName;
    const rateStr = Utils.formatCurrency(product.sellingRate);
    document.getElementById('barcode-modal-prod-meta').textContent = `${rateStr} / ${product.unit || 'pc'}`;

    BarcodeService.render('#barcode-modal-svg', product.barcode, {
        width: 2.2,
        height: 75,
        displayValue: true,
        fontSize: 15
    });

    openModal(modal);
}

function printBatchBarcodes(products) {
    let printFrame = document.getElementById('barcode-batch-print-iframe');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'barcode-batch-print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
    }

    const cardsHtml = products.map(product => {
        const cleanCode = BarcodeService.sanitize(product.barcode || product.sku);
        const rateStr = Utils.formatCurrency(product.sellingRate);
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        BarcodeService.render(tempSvg, cleanCode, {
            width: 1.8,
            height: 55,
            displayValue: true,
            fontSize: 12,
            margin: 6
        });
        const svgHtml = tempSvg.outerHTML;

        return `
            <div class="label-card">
                <div class="prod-name">${product.productName}</div>
                <div class="prod-meta">MRP: ${rateStr} / ${product.unit || 'pc'}</div>
                <div class="barcode-box">
                    ${svgHtml}
                </div>
            </div>
        `;
    }).join('');

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Barcodes (${products.length} Items)</title>
            <style>
                @page {
                    size: auto;
                    margin: 6mm;
                }
                body {
                    margin: 0;
                    padding: 8px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: #FFF;
                }
                .label-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(55mm, 1fr));
                    gap: 6mm;
                }
                .label-card {
                    padding: 8px;
                    border: 1px dashed #999;
                    border-radius: 4px;
                    text-align: center;
                    box-sizing: border-box;
                    page-break-inside: avoid;
                }
                .prod-name {
                    font-size: 12px;
                    font-weight: 800;
                    color: #000;
                    margin-bottom: 2px;
                    word-break: break-word;
                }
                .prod-meta {
                    font-size: 10px;
                    font-weight: 600;
                    color: #444;
                    margin-bottom: 4px;
                }
                .barcode-box svg {
                    max-width: 100%;
                    height: auto;
                }
            </style>
        </head>
        <body>
            <div class="label-grid">
                ${cardsHtml}
            </div>
            <script>
                window.onload = function() {
                    window.focus();
                    window.print();
                };
            </script>
        </body>
        </html>
    `);
    doc.close();
}

function openModal(modal) {
    if (!modal) return;
    Utils.openModal(modal);
}

function closeModal(modal) {
    if (!modal) return;
    Utils.closeModal(modal);
}
