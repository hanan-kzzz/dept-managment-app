/**
 * Due Ledger Management Logic - dues.js (UI Redesigned)
 */

let activeDueFilter = 'all';
let dueSearchQuery = '';
let reminderCustomerId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'dues') return;

    initDuesPage();
});

function initDuesPage() {
    renderDuesList();

    const searchInput = document.getElementById('due-search');
    const clearBtn = document.getElementById('due-search-clear');

    // Bind search
    searchInput.addEventListener('input', (e) => {
        dueSearchQuery = e.target.value.toLowerCase().trim();
        if (dueSearchQuery) {
            clearBtn.style.display = 'flex';
        } else {
            clearBtn.style.display = 'none';
        }
        renderDuesList();
    });

    // Clear search trigger
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        dueSearchQuery = '';
        clearBtn.style.display = 'none';
        renderDuesList();
    });

    // Bind segmented tabs
    const tabs = document.querySelectorAll('.filter-tab-seg');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeDueFilter = tab.dataset.filter;
            renderDuesList();
        });
    });

    // Bind reminder modal events
    const modal = document.getElementById('modal-due-reminder');
    document.getElementById('modal-due-rem-close').addEventListener('click', () => closeModal(modal));
    document.getElementById('btn-due-rem-cancel').addEventListener('click', () => closeModal(modal));
    
    document.getElementById('btn-due-rem-whatsapp').addEventListener('click', () => {
        const text = document.getElementById('due-rem-message').value;
        const customer = Storage.getCustomer(reminderCustomerId);
        if (customer) {
            const cleanPhone = customer.phone.replace(/[^0-9+]/g, '');
            const encodedText = encodeURIComponent(text);
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
            window.open(waUrl, '_blank');
            closeModal(modal);
            Utils.showToast("WhatsApp opened.", "success");
        }
    });

    // Bind Record Payment contextual header click
    const payModal = document.getElementById('modal-record-payment');
    document.getElementById('btn-record-payment-header').addEventListener('click', () => {
        openRecordPaymentModal();
    });

    // Bind Record Payment modal controls
    document.getElementById('modal-record-payment-close').addEventListener('click', () => closeModal(payModal));
    document.getElementById('btn-payment-change-customer').addEventListener('click', () => {
        document.getElementById('payment-step-1').style.display = 'block';
        document.getElementById('payment-step-2').style.display = 'none';
        document.getElementById('payment-cust-id').value = '';
    });

    document.getElementById('form-record-payment').addEventListener('submit', handleRecordPaymentSubmit);

    // Customer lookup search
    const lookupInput = document.getElementById('payment-cust-lookup');
    lookupInput.addEventListener('input', handlePaymentCustomerLookup);

    // Payment amount live preview
    const amountInput = document.getElementById('payment-amount');
    amountInput.addEventListener('input', () => {
        const currentDue = parseFloat(document.getElementById('payment-selected-due').textContent.replace(/[^0-9.]/g, '')) || 0;
        const paymentVal = parseFloat(amountInput.value) || 0;
        updatePaymentDuePreview(currentDue, paymentVal);
    });

    // Handle check parameter to auto open modal
    const params = new URLSearchParams(window.location.search);
    if (params.get('openRecordPayment') === 'true') {
        openRecordPaymentModal();
    }
}

function openRecordPaymentModal() {
    const modal = document.getElementById('modal-record-payment');
    if (!modal) return;
    
    // Reset steps
    document.getElementById('payment-step-1').style.display = 'block';
    document.getElementById('payment-step-2').style.display = 'none';
    
    document.getElementById('payment-cust-lookup').value = '';
    document.getElementById('payment-cust-suggestions').style.display = 'none';
    document.getElementById('payment-cust-id').value = '';

    openModal(modal);
}

function handlePaymentCustomerLookup(e) {
    const query = e.target.value.toLowerCase().trim();
    const suggestionsPanel = document.getElementById('payment-cust-suggestions');
    if (!suggestionsPanel) return;

    if (!query) {
        suggestionsPanel.innerHTML = '';
        suggestionsPanel.style.display = 'none';
        return;
    }

    const customers = Storage.getCustomers();
    const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.phone.includes(query)
    );

    if (filtered.length === 0) {
        suggestionsPanel.innerHTML = `
            <div style="padding: 10px 14px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No customers found</div>
        `;
        suggestionsPanel.style.display = 'block';
        return;
    }

    suggestionsPanel.innerHTML = filtered.map(c => `
        <div class="suggestion-item" data-id="${c.id}" style="padding: 10px 14px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <div>
                <strong style="color: var(--text); font-size: 0.85rem;">${c.name}</strong>
                <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Due balance: ${Utils.formatCurrency(c.currentDue)}</span>
            </div>
            <button type="button" class="btn btn-secondary btn-sm select-btn" style="min-height: 28px; padding: 2px 10px; font-size: 0.75rem; border-radius: var(--radius-sm);">Select</button>
        </div>
    `).join('');

    suggestionsPanel.style.display = 'block';

    // Bind suggestion selection
    suggestionsPanel.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const id = item.dataset.id;
            selectCustomerForPayment(id);
        });
        const btn = item.querySelector('.select-btn');
        if (btn) {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const id = item.dataset.id;
                selectCustomerForPayment(id);
            });
        }
    });
}

function selectCustomerForPayment(customerId) {
    const customer = Storage.getCustomer(customerId);
    if (!customer) return;

    document.getElementById('payment-cust-id').value = customer.id;
    document.getElementById('payment-selected-name').textContent = customer.name;
    document.getElementById('payment-selected-phone').textContent = customer.phone;
    document.getElementById('payment-selected-due').textContent = Utils.formatCurrency(customer.currentDue);
    
    // Auto fill current date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('payment-date').value = today;

    document.getElementById('payment-amount').value = '';
    document.getElementById('payment-amount').max = customer.currentDue;
    
    updatePaymentDuePreview(customer.currentDue, 0);

    // Transition to Step 2
    document.getElementById('payment-step-1').style.display = 'none';
    document.getElementById('payment-step-2').style.display = 'block';
}

function updatePaymentDuePreview(currentDue, paymentAmount) {
    const newDue = Math.max(0, currentDue - paymentAmount);
    document.getElementById('payment-due-preview').textContent = Utils.formatCurrency(newDue);
}

function handleRecordPaymentSubmit(e) {
    e.preventDefault();
    const customerId = document.getElementById('payment-cust-id').value;
    const amountInput = document.getElementById('payment-amount');
    const methodSelect = document.getElementById('payment-method');
    const dateInput = document.getElementById('payment-date');
    const notesInput = document.getElementById('payment-notes');

    const paymentAmount = parseFloat(amountInput.value);
    let isValid = true;

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        amountInput.classList.add('is-invalid');
        document.getElementById('payment-amount-feedback').textContent = "Amount must be greater than zero.";
        isValid = false;
    } else {
        const customer = Storage.getCustomer(customerId);
        if (customer && paymentAmount > customer.currentDue) {
            amountInput.classList.add('is-invalid');
            document.getElementById('payment-amount-feedback').textContent = `Amount cannot exceed current due: ${Utils.formatCurrency(customer.currentDue)}`;
            isValid = false;
        } else {
            amountInput.classList.remove('is-invalid');
        }
    }

    if (!dateInput.value) {
        dateInput.classList.add('is-invalid');
        isValid = false;
    } else {
        dateInput.classList.remove('is-invalid');
    }

    if (!isValid) return;

    const customer = Storage.getCustomer(customerId);
    if (!customer) {
        Utils.showToast("Selected customer not found", "error");
        return;
    }

    const paymentRecord = Storage.recordCustomerPayment(
        customerId,
        paymentAmount,
        methodSelect.value,
        notesInput.value.trim(),
        dateInput.value
    );

    if (paymentRecord) {
        Utils.initAppLayout(document.body.dataset.page);
        Utils.showToast(`✓ Payment #${paymentRecord.paymentNumber} of ${Utils.formatCurrency(paymentAmount)} recorded`, "success");
    }

    closeModal(document.getElementById('modal-record-payment'));
    
    // Re-render list
    renderDuesList();
}

function getDaysSinceLastPurchase(customer) {
    const purchases = (customer.transactions || []).filter(tx => tx.type === 'Purchase');
    if (purchases.length === 0) {
        const created = new Date(customer.createdDate || Date.now());
        return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
    }
    const latest = new Date(Math.max(...purchases.map(p => new Date(p.date))));
    return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
}

function getLatestPurchaseDateString(customer) {
    const purchases = (customer.transactions || []).filter(tx => tx.type === 'Purchase');
    if (purchases.length === 0) {
        return customer.createdDate ? Utils.formatDate(customer.createdDate) : 'Never';
    }
    const dates = purchases.map(p => new Date(p.date));
    const latest = new Date(Math.max(...dates));
    return Utils.formatDate(latest.toISOString());
}

function renderDuesList() {
    const listFeed = document.getElementById('due-list-feed');
    if (!listFeed) return;

    let customers = Storage.getCustomers().filter(c => c.currentDue > 0);

    const totalDueSum = customers.reduce((sum, c) => sum + c.currentDue, 0);
    document.getElementById('total-dues-amount').textContent = Utils.formatCurrency(totalDueSum);
    document.getElementById('total-due-accounts').textContent = customers.length;

    // 1. Search Query
    if (dueSearchQuery) {
        customers = customers.filter(c => 
            c.name.toLowerCase().includes(dueSearchQuery) || 
            c.phone.includes(dueSearchQuery)
        );
    }

    // 2. Tab filters
    const todayStr = new Date().toDateString();
    if (activeDueFilter === 'overdue') {
        customers = customers.filter(c => getDaysSinceLastPurchase(c) > 30);
    } else if (activeDueFilter === 'today') {
        customers = customers.filter(c => {
            const lastBuy = (c.transactions || []).filter(tx => tx.type === 'Purchase');
            if (lastBuy.length === 0) return false;
            const latest = new Date(Math.max(...lastBuy.map(p => new Date(p.date))));
            return latest.toDateString() === todayStr;
        });
    } else if (activeDueFilter === 'high') {
        customers = customers.filter(c => c.currentDue > 2000);
    } else if (activeDueFilter === 'recent') {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        customers = customers.filter(c => new Date(c.createdDate).getTime() > sevenDaysAgo);
    }

    customers.sort((a, b) => b.currentDue - a.currentDue);

    if (customers.length === 0) {
        listFeed.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon" style="color:var(--primary); background-color:var(--primary-light);"><i data-lucide="shield-check"></i></div>
                <h3 class="empty-state-title">No Due Accounts</h3>
                <p class="empty-state-text">No outstanding balances match these filters.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    listFeed.innerHTML = customers.map(c => {
        const days = getDaysSinceLastPurchase(c);
        const initials = getInitials(c.name);
        
        let overdueDisplay = `Due for ${days} day${days !== 1 ? 's' : ''}`;
        if (days === 0) {
            overdueDisplay = `Due today`;
        } else if (days > 30) {
            overdueDisplay = `<span class="overdue-tag">Due for ${days} days (Overdue)</span>`;
        }

        return `
            <div class="customer-card-item" style="cursor: default; align-items: center; padding: 12px 14px; background-color: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 8px; display: flex; justify-content: space-between;">
                <div class="avatar-badge avatar-danger">${initials}</div>
                <div class="customer-info-section" style="flex: 1; display:flex; flex-direction:column; gap:2px; margin-left: 12px;">
                    <a href="customer-details.html?id=${c.id}" class="customer-card-name" style="color: var(--text); font-weight:700; font-size:0.9rem; text-decoration: none;">${c.name}</a>
                    <span class="customer-card-phone" style="font-size:0.75rem; color: var(--text-muted);">${c.phone}</span>
                    <div style="font-size:0.72rem; color:var(--text-light); margin-top:2px;">
                        ${overdueDisplay}
                    </div>
                </div>
                <div class="customer-due-section" style="min-width: 80px; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    <span class="customer-due-amount due-positive" style="font-size:1.05rem; font-weight:800; color: var(--danger);">${Utils.formatCurrency(c.currentDue)}</span>
                    <a href="customer-details.html?id=${c.id}&recordPayment=true" class="btn btn-primary btn-sm" style="padding: 2px 12px; min-height:30px; font-size: 0.75rem; font-weight:700; width:100%; border-radius: var(--radius-sm); text-decoration: none; display: inline-flex; align-items: center; justify-content: center; background-color: var(--accent); color: var(--text-on-accent);">
                        Pay
                    </a>
                </div>
            </div>
        `;
    }).join('');

    // Bind triggers
    document.querySelectorAll('.btn-rem-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('.btn-rem-trigger').dataset.id;
            triggerDueReminderModal(id);
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function triggerDueReminderModal(id) {
    const customer = Storage.getCustomer(id);
    if (!customer) return;

    reminderCustomerId = customer.id;
    const settings = Storage.getSettings();

    document.getElementById('due-rem-phone').textContent = customer.phone;

    const message = `Hello ${customer.name},\n\nThis is a friendly reminder that your outstanding amount at ${settings.shopName} is ${settings.currency}${customer.currentDue}.\n\nThank you.\n${settings.shopName}`;
    document.getElementById('due-rem-message').value = message;

    openModal(document.getElementById('modal-due-reminder'));
}

// Modal actions - Lock background scroll & movement
function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
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
    if (e.target.closest('.modal-container')) {
        e.stopPropagation();
    } else {
        e.preventDefault();
    }
}
