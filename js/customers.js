/**
 * Customers & Credit Management Logic — js/customers.js
 * Handles Customer List, Search, Multi-Filter, Sorting, Customer Details,
 * Financial Ledger, Payment Collections (Unique IDs + Receipts), and WhatsApp Reminder Foundation.
 */

let currentFilter = 'all';
let currentSort = 'highest_due';
let searchKeyword = '';
let activeCustomerId = null;
let ledgerHistoryLimit = 25;
let activeReminderTemplate = 'standard';

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    if (page === 'customers') {
        initCustomersPage();
    } else if (page === 'customer-details') {
        initCustomerDetailsPage();
    }
});

// Helper for Initials
function setCustomerFilterTab(btn, filterType) {
    document.querySelectorAll('.filter-pill-btn').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    currentFilter = filterType;
    renderCustomersList();
}

function getInitials(name) {
    if (!name) return 'CU';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'CU';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ==========================================
// 1. CUSTOMER LIST PAGE
// ==========================================
function initCustomersPage() {
    if (typeof Utils !== 'undefined' && Utils.initAppLayout) {
        Utils.initAppLayout('customers');
    }
    renderCustomersList();

    const searchInput = document.getElementById('customer-search');
    const clearBtn = document.getElementById('search-clear-trigger');
    const sortSelect = document.getElementById('customer-sort-select');

    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchKeyword = e.target.value.toLowerCase().trim();
            if (clearBtn) {
                clearBtn.style.display = searchKeyword ? 'flex' : 'none';
            }
            renderCustomersList();
        });
    }

    // Clear search trigger
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            searchKeyword = '';
            clearBtn.style.display = 'none';
            renderCustomersList();
        });
    }

    // Sort selector
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderCustomersList();
        });
    }

    // Filter Pills Tabs
    const filterPills = document.querySelectorAll('.filter-pill-btn');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.dataset.filter;
            renderCustomersList();
        });
    });

    // Header Add Customer button
    const addCustHeaderBtn = document.getElementById('btn-add-customer-header');
    if (addCustHeaderBtn) {
        addCustHeaderBtn.addEventListener('click', () => {
            openAddCustomerModal();
        });
    }

    // Check query params to auto open add modal
    const params = new URLSearchParams(window.location.search);
    if (params.get('openAdd') === 'true') {
        openAddCustomerModal();
    }

    // Add / Edit Modal Events
    const custEditModal = document.getElementById('modal-customer-edit');
    document.getElementById('modal-cust-edit-close')?.addEventListener('click', () => closeModal(custEditModal));
    document.getElementById('btn-cust-edit-cancel')?.addEventListener('click', () => closeModal(custEditModal));
    document.getElementById('form-customer-edit')?.addEventListener('submit', handleCustomerFormSubmit);

    // Record Payment Modal Events (if modal exists on list page)
    setupPaymentModalListeners();
}

function openAddCustomerModal() {
    const modal = document.getElementById('modal-customer-edit');
    if (!modal) return;

    document.getElementById('modal-cust-title').textContent = 'Add New Customer';
    document.getElementById('edit-cust-id').value = '';
    
    const nameInput = document.getElementById('edit-cust-name');
    const phoneInput = document.getElementById('edit-cust-phone');
    const addressInput = document.getElementById('edit-cust-address');
    const notesInput = document.getElementById('edit-cust-notes');
    const dueGroup = document.getElementById('edit-opening-due-group');
    const dupAlert = document.getElementById('duplicate-customer-alert');

    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (addressInput) addressInput.value = '';
    if (notesInput) notesInput.value = '';
    if (dueGroup) dueGroup.style.display = 'block';
    if (dupAlert) dupAlert.style.display = 'none';

    openModal(modal);
}

function renderCustomersList() {
    const listFeed = document.getElementById('customers-list-feed');
    if (!listFeed) return;

    let allCustomers = Storage.getCustomers();
    if (!allCustomers || allCustomers.length === 0) {
        if (typeof Storage.loadDemoData === 'function') {
            Storage.loadDemoData();
            allCustomers = Storage.getCustomers();
        }
    }

    // Compute metrics & financials for all customers
    let totalOutstanding = 0;
    let dueCount = 0;
    let overdueCount = 0;
    let noDueCount = 0;

    const customerRows = allCustomers.map(c => {
        const fin = Storage.calculateCustomerFinancials(c);
        if (fin.currentDue > 0) {
            totalOutstanding += fin.currentDue;
            dueCount++;
            if (fin.isOverdue) {
                overdueCount++;
            }
        } else {
            noDueCount++;
        }
        return { customer: c, fin };
    });

    // Update Top Summary Cards
    const sumOutEl = document.getElementById('sum-total-outstanding');
    const sumDueCountEl = document.getElementById('sum-due-customers-count');
    const sumOverdueCountEl = document.getElementById('sum-overdue-customers-count');

    if (sumOutEl) sumOutEl.textContent = Utils.formatCurrency(totalOutstanding);
    if (sumDueCountEl) sumDueCountEl.textContent = dueCount;
    if (sumOverdueCountEl) sumOverdueCountEl.textContent = overdueCount;

    // Update Filter Pill Counters
    const tabAll = document.getElementById('tab-c-all');
    const tabDue = document.getElementById('tab-c-due');
    const tabOverdue = document.getElementById('tab-c-overdue');
    const tabZero = document.getElementById('tab-c-zero');

    if (tabAll) tabAll.textContent = allCustomers.length;
    if (tabDue) tabDue.textContent = dueCount;
    if (tabOverdue) tabOverdue.textContent = overdueCount;
    if (tabZero) tabZero.textContent = noDueCount;

    // Filter
    let filtered = customerRows;

    if (searchKeyword) {
        filtered = filtered.filter(item =>
            item.customer.name.toLowerCase().includes(searchKeyword) ||
            item.customer.phone.includes(searchKeyword)
        );
    }

    if (currentFilter === 'due') {
        filtered = filtered.filter(item => item.fin.currentDue > 0);
    } else if (currentFilter === 'overdue') {
        filtered = filtered.filter(item => item.fin.isOverdue && item.fin.currentDue > 0);
    } else if (currentFilter === 'zero') {
        filtered = filtered.filter(item => item.fin.currentDue <= 0.001);
    }

    // Sort
    filtered.sort((a, b) => {
        if (currentSort === 'highest_due') {
            return b.fin.currentDue - a.fin.currentDue;
        } else if (currentSort === 'name_asc') {
            return a.customer.name.localeCompare(b.customer.name);
        } else if (currentSort === 'oldest_due') {
            const dateA = a.fin.overdueDate ? new Date(a.fin.overdueDate) : new Date(8640000000000000);
            const dateB = b.fin.overdueDate ? new Date(b.fin.overdueDate) : new Date(8640000000000000);
            return dateA - dateB;
        } else if (currentSort === 'recently_active') {
            const dateA = a.fin.lastTransactionDate ? new Date(a.fin.lastTransactionDate) : new Date(0);
            const dateB = b.fin.lastTransactionDate ? new Date(b.fin.lastTransactionDate) : new Date(0);
            return dateB - dateA;
        }
        return 0;
    });

    if (filtered.length === 0) {
        listFeed.innerHTML = `
            <div class="empty-state" style="background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-lg); padding: 40px 20px; text-align: center;">
                <div class="empty-state-icon" style="width: 52px; height: 52px; background: var(--surface-sec); margin: 0 auto 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
                    <i data-lucide="users" style="width: 26px; height: 26px;"></i>
                </div>
                <h3 class="empty-state-title" style="margin-top: 4px; font-weight: 800; font-size: 1.05rem;">No Customers Found</h3>
                <p class="empty-state-text" style="font-size: 0.82rem; color: var(--text-muted); max-width: 280px; margin: 4px auto 0;">No customer records match your active search or filter criteria.</p>
                <div style="margin-top: 16px;">
                    <button type="button" class="btn btn-primary btn-sm" id="btn-empty-add-cust" style="height: 38px; padding: 0 18px; font-weight: 700; border-radius: var(--radius-btn);">
                        <i data-lucide="user-plus"></i> + Add Customer
                    </button>
                </div>
            </div>
        `;
        document.getElementById('btn-empty-add-cust')?.addEventListener('click', openAddCustomerModal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    listFeed.innerHTML = filtered.map(item => {
        const c = item.customer;
        const fin = item.fin;
        const initials = getInitials(c.name);

        let avatarClass = 'avatar-paid';
        let statusPillClass = 'status-pill-paid';
        let statusLabel = 'Settled';

        if (fin.status === 'OVERDUE') {
            avatarClass = 'avatar-overdue';
            statusPillClass = 'status-pill-overdue';
            statusLabel = `${fin.daysOverdue || 3}D OVERDUE`;
        } else if (fin.status === 'DUE') {
            avatarClass = 'avatar-due';
            statusPillClass = 'status-pill-due';
            statusLabel = 'DUE';
        } else if (fin.status === 'PARTIAL') {
            avatarClass = 'avatar-primary';
            statusPillClass = 'status-pill-partial';
            statusLabel = 'PARTIAL';
        } else {
            statusLabel = 'SETTLED';
        }

        const dueValStr = fin.currentDue > 0 ? Utils.formatCurrency(fin.currentDue) : 'No Due';
        const dueColor = fin.isOverdue ? 'color: #F87171;' : (fin.currentDue > 0 ? 'color: #FBBF24;' : 'color: #32D583;');

        return `
            <div class="customer-modern-card" data-id="${c.id}">
                <div class="customer-card-left">
                    <div class="customer-avatar ${avatarClass}">
                        ${initials}
                    </div>
                    <div class="customer-info-col">
                        <div class="customer-title-row">
                            <span class="customer-name-txt">${c.name}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span class="customer-phone-meta">
                                <i data-lucide="phone" style="width: 11px; height: 11px; color: #8E9BAE;"></i> ${c.phone}
                            </span>
                        </div>
                        <div style="margin-top: 2px;">
                            <span class="status-pill-modern ${statusPillClass}">
                                <span class="status-dot"></span>
                                ${statusLabel}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="customer-card-right">
                    <div class="customer-amount-val tabular-nums" style="${dueColor}">${dueValStr}</div>
                    <div class="customer-card-action">
                        <span>Profile</span>
                        <i data-lucide="chevron-right" style="width: 13px; height: 13px; stroke-width: 2.5px;"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Bind card clicks -> navigate to customer details
    listFeed.querySelectorAll('.customer-modern-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            window.location.href = `customer-details.html?id=${id}`;
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleCustomerFormSubmit(e) {
    e.preventDefault();
    const modal = document.getElementById('modal-customer-edit');
    const id = document.getElementById('edit-cust-id').value;
    const nameEl = document.getElementById('edit-cust-name');
    const phoneEl = document.getElementById('edit-cust-phone');
    const addressEl = document.getElementById('edit-cust-address');
    const notesEl = document.getElementById('edit-cust-notes');
    const openingDueEl = document.getElementById('edit-cust-opening-due');
    const dupAlert = document.getElementById('duplicate-customer-alert');
    const phoneFeedback = document.getElementById('edit-cust-phone-feedback');

    let isValid = true;

    // Validate Name
    if (!nameEl.value.trim()) {
        nameEl.classList.add('is-invalid');
        isValid = false;
    } else {
        nameEl.classList.remove('is-invalid');
    }

    // Validate Phone
    const phoneVal = phoneEl.value.trim();
    if (!Utils.validatePhone(phoneVal)) {
        phoneEl.classList.add('is-invalid');
        if (phoneFeedback) phoneFeedback.textContent = "Enter a valid 10-15 digit phone number.";
        isValid = false;
    } else {
        phoneEl.classList.remove('is-invalid');
    }

    // Prevent duplicate phone numbers
    const existing = Storage.getCustomerByPhone(phoneVal, id || null);
    if (existing) {
        phoneEl.classList.add('is-invalid');
        if (dupAlert) {
            dupAlert.style.display = 'block';
            const viewBtn = document.getElementById('btn-view-duplicate-customer');
            if (viewBtn) {
                viewBtn.onclick = () => {
                    window.location.href = `customer-details.html?id=${existing.id}`;
                };
            }
        }
        Utils.showToast("A customer with this phone number already exists.", "error");
        return;
    } else {
        if (dupAlert) dupAlert.style.display = 'none';
    }

    if (!isValid) return;

    if (id) {
        // Edit Mode
        const limitEl = document.getElementById('edit-cust-limit');
        Storage.updateCustomer(id, {
            name: nameEl.value.trim(),
            phone: phoneVal,
            address: addressEl ? addressEl.value.trim() : '',
            notes: notesEl ? notesEl.value.trim() : '',
            creditLimit: limitEl ? parseFloat(limitEl.value) : 10000
        });
        Utils.showToast("Customer profile updated", "success");
    } else {
        // Create Mode
        const openingDue = openingDueEl ? (parseFloat(openingDueEl.value) || 0) : 0;
        const newCustomer = {
            name: nameEl.value.trim(),
            phone: phoneVal,
            address: addressEl ? addressEl.value.trim() : '',
            openingDue: openingDue,
            currentDue: openingDue,
            creditLimit: 10000,
            notes: notesEl ? notesEl.value.trim() : ''
        };
        const saved = Storage.saveCustomer(newCustomer);
        Utils.showToast("Customer added successfully", "success");

        // If on New Sale page, preselect this customer
        const params = new URLSearchParams(window.location.search);
        if (params.get('returnToSale') === 'true') {
            window.location.href = `sales.html?customerId=${saved.id}`;
            return;
        }
    }

    closeModal(modal);

    if (document.body.dataset.page === 'customer-details') {
        loadCustomerProfileDetails();
    } else {
        renderCustomersList();
    }
}

// ==========================================
// 2. CUSTOMER DETAILS PAGE
// ==========================================
function initCustomerDetailsPage() {
    if (typeof Utils !== 'undefined' && Utils.initAppLayout) {
        Utils.initAppLayout('customers');
    }

    const params = new URLSearchParams(window.location.search);
    activeCustomerId = params.get('id');

    if (!activeCustomerId) {
        window.location.href = 'customers.html';
        return;
    }

    loadCustomerProfileDetails();
    setupDetailsEventListeners();
    setupPaymentModalListeners();
    setupReminderModalListeners();
}

function loadCustomerProfileDetails() {
    const customer = Storage.getCustomer(activeCustomerId);
    if (!customer) {
        Utils.showToast("Customer profile not found", "error");
        setTimeout(() => { window.location.href = 'customers.html'; }, 1500);
        return;
    }

    const fin = Storage.calculateCustomerFinancials(customer);

    // Circular Avatar with soft glow
    // Circular Avatar with standardized gradient colors tied to status
    const avatarBadge = document.getElementById('prof-avatar-badge');
    if (avatarBadge) {
        avatarBadge.textContent = getInitials(customer.name);
        const avatarClass = fin.status === 'OVERDUE' 
            ? 'profile-avatar-circular avatar-overdue' 
            : (fin.currentDue > 0 ? 'profile-avatar-circular avatar-due-amber' : 'profile-avatar-circular avatar-settled');
        avatarBadge.className = avatarClass;
    }

    // Name & Phone
    document.getElementById('prof-name').textContent = customer.name;
    document.getElementById('prof-phone').textContent = customer.phone;
    document.getElementById('prof-phone-link').href = `tel:${customer.phone}`;

    // Due Status Badge - Unified color family
    const statusBadge = document.getElementById('prof-due-status-badge');
    if (statusBadge) {
        let pillClass = 'status-pill-paid';
        let label = 'Settled';
        if (fin.status === 'OVERDUE') {
            pillClass = 'status-pill-overdue';
            label = `${fin.daysOverdue || 3}D OVERDUE`;
        } else if (fin.currentDue > 0) {
            pillClass = 'status-pill-due';
            label = 'HAS DUE';
        }
        statusBadge.className = `status-pill-modern ${pillClass}`;
        statusBadge.innerHTML = `<span class="status-dot"></span> ${label}`;
    }

    // Outstanding Due Box - Soft Tint Card
    const dueContainer = document.getElementById('prof-due-container');
    const dueEl = document.getElementById('prof-due');
    dueEl.textContent = Utils.formatCurrency(fin.currentDue);
    
    if (dueContainer) {
        dueContainer.classList.remove('card-overdue', 'card-settled');
        if (fin.isOverdue) {
            dueContainer.classList.add('card-overdue');
            dueEl.style.color = 'var(--danger)';
        } else if (fin.currentDue > 0) {
            dueEl.style.color = 'var(--warning)';
        } else {
            dueContainer.classList.add('card-settled');
            dueEl.style.color = 'var(--success)';
        }
    }

    const overdueSubtitle = document.getElementById('prof-overdue-subtitle');
    const overdueDateStr = document.getElementById('prof-overdue-date-str');
    if (overdueSubtitle && overdueDateStr) {
        if (fin.isOverdue && fin.overdueDate) {
            const formattedDate = Utils.formatDate(fin.overdueDate);
            overdueDateStr.textContent = `${formattedDate} (${fin.daysOverdue || 3} days overdue).`;
            overdueSubtitle.style.display = 'inline-flex';
        } else {
            overdueSubtitle.style.display = 'none';
        }
    }

    // Financial Metrics 3-Grid
    document.getElementById('prof-total-purchases').textContent = Utils.formatCurrency(fin.totalPurchases);
    
    const paidEl = document.getElementById('prof-total-paid');
    paidEl.textContent = Utils.formatCurrency(fin.totalPaid);
    if (fin.totalPaid > 0) {
        paidEl.className = 'mini-stat-val mini-stat-val paid-green tabular-nums';
    } else {
        paidEl.className = 'mini-stat-val tabular-nums';
    }

    document.getElementById('prof-last-active').textContent = fin.lastTransactionDate ? Utils.formatDate(fin.lastTransactionDate) : '-';

    // Credit Limit & Details
    document.getElementById('prof-limit').textContent = Utils.formatCurrency(customer.creditLimit || 5000);

    // Optional address & notes
    const addressSec = document.getElementById('prof-address-section');
    if (customer.address && customer.address.trim()) {
        document.getElementById('prof-address').textContent = customer.address;
        addressSec.style.display = 'flex';
    } else {
        addressSec.style.display = 'none';
    }

    const notesSec = document.getElementById('prof-notes-section');
    if (customer.notes && customer.notes.trim()) {
        document.getElementById('prof-notes').textContent = customer.notes;
        notesSec.style.display = 'flex';
    } else {
        notesSec.style.display = 'none';
    }

    // Ledger history
    renderLedger(customer.transactions || []);

    // Reminder history
    renderReminderHistory(customer.id);
}

function renderReminderHistory(customerId) {
    const feed = document.getElementById('reminder-history-feed');
    const countPill = document.getElementById('reminder-count-pill');
    if (!feed) return;

    const reminders = Storage.getRemindersForCustomer(customerId);
    if (countPill) countPill.textContent = `${reminders.length} Reminders`;

    if (reminders.length === 0) {
        feed.innerHTML = `
            <div class="empty-state" style="padding: 24px 16px; text-align: center;">
                <p class="empty-state-text" style="font-size: 0.82rem; color: var(--text-muted); margin: 0;">No reminder history recorded for this customer</p>
            </div>
        `;
        return;
    }

    feed.innerHTML = reminders.map((r, index) => {
        const timeStr = Utils.formatDateTime(r.sentAt || r.createdAt);
        let statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; background: var(--success-bg, rgba(50, 213, 131, 0.12)); color: var(--success, #32D583); padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(50, 213, 131, 0.25);">Sent</span>`;
        if (r.status === 'Prepared') {
            statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; background: var(--primary-tint, rgba(8, 127, 245, 0.12)); color: var(--primary, #087FF5); padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(8, 127, 245, 0.25);">Prepared</span>`;
        } else if (r.status === 'Failed') {
            statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; background: var(--danger-bg, rgba(239, 68, 68, 0.12)); color: var(--danger, #EF4444); padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.25);">Failed</span>`;
        }

        const tplName = r.templateType === 'overdue' ? 'Overdue Alert' : (r.templateType === 'friendly' ? 'Friendly Note' : 'Standard Due');
        const bubbleId = `rem-msg-bubble-${index}`;

        return `
            <div class="rem-history-card">
                <div class="rem-history-header">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <i data-lucide="message-circle" style="width: 15px; height: 15px; color: #25D366;"></i>
                        <strong class="rem-history-title">${tplName}</strong>
                    </div>
                    <div>${statusBadge}</div>
                </div>
                <div class="rem-history-meta">
                    ${timeStr} · Phone: ${r.phone || '-'} · Amount: ${Utils.formatCurrency(r.amountDue || 0)}
                </div>
                <div class="rem-history-bubble" id="${bubbleId}">
                    ${r.message}
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderLedger(transactions) {
    const ledgerFeed = document.getElementById('ledger-list-feed');
    const countPill = document.getElementById('ledger-count-pill');
    if (!ledgerFeed) return;

    if (countPill) countPill.textContent = `${transactions.length} Entries`;

    if (transactions.length === 0) {
        ledgerFeed.innerHTML = `
            <div class="empty-state" style="padding: 30px 0; text-align: center;">
                <div class="empty-state-icon" style="width: 44px; height: 44px; background: rgba(255, 255, 255, 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: #8E9BAE;">
                    <i data-lucide="history"></i>
                </div>
                <h4 style="margin-top: 4px; font-weight: 700; color: #F8FAFC;">No Transactions Recorded</h4>
                <p class="empty-state-text" style="font-size: 0.8rem; color: #8E9BAE;">Purchases and payment collections will appear in this ledger.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    const sortedTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const limitedTx = sortedTx.slice(0, ledgerHistoryLimit);

    // Group transactions by uppercase date
    const groups = {};
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    limitedTx.forEach(tx => {
        const txDate = new Date(tx.date);
        const txDateStr = txDate.toDateString();
        let groupTitle = '';

        if (txDateStr === todayStr) {
            groupTitle = 'TODAY';
        } else if (txDateStr === yesterdayStr) {
            groupTitle = 'YESTERDAY';
        } else {
            groupTitle = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
        }

        if (!groups[groupTitle]) {
            groups[groupTitle] = [];
        }
        groups[groupTitle].push(tx);
    });

    let html = '';
    for (const [title, txs] of Object.entries(groups)) {
        html += `
            <div class="ledger-date-group-label">${title}</div>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
        `;
        html += txs.map(tx => {
            const isPurchase = tx.type === 'Purchase' || tx.type === 'Credit Purchase' || tx.type === 'SALE';
            const amountFormatted = Utils.formatCurrency(tx.amount);
            const amtStr = isPurchase ? `+${amountFormatted}` : `-${amountFormatted}`;
            const amtColor = isPurchase ? 'color: #F87171;' : 'color: #32D583;';
            const noteText = tx.note || '';
            const invNum = tx.invoiceNumber || (tx.saleId ? `INV_${tx.saleId.slice(-6).toUpperCase()}` : '');
            const payNum = tx.paymentNumber || '';

            return `
                <div class="ledger-row-statement">
                    <div style="display: flex; flex-direction: column; gap: 3px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <strong style="color: #F8FAFC; font-weight: 800; font-size: 0.88rem;">${tx.type === 'Credit Purchase' || tx.type === 'SALE' ? 'Purchase' : tx.type}</strong>
                            ${invNum ? `<span class="invoice-chip-tag">${invNum}</span>` : ''}
                            ${payNum ? `<span class="payment-chip-tag">${payNum}</span>` : ''}
                        </div>
                        ${noteText ? `<span style="font-size: 0.74rem; color: #8E9BAE;">${noteText}</span>` : ''}
                        ${tx.dueDate ? `<span style="font-size: 0.71rem; color: #94A3B8;"><i data-lucide="calendar-days" style="width: 10px; height: 10px; display: inline;"></i> Due Date: ${Utils.formatDate(tx.dueDate)}</span>` : ''}
                    </div>
                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <div>
                            <span class="tabular-nums" style="font-weight: 800; font-size: 0.95rem; ${amtColor}">${amtStr}</span>
                            <div style="font-size: 0.7rem; color: #8E9BAE; margin-top: 1px;" class="tabular-nums">Bal: ${Utils.formatCurrency(tx.currentDue)}</div>
                        </div>
                        ${(tx.saleId || tx.invoiceNumber) ? `
                            <button type="button" class="btn-glass-secondary btn-view-customer-bill" data-ref="${tx.saleId || tx.invoiceNumber}" style="height: 26px; font-size: 0.72rem; padding: 0 10px; border-radius: 8px; font-weight: 700;">
                                <i data-lucide="receipt" style="width: 12px; height: 12px;"></i> View Bill
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        html += `</div>`;
    }

    if (sortedTx.length > ledgerHistoryLimit) {
        html += `
            <div style="padding: 12px 0; text-align: center;">
                <button class="btn-glass-secondary" id="btn-expand-history" style="width: auto; height: 36px; padding: 0 20px; font-size: 0.78rem; font-weight: 700;">
                    View Full History (${sortedTx.length} items)
                </button>
            </div>
        `;
    }

    ledgerFeed.innerHTML = html;

    // View bill buttons
    ledgerFeed.querySelectorAll('.btn-view-customer-bill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const ref = btn.dataset.ref;
            Utils.showBillModal(ref);
        });
    });

    const expandBtn = document.getElementById('btn-expand-history');
    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            ledgerHistoryLimit = sortedTx.length;
            renderLedger(transactions);
        });
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function setupDetailsEventListeners() {
    const editModal = document.getElementById('modal-customer-edit');

    // New Sale POS shortcut
    const saleLink = document.getElementById('btn-new-sale-link');
    if (saleLink) {
        saleLink.href = `sales.html?customerId=${activeCustomerId}&openNewSale=true`;
    }

    // Edit Profile Modal
    document.getElementById('btn-edit-customer')?.addEventListener('click', (e) => {
        e.preventDefault();
        const customer = Storage.getCustomer(activeCustomerId);
        if (customer) {
            const modalTitle = document.getElementById('modal-cust-title');
            if (modalTitle) modalTitle.textContent = 'Edit Customer Profile';

            const idInput = document.getElementById('edit-cust-id');
            if (idInput) idInput.value = customer.id;

            const nameInput = document.getElementById('edit-cust-name');
            if (nameInput) nameInput.value = customer.name;

            const phoneInput = document.getElementById('edit-cust-phone');
            if (phoneInput) phoneInput.value = customer.phone;

            const addrInput = document.getElementById('edit-cust-address');
            if (addrInput) addrInput.value = customer.address || '';

            const limitInput = document.getElementById('edit-cust-limit');
            if (limitInput) limitInput.value = customer.creditLimit || 10000;

            const notesInput = document.getElementById('edit-cust-notes');
            if (notesInput) notesInput.value = customer.notes || '';
            
            const dueGroup = document.getElementById('edit-opening-due-group');
            if (dueGroup) dueGroup.style.display = 'none';
            
            const dupAlert = document.getElementById('duplicate-customer-alert');
            if (dupAlert) dupAlert.style.display = 'none';
        }
        openModal(editModal);
    });

    document.getElementById('modal-cust-edit-close')?.addEventListener('click', () => closeModal(editModal));
    document.getElementById('btn-cust-edit-cancel')?.addEventListener('click', () => closeModal(editModal));
    document.getElementById('form-customer-edit')?.addEventListener('submit', handleCustomerFormSubmit);

    // Delete Customer
    document.getElementById('btn-delete-customer')?.addEventListener('click', (e) => {
        e.preventDefault();
        const customer = Storage.getCustomer(activeCustomerId);
        if (!customer) return;

        Utils.confirm(
            "Delete Customer Profile?",
            `Are you sure you want to delete "${customer.name}"? This action will remove their account and outstanding ledger history permanently!`,
            () => {
                Storage.deleteCustomer(activeCustomerId);
                Utils.showToast("Customer profile deleted successfully", "success");
                setTimeout(() => { window.location.href = 'customers.html'; }, 1000);
            }
        );
    });
}

// ==========================================
// 3. RECORD PAYMENT WORKFLOW & RECEIPT
// ==========================================
let activePaymentReceipt = null;

function setupPaymentModalListeners() {
    const paymentModal = document.getElementById('modal-record-payment');
    const receiptModal = document.getElementById('modal-payment-receipt');
    if (!paymentModal) return;

    // Trigger buttons (from profile or header)
    const recordPayBtn = document.getElementById('btn-record-payment-local');
    if (recordPayBtn) {
        recordPayBtn.addEventListener('click', () => {
            openRecordPaymentDialog(activeCustomerId);
        });
    }

    // Payment Method Selector Toggles
    const methodBtns = paymentModal.querySelectorAll('.btn-pay-method');
    const methodHiddenInput = document.getElementById('payment-method-value');
    methodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            methodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (methodHiddenInput) methodHiddenInput.value = btn.dataset.method;
        });
    });

    // Close buttons
    document.getElementById('modal-payment-close')?.addEventListener('click', () => closeModal(paymentModal));
    document.getElementById('btn-payment-cancel')?.addEventListener('click', () => closeModal(paymentModal));

    // Form submit with double-tap protection
    document.getElementById('form-record-payment')?.addEventListener('submit', handleRecordPaymentSubmit);

    // Receipt Modal Buttons
    document.getElementById('modal-receipt-close')?.addEventListener('click', () => closeModal(receiptModal));
    document.getElementById('btn-receipt-done')?.addEventListener('click', () => closeModal(receiptModal));

    document.getElementById('btn-share-receipt')?.addEventListener('click', () => {
        if (!activePaymentReceipt) return;
        sharePaymentReceipt(activePaymentReceipt);
    });

    document.getElementById('btn-print-receipt')?.addEventListener('click', () => {
        if (!activePaymentReceipt) return;
        printPaymentReceipt(activePaymentReceipt);
    });
}

function openRecordPaymentDialog(customerId) {
    const modal = document.getElementById('modal-record-payment');
    if (!modal) return;

    const customer = Storage.getCustomer(customerId);
    if (!customer) {
        Utils.showToast("Customer not found", "error");
        return;
    }

    const fin = Storage.calculateCustomerFinancials(customer);

    if (fin.currentDue <= 0) {
        Utils.showToast(`${customer.name} has no outstanding due balance!`, "info");
        return;
    }

    const custIdHidden = document.getElementById('payment-customer-id');
    if (custIdHidden) custIdHidden.value = customer.id;

    const custNameEl = document.getElementById('modal-pay-customer-name') || document.getElementById('payment-customer-name');
    if (custNameEl) custNameEl.textContent = customer.name;

    const dueValEl = document.getElementById('modal-pay-due-val') || document.getElementById('payment-due-val');
    if (dueValEl) dueValEl.textContent = Utils.formatCurrency(fin.currentDue);

    const amtInput = document.getElementById('payment-amount');
    if (amtInput) {
        amtInput.value = fin.currentDue;
        amtInput.max = fin.currentDue;
        amtInput.classList.remove('is-invalid');
    }

    const dateInput = document.getElementById('payment-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    const notesInput = document.getElementById('payment-notes');
    if (notesInput) notesInput.value = '';

    // Reset method to Cash
    const methodBtns = modal.querySelectorAll('.btn-pay-method');
    const methodHidden = document.getElementById('payment-method-value');
    methodBtns.forEach(b => b.classList.remove('active'));
    const cashBtn = modal.querySelector('.btn-pay-method[data-method="Cash"]');
    if (cashBtn) cashBtn.classList.add('active');
    if (methodHidden) methodHidden.value = 'Cash';

    // Enable submit button
    const submitBtn = document.getElementById('btn-payment-submit');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="check"></i> Record Payment';
    }

    openModal(modal);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleRecordPaymentSubmit(e) {
    e.preventDefault();
    const modal = document.getElementById('modal-record-payment');
    const submitBtn = document.getElementById('btn-payment-submit');
    const custId = document.getElementById('payment-customer-id')?.value || activeCustomerId;
    const amountEl = document.getElementById('payment-amount');
    const methodVal = document.getElementById('payment-method-value')?.value || 'Cash';
    const dateVal = document.getElementById('payment-date')?.value || null;
    const notesVal = document.getElementById('payment-notes')?.value || '';
    const feedbackEl = document.getElementById('payment-amount-feedback');

    const customer = Storage.getCustomer(custId);
    if (!customer) return;

    const fin = Storage.calculateCustomerFinancials(customer);
    const amount = parseFloat(amountEl.value);
    let isValid = true;

    if (isNaN(amount) || amount <= 0) {
        amountEl.classList.add('is-invalid');
        if (feedbackEl) feedbackEl.textContent = "Payment amount must be greater than zero.";
        isValid = false;
    } else if (amount > (fin.currentDue + 0.01)) {
        amountEl.classList.add('is-invalid');
        if (feedbackEl) feedbackEl.textContent = `Amount cannot exceed outstanding due of ${Utils.formatCurrency(fin.currentDue)}.`;
        isValid = false;
    } else {
        amountEl.classList.remove('is-invalid');
    }

    if (!isValid) return;

    // Double-tap prevention: disable submit button immediately
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Recording Payment...';
    }

    // Execute Payment Recording
    const paymentRecord = Storage.recordCustomerPayment(
        customer.id,
        amount,
        methodVal,
        notesVal.trim(),
        dateVal
    );

    if (!paymentRecord) {
        Utils.showToast("Failed to record payment. Please try again.", "error");
        if (submitBtn) submitBtn.disabled = false;
        return;
    }

    closeModal(modal);
    Utils.showToast(`✓ Payment of ${Utils.formatCurrency(amount)} recorded!`, "success");

    // Open Payment Receipt Success Modal
    openPaymentReceiptDialog(paymentRecord, customer);

    // Refresh underlying page
    if (document.body.dataset.page === 'customer-details') {
        loadCustomerProfileDetails();
    } else if (document.body.dataset.page === 'customers') {
        renderCustomersList();
    }
}

function openPaymentReceiptDialog(paymentRecord, customer) {
    activePaymentReceipt = { payment: paymentRecord, customer: customer };
    const receiptModal = document.getElementById('modal-payment-receipt');
    if (!receiptModal) return;

    document.getElementById('receipt-amount-display').textContent = Utils.formatCurrency(paymentRecord.amount);
    document.getElementById('receipt-payment-id').textContent = paymentRecord.paymentNumber;
    document.getElementById('receipt-customer-name').textContent = customer.name;
    document.getElementById('receipt-method').textContent = paymentRecord.paymentMethod;
    document.getElementById('receipt-date').textContent = Utils.formatDateTime(paymentRecord.date);
    document.getElementById('receipt-remaining-due').textContent = Utils.formatCurrency(paymentRecord.remainingDue);

    openModal(receiptModal);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function sharePaymentReceipt(data) {
    const { payment, customer } = data;
    const settings = Storage.getSettings();
    const receiptText = `*PAYMENT RECEIPT*\n------------------------\nShop: ${settings.shopName}\nPayment ID: ${payment.paymentNumber}\nCustomer: ${customer.name}\nAmount Received: ${settings.currency}${payment.amount}\nPayment Method: ${payment.paymentMethod}\nDate: ${Utils.formatDateTime(payment.date)}\nRemaining Due: ${settings.currency}${payment.remainingDue}\n------------------------\nThank you for your payment!`;

    if (navigator.share) {
        navigator.share({
            title: `Payment Receipt ${payment.paymentNumber}`,
            text: receiptText
        }).then(() => {
            Utils.showToast("Receipt shared successfully", "success");
        }).catch(() => {
            fallbackShareWhatsApp(customer.phone, receiptText);
        });
    } else {
        fallbackShareWhatsApp(customer.phone, receiptText);
    }
}

function printPaymentReceipt(data) {
    const { payment, customer } = data;
    const settings = Storage.getSettings();

    let printFrame = document.getElementById('payment-receipt-print-iframe');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'payment-receipt-print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
    }

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Receipt - ${payment.paymentNumber}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    margin: 0;
                    padding: 16px;
                    color: #000;
                    font-size: 13px;
                }
                .receipt-wrap {
                    max-width: 320px;
                    margin: 0 auto;
                    border: 1px dashed #666;
                    padding: 16px;
                    border-radius: 4px;
                }
                .shop-name {
                    font-size: 16px;
                    font-weight: 800;
                    text-align: center;
                    margin-bottom: 2px;
                }
                .receipt-title {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    text-align: center;
                    color: #555;
                    margin-bottom: 12px;
                }
                .divider {
                    border-top: 1px dashed #888;
                    margin: 10px 0;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                }
                .amount-box {
                    text-align: center;
                    padding: 10px 0;
                    font-size: 22px;
                    font-weight: 800;
                }
            </style>
        </head>
        <body>
            <div class="receipt-wrap">
                <div class="shop-name">${settings.shopName}</div>
                <div class="receipt-title">Payment Collection Receipt</div>
                <div class="divider"></div>
                <div class="row"><span>Payment ID:</span><strong>${payment.paymentNumber}</strong></div>
                <div class="row"><span>Customer:</span><strong>${customer.name}</strong></div>
                <div class="row"><span>Phone:</span><span>${customer.phone}</span></div>
                <div class="row"><span>Date:</span><span>${Utils.formatDateTime(payment.date)}</span></div>
                <div class="row"><span>Method:</span><span>${payment.paymentMethod}</span></div>
                <div class="divider"></div>
                <div class="amount-box">RECEIVED: ${settings.currency}${payment.amount}</div>
                <div class="divider"></div>
                <div class="row" style="font-weight:700;"><span>Remaining Due:</span><span>${settings.currency}${payment.remainingDue}</span></div>
                <div style="text-align:center; font-size:10px; margin-top:14px; color:#666;">${settings.billFooter}</div>
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

// ==========================================
// 4. WHATSAPP REMINDER FOUNDATION
// ==========================================
function setupReminderModalListeners() {
    const reminderModal = document.getElementById('modal-reminder-review');
    if (!reminderModal) return;

    // Trigger button
    document.getElementById('btn-send-reminder')?.addEventListener('click', () => {
        openReminderModal(activeCustomerId);
    });

    // Close buttons
    document.getElementById('modal-rem-close')?.addEventListener('click', () => closeModal(reminderModal));
    document.getElementById('btn-rem-cancel')?.addEventListener('click', () => closeModal(reminderModal));

    // Template Selector Tabs
    const tplBtns = reminderModal.querySelectorAll('.btn-rem-tpl');
    tplBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tplBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeReminderTemplate = btn.dataset.tpl;
            updateReminderMessageTemplate();
        });
    });

    // Live textarea input listener for character counter and WhatsApp bubble preview sync
    const textarea = document.getElementById('rem-message-text');
    if (textarea) {
        textarea.addEventListener('input', () => {
            syncReminderLivePreview();
        });
    }

    // Toggle WhatsApp Bubble Preview Accordion
    const bubbleToggle = document.getElementById('btn-toggle-bubble-preview');
    const bubbleWrap = document.getElementById('rem-bubble-wrap');
    if (bubbleToggle && bubbleWrap) {
        bubbleToggle.addEventListener('click', () => {
            const isHidden = bubbleWrap.classList.contains('hidden');
            if (isHidden) {
                bubbleWrap.classList.remove('hidden');
                bubbleToggle.classList.add('expanded');
            } else {
                bubbleWrap.classList.add('hidden');
                bubbleToggle.classList.remove('expanded');
            }
        });
    }

    // Share / Send via WhatsApp Button
    document.getElementById('btn-rem-share')?.addEventListener('click', () => {
        const text = document.getElementById('rem-message-text')?.value || '';
        const customer = Storage.getCustomer(activeCustomerId);
        if (!customer) return;

        const fin = Storage.calculateCustomerFinancials(customer);
        const reminderPayload = {
            isValid: true,
            customer: customer,
            phone: customer.phone,
            amountDue: fin.currentDue,
            dueDate: fin.overdueDate || customer.dueDate,
            templateType: activeReminderTemplate,
            message: text
        };

        if (typeof WhatsAppService !== 'undefined') {
            const result = WhatsAppService.sendReminder(reminderPayload);
            if (result.success) {
                Utils.showToast(result.message, "success");
                closeModal(reminderModal);
                renderReminderHistory(customer.id);
            } else {
                Utils.showToast(result.error || "Failed to send reminder.", "error");
            }
        } else {
            fallbackShareWhatsApp(customer.phone, text);
            closeModal(reminderModal);
        }
    });

    // Copy Button
    document.getElementById('btn-rem-copy')?.addEventListener('click', () => {
        const text = document.getElementById('rem-message-text')?.value || '';
        navigator.clipboard.writeText(text).then(() => {
            Utils.showToast("✓ Reminder message copied to clipboard", "success");
        });
    });
}

function openReminderModal(customerId) {
    const modal = document.getElementById('modal-reminder-review');
    if (!modal) return;

    const customer = Storage.getCustomer(customerId);
    if (!customer) return;

    const fin = Storage.calculateCustomerFinancials(customer);

    if (fin.currentDue <= 0) {
        Utils.showToast("Customer has no outstanding dues!", "info");
        return;
    }

    if (typeof WhatsAppService !== 'undefined') {
        const phoneCheck = WhatsAppService.validateCustomerPhone(customer.phone);
        if (!phoneCheck.isValid) {
            Utils.showToast(phoneCheck.error, "warning");
            return;
        }
    } else if (!customer.phone || customer.phone.trim().length < 5) {
        Utils.showToast("Customer does not have a valid phone number.", "warning");
        return;
    }

    // Populate customer details
    document.getElementById('rem-customer-name').textContent = customer.name;
    document.getElementById('rem-phone-display').textContent = customer.phone;
    document.getElementById('rem-due-amount-display').textContent = Utils.formatCurrency(fin.currentDue);

    const avatarBadge = document.getElementById('rem-avatar-badge');
    if (avatarBadge) avatarBadge.textContent = getInitials(customer.name);

    // Auto-select template based on overdue status
    const tplBtns = modal.querySelectorAll('.btn-rem-tpl');
    tplBtns.forEach(b => b.classList.remove('active'));

    if (fin.isOverdue) {
        activeReminderTemplate = 'overdue';
        modal.querySelector('.btn-rem-tpl[data-tpl="overdue"]')?.classList.add('active');
    } else {
        activeReminderTemplate = 'standard';
        modal.querySelector('.btn-rem-tpl[data-tpl="standard"]')?.classList.add('active');
    }

    updateReminderMessageTemplate();
    openModal(modal);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateReminderMessageTemplate() {
    const customer = Storage.getCustomer(activeCustomerId);
    if (!customer) return;

    const fin = Storage.calculateCustomerFinancials(customer);
    
    // Update tone-adaptive styling on customer summary card
    const custCard = document.getElementById('rem-customer-card');
    const dueLabel = document.getElementById('rem-due-label');
    if (custCard) {
        custCard.classList.remove('tone-standard', 'tone-overdue', 'tone-friendly');
        custCard.classList.add(`tone-${activeReminderTemplate}`);
    }
    if (dueLabel) {
        if (activeReminderTemplate === 'friendly') dueLabel.textContent = "Open Balance";
        else if (activeReminderTemplate === 'overdue') dueLabel.textContent = "Overdue Balance";
        else dueLabel.textContent = "Outstanding Due";
    }

    if (typeof WhatsAppService !== 'undefined') {
        const prep = WhatsAppService.prepareReminder(customer, fin, activeReminderTemplate);
        const textarea = document.getElementById('rem-message-text');
        if (textarea && prep.message) {
            textarea.value = prep.message;
        }
    } else {
        const settings = Storage.getSettings();
        const formattedDue = `${settings.currency}${fin.currentDue}`;
        const dueDateStr = fin.overdueDate ? Utils.formatDate(fin.overdueDate) : 'Due on receipt';

        let message = '';
        if (activeReminderTemplate === 'overdue') {
            message = `Hello ${customer.name},\n\nThis is an urgent reminder that your payment of ${formattedDue} with ${settings.shopName} is currently overdue (Due since ${dueDateStr}).\n\nPlease arrange to clear the outstanding balance at your earliest convenience.\n\nThank you,\n${settings.shopName}\nPhone: ${settings.shopPhone}`;
        } else if (activeReminderTemplate === 'friendly') {
            message = `Hi ${customer.name} 👋,\n\nHope you are having a great day! Just a gentle note that you have an open balance of ${formattedDue} at ${settings.shopName}.\n\nFeel free to pay via UPI or during your next visit.\n\nBest regards,\n${settings.shopName}`;
        } else {
            message = `Hello ${customer.name},\n\nYour outstanding balance with ${settings.shopName} is ${formattedDue}.\n\nDue Date: ${dueDateStr}\n\nThank you for shopping with us!\n${settings.shopName}`;
        }

        const textarea = document.getElementById('rem-message-text');
        if (textarea) textarea.value = message;
    }

    syncReminderLivePreview();
}

function syncReminderLivePreview() {
    const textarea = document.getElementById('rem-message-text');
    const charCounter = document.getElementById('rem-char-counter');
    const bubbleText = document.getElementById('rem-bubble-text-preview');

    if (!textarea) return;
    const text = textarea.value || '';

    if (charCounter) {
        charCounter.textContent = `${text.length} char${text.length !== 1 ? 's' : ''}`;
    }

    if (bubbleText) {
        if (!text.trim()) {
            bubbleText.textContent = "Type a message above to preview...";
        } else {
            bubbleText.textContent = text;
        }
    }
}

function fallbackShareWhatsApp(phone, messageText) {
    const cleanPhone = String(phone).replace(/[^0-9+]/g, '');
    const encodedText = encodeURIComponent(messageText);
    const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodedText}`
        : `https://wa.me/?text=${encodedText}`;
    window.open(waUrl, '_blank');
    Utils.showToast("Opened WhatsApp share drawer.", "info");
}

// Modal Helpers - Locks background page scroll & touch movement completely
function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

    // Prevent touchmove propagation from modal overlay to underlying page
    modal.addEventListener('touchmove', handleModalTouchMove, { passive: false });
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    modal.removeEventListener('touchmove', handleModalTouchMove);

    const activeModals = document.querySelectorAll('.modal-overlay.active');
    if (activeModals.length === 0) {
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    }
}

function handleModalTouchMove(e) {
    // Allow scrolling only inside modal scroll containers
    if (e.target.closest('.modal-container') || e.target.closest('.rem-textarea') || e.target.closest('.form-control-textarea')) {
        e.stopPropagation();
    } else {
        e.preventDefault();
    }
}
