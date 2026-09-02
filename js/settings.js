/**
 * Redesigned Shop Settings UI Logic - settings.js
 */

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'settings') return;

    initRedesignedSettings();
});

function initRedesignedSettings() {
    // 1. Navigation slide-in/out handlers
    setupSubpageNavigation();

    // 2. Load settings data into UI
    loadSettingsData();

    // 3. Setup settings search
    setupSettingsSearch();

    // 4. Setup mock connections (WhatsApp, Telegram)
    setupMockConnections();
    setupWhatsAppRedesignEvents();

    // 5. Setup theme selection
    setupThemeSelection();

    // 6. Setup currency and language selections
    setupCurrencyAndLanguage();

    // 7. Bind profile & business save buttons
    setupSaveForms();

    // 8. Bind data backup, recovery and resets
    setupDataOperations();

    // STAGE 5: Setup Market Price & Smart Stock Settings Modal
    setupMarketSettingsModal();

    // 9. Render Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/* SUBPAGE NAVIGATION SLIDE SYSTEM WITH RELOAD PERSISTENCE */
function openSubpage(subpageId) {
    const subpage = document.getElementById(subpageId);
    if (!subpage) return;

    const allSubpages = document.querySelectorAll('.settings-subpage');
    allSubpages.forEach(sp => {
        if (sp !== subpage) sp.classList.remove('active');
    });
    subpage.classList.add('active');

    // Persist active subpage in hash and sessionStorage
    const hashKey = subpageId.replace('subpage-', '');
    if (window.location.hash !== '#' + hashKey) {
        history.replaceState(null, null, '#' + hashKey);
    }
    sessionStorage.setItem('active_settings_subpage', subpageId);

    const placeholder = document.getElementById('settings-tablet-placeholder');
    if (placeholder && window.innerWidth >= 768) {
        placeholder.style.display = 'none';
    }
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function closeSubpage(subpageId) {
    const page = document.getElementById(subpageId);
    if (page) {
        page.classList.remove('active');
    }
    // Clear URL hash and sessionStorage
    sessionStorage.removeItem('active_settings_subpage');
    if (window.location.hash) {
        history.replaceState(null, null, window.location.pathname + window.location.search);
    }
    const placeholder = document.getElementById('settings-tablet-placeholder');
    if (placeholder && window.innerWidth >= 768) {
        placeholder.style.display = 'block';
    }
}

function setupSubpageNavigation() {
    const subpagesMap = {
        'row-profile-card': 'subpage-profile',
        'row-shop-profile': 'subpage-profile',
        'row-business-details': 'subpage-business',
        'row-invoice-settings': 'subpage-invoice-settings',
        'row-currency': 'subpage-currency',
        'row-language': 'subpage-language',
        'row-whatsapp': 'subpage-whatsapp',
        'row-telegram': 'subpage-telegram',
        'row-notifications-group': 'subpage-notifications',
        'row-appearance': 'subpage-appearance',
        'row-backup': 'subpage-backup',
        'row-manage-shop-profile': 'subpage-profile',
        'row-about-app': 'subpage-about'
    };

    // Open subpage triggers
    Object.keys(subpagesMap).forEach(triggerId => {
        const trigger = document.getElementById(triggerId);
        const subpageId = subpagesMap[triggerId];

        if (trigger) {
            trigger.addEventListener('click', () => {
                openSubpage(subpageId);
            });
        }
    });

    // Close buttons (ArrowLeft click inside subpage headers)
    const closeTriggers = [
        { btn: 'btn-back-whatsapp', page: 'subpage-whatsapp' },
        { btn: 'btn-back-telegram', page: 'subpage-telegram' },
        { btn: 'btn-back-notifications', page: 'subpage-notifications' },
        { btn: 'btn-back-appearance', page: 'subpage-appearance' },
        { btn: 'btn-back-profile', page: 'subpage-profile' },
        { btn: 'btn-back-business', page: 'subpage-business' },
        { btn: 'btn-back-invoice-settings', page: 'subpage-invoice-settings' },
        { btn: 'btn-back-currency', page: 'subpage-currency' },
        { btn: 'btn-back-language', page: 'subpage-language' },
        { btn: 'btn-back-backup', page: 'subpage-backup' },
        { btn: 'btn-back-about', page: 'subpage-about' }
    ];

    closeTriggers.forEach(trigger => {
        const btn = document.getElementById(trigger.btn);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeSubpage(trigger.page);
            });
        }
    });

    // Links to other pages or Coming Soon toast notifications
    const comingSoonRows = [
        'row-app-lock', 'row-login-security', 'row-activity-log',
        'row-units', 'row-suppliers', 'row-sales-settings',
        'row-payment-methods', 'row-help-support', 'row-privacy', 'row-terms'
    ];

    comingSoonRows.forEach(rowId => {
        const row = document.getElementById(rowId);
        if (row) {
            row.addEventListener('click', () => {
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast("Feature coming soon!", "info");
                } else {
                    alert("Feature coming soon!");
                }
            });
        }
    });

    // Links to actual working pages
    const linkMap = {
        'row-products-categories': 'stock.html',
        'row-customer-settings': 'customers.html',
        'row-due-settings': 'dues.html'
    };

    Object.keys(linkMap).forEach(rowId => {
        const row = document.getElementById(rowId);
        if (row) {
            row.addEventListener('click', () => {
                window.location.href = linkMap[rowId];
            });
        }
    });

    // Automatically restore open subpage on page reload
    restoreActiveSubpageOnLoad();
}

function restoreActiveSubpageOnLoad() {
    let targetId = null;
    const hash = window.location.hash.replace('#', '').trim();
    if (hash) {
        if (hash.startsWith('subpage-')) {
            targetId = hash;
        } else {
            targetId = 'subpage-' + hash;
        }
    }
    if (!targetId || !document.getElementById(targetId)) {
        targetId = sessionStorage.getItem('active_settings_subpage');
    }
    if (targetId && document.getElementById(targetId)) {
        openSubpage(targetId);
    }
}

/* DATA LOADER */
function loadSettingsData() {
    const settings = Storage.getSettings();
    const auth = Storage.getAuth();

    // Owner info check
    const ownerName = auth && auth.user && auth.user.name ? auth.user.name : '';
    const shopName = settings.shopName || 'My Grocery Shop';

    // Populate main page identity
    const profShopName = document.getElementById('profile-shop-name');
    if (profShopName) profShopName.textContent = shopName;

    const profileOwnerEl = document.getElementById('profile-owner-name');
    if (profileOwnerEl) {
        if (ownerName && ownerName.trim() && ownerName !== 'Owner Name') {
            profileOwnerEl.textContent = ownerName;
            profileOwnerEl.style.display = 'block';
        } else {
            profileOwnerEl.textContent = 'Shop Owner';
        }
    }

    // Shop Profile Subpage Inputs
    const setShopNameEl = document.getElementById('set-shop-name-input');
    if (setShopNameEl) setShopNameEl.value = shopName;
    const setOwnerNameEl = document.getElementById('set-owner-name-input');
    if (setOwnerNameEl) setOwnerNameEl.value = ownerName;
    const setShopPhoneEl = document.getElementById('set-shop-phone-input');
    if (setShopPhoneEl) setShopPhoneEl.value = settings.shopPhone || '';
    const setShopEmailEl = document.getElementById('set-shop-email-input');
    if (setShopEmailEl) setShopEmailEl.value = settings.email || (auth && auth.user && auth.user.email) || '';
    const setShopAddrEl = document.getElementById('set-shop-address-input');
    if (setShopAddrEl) setShopAddrEl.value = settings.shopAddress || '';

    // Business Details Subpage Inputs
    const setBizPhoneEl = document.getElementById('set-business-phone');
    if (setBizPhoneEl) setBizPhoneEl.value = settings.businessPhone || settings.shopPhone || '';
    const setBizAddrEl = document.getElementById('set-business-address');
    if (setBizAddrEl) setBizAddrEl.value = settings.businessAddress || settings.shopAddress || '';
    const setBizGstEl = document.getElementById('set-business-gst');
    if (setBizGstEl) setBizGstEl.value = settings.gstNumber || '';
    const setBizRegEl = document.getElementById('set-business-reg');
    if (setBizRegEl) setBizRegEl.value = settings.regNumber || '';

    // Bill & Invoice Settings Subpage Inputs
    const taxEnabledInput = document.getElementById('set-tax-enabled');
    const taxRateInput = document.getElementById('set-tax-rate');
    const gstNumberInput = document.getElementById('set-gst-number');
    const invPrefixInput = document.getElementById('set-invoice-prefix');
    const defaultFormatInput = document.getElementById('set-default-bill-format');
    const shopLogoInput = document.getElementById('set-shop-logo-url');
    const billFooterInput = document.getElementById('set-bill-footer');

    if (taxEnabledInput) taxEnabledInput.checked = settings.taxEnabled === true;
    if (taxRateInput) taxRateInput.value = settings.taxRate !== undefined ? settings.taxRate : 0;
    if (gstNumberInput) gstNumberInput.value = settings.gstNumber || '';
    if (invPrefixInput) invPrefixInput.value = settings.invoicePrefix || 'INV-';
    if (defaultFormatInput) defaultFormatInput.value = settings.defaultBillFormat || 'thermal-80';
    if (shopLogoInput) shopLogoInput.value = settings.shopLogo || '';
    if (billFooterInput) billFooterInput.value = settings.billFooter || 'Thank you for shopping with us!';

    // Sync Print Format Chips
    const selectedFormat = settings.defaultBillFormat || 'thermal-80';
    document.querySelectorAll('.format-chip').forEach(chip => {
        if (chip.dataset.format === selectedFormat) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });

    // Theme loading
    const savedTheme = localStorage.getItem('theme') || 'light';
    const valThemeEl = document.getElementById('val-theme');
    if (valThemeEl) valThemeEl.textContent = savedTheme.charAt(0).toUpperCase() + savedTheme.slice(1);
    document.querySelectorAll('[data-theme-val]').forEach(el => {
        if (el.dataset.themeVal === savedTheme) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    // Currency loading
    const curr = settings.currency || '₹';
    let currLabel = '₹ Indian Rupee';
    if (curr === '$') currLabel = '$ Dollar';
    if (curr === '£') currLabel = '£ Pound';
    if (curr === '€') currLabel = '€ Euro';
    if (curr === 'AED') currLabel = 'AED Dirham';
    const valCurrEl = document.getElementById('val-currency');
    if (valCurrEl) valCurrEl.textContent = currLabel;
    
    document.querySelectorAll('[data-currency-val]').forEach(el => {
        if (el.dataset.currencyVal === curr) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    // Language loading
    const lang = settings.language || 'English';
    document.getElementById('val-language').textContent = lang;
    document.querySelectorAll('[data-lang-val]').forEach(el => {
        if (el.dataset.langVal === lang) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    // Connection states
    updateWhatsAppConnectionUI(settings.whatsappConnected === true);
    updateTelegramConnectionUI(settings.telegramConnected === true);

    // WhatsApp Automatic Reminders loading
    setCheckbox('whatsapp-opt-due-tomorrow', settings.whatsappAutoDueTomorrow !== false);
    setCheckbox('whatsapp-opt-due-today', settings.whatsappAutoDueToday !== false);
    setCheckbox('whatsapp-opt-overdue-1', settings.whatsappAutoOverdue1 !== false);
    setCheckbox('whatsapp-opt-overdue-3', settings.whatsappAutoOverdue3 !== false);
    setCheckbox('whatsapp-opt-overdue-7', settings.whatsappAutoOverdue7 !== false);

    // Telegram Owner Alerts loading
    setCheckbox('telegram-opt-low-stock', settings.telegramLowStock !== false);
    setCheckbox('telegram-opt-out-stock', settings.telegramOutOfStock !== false);
    setCheckbox('telegram-opt-customer-overdue', settings.telegramCustomerOverdue !== false);
    setCheckbox('telegram-opt-payment', settings.telegramPaymentReceived !== false);
    setCheckbox('telegram-opt-summary', settings.telegramDailySummary !== false);

    // Notification switch preferences loading
    setCheckbox('notif-opt-low-stock', settings.notifLowStock !== false && settings.lowStockAlerts !== false);
    setCheckbox('notif-opt-out-stock', settings.notifOutOfStock !== false && settings.outOfStockAlerts !== false);
    setCheckbox('notif-opt-due', settings.notifCustomerDue !== false && settings.dueReminders !== false);
    setCheckbox('notif-opt-overdue', settings.notifCustomerOverdue !== false && settings.overdueReminders !== false);
    setCheckbox('notif-opt-payment', settings.notifPaymentReceived !== false);
    setCheckbox('notif-opt-sale', settings.notifSaleCompleted !== false);
    setCheckbox('notif-opt-summary', settings.notifDailySummary !== false && settings.dailySummaryAlerts !== false);

    // Bind change listeners to update states instantly
    const notifCheckboxes = [
        'notif-opt-low-stock', 'notif-opt-out-stock',
        'notif-opt-due', 'notif-opt-overdue',
        'notif-opt-payment', 'notif-opt-sale', 'notif-opt-summary'
    ];
    notifCheckboxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', saveNotificationPreferences);
    });

    // Connection Switch preference listeners
    const connCheckboxes = [
        'whatsapp-opt-due-tomorrow', 'whatsapp-opt-due-today',
        'whatsapp-opt-overdue-1', 'whatsapp-opt-overdue-3', 'whatsapp-opt-overdue-7',
        'telegram-opt-low-stock', 'telegram-opt-out-stock',
        'telegram-opt-customer-overdue', 'telegram-opt-payment', 'telegram-opt-summary'
    ];
    connCheckboxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', saveConnectionPreferences);
    });

    // Evaluate overall notifications label
    evaluateNotificationsOverallLabel();
}

function setCheckbox(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
}

function evaluateNotificationsOverallLabel() {
    const isLowStock = document.getElementById('notif-opt-low-stock')?.checked;
    const isOutStock = document.getElementById('notif-opt-out-stock')?.checked;
    const isDue = document.getElementById('notif-opt-due')?.checked;
    const isOverdue = document.getElementById('notif-opt-overdue')?.checked;
    const isPayment = document.getElementById('notif-opt-payment')?.checked;
    const isSale = document.getElementById('notif-opt-sale')?.checked;
    const isSummary = document.getElementById('notif-opt-summary')?.checked;

    const overall = (isLowStock || isOutStock || isDue || isOverdue || isPayment || isSale || isSummary) ? "On" : "Off";
    const labelEl = document.getElementById('val-notifications-overall');
    if (labelEl) labelEl.textContent = overall;
}

function saveNotificationPreferences() {
    const settings = Storage.getSettings();
    const lowStock = document.getElementById('notif-opt-low-stock')?.checked;
    const outStock = document.getElementById('notif-opt-out-stock')?.checked;
    const due = document.getElementById('notif-opt-due')?.checked;
    const overdue = document.getElementById('notif-opt-overdue')?.checked;
    const payment = document.getElementById('notif-opt-payment')?.checked;
    const sale = document.getElementById('notif-opt-sale')?.checked;
    const summary = document.getElementById('notif-opt-summary')?.checked;

    settings.notifLowStock = lowStock;
    settings.lowStockAlerts = lowStock;
    settings.notifOutOfStock = outStock;
    settings.outOfStockAlerts = outStock;
    settings.notifCustomerDue = due;
    settings.dueReminders = due;
    settings.notifCustomerOverdue = overdue;
    settings.overdueReminders = overdue;
    settings.notifPaymentReceived = payment;
    settings.notifSaleCompleted = sale;
    settings.notifDailySummary = summary;
    settings.dailySummaryAlerts = summary;

    Storage.saveSettings(settings);
    evaluateNotificationsOverallLabel();
}

function saveConnectionPreferences() {
    const settings = Storage.getSettings();
    settings.whatsappAutoDueTomorrow = document.getElementById('whatsapp-opt-due-tomorrow')?.checked;
    settings.whatsappAutoDueToday = document.getElementById('whatsapp-opt-due-today')?.checked;
    settings.whatsappAutoOverdue1 = document.getElementById('whatsapp-opt-overdue-1')?.checked;
    settings.whatsappAutoOverdue3 = document.getElementById('whatsapp-opt-overdue-3')?.checked;
    settings.whatsappAutoOverdue7 = document.getElementById('whatsapp-opt-overdue-7')?.checked;

    settings.telegramLowStock = document.getElementById('telegram-opt-low-stock')?.checked;
    settings.telegramOutOfStock = document.getElementById('telegram-opt-out-stock')?.checked;
    settings.telegramCustomerOverdue = document.getElementById('telegram-opt-customer-overdue')?.checked;
    settings.telegramPaymentReceived = document.getElementById('telegram-opt-payment')?.checked;
    settings.telegramDailySummary = document.getElementById('telegram-opt-summary')?.checked;

    Storage.saveSettings(settings);
}

/* SEARCH FUNCTIONALITY */
function setupSettingsSearch() {
    const searchInput = document.getElementById('settings-search');
    const resultsPanel = document.getElementById('search-results-panel');
    const resultsList = document.getElementById('search-results-list');
    const mainContent = document.getElementById('main-settings-content');

    const searchableItems = [
        { title: 'Shop Profile', desc: 'Manage shop name, owner details and contact information', subpage: 'subpage-profile', keywords: ['shop profile', 'owner', 'name', 'contact', 'email', 'profile'] },
        { title: 'Business Details', desc: 'Address, phone, GST/tax information', subpage: 'subpage-business', keywords: ['business', 'gst', 'tax', 'address', 'reg', 'phone'] },
        { title: 'Currency', desc: 'Configure default transaction currency', subpage: 'subpage-currency', keywords: ['currency', 'rupee', 'dollar', 'pound', 'euro', 'money', 'symbol'] },
        { title: 'Language', desc: 'Change application language', subpage: 'subpage-language', keywords: ['language', 'english', 'hindi', 'arabic', 'spanish'] },
        { title: 'WhatsApp', desc: 'Connect WhatsApp for customer reminders', subpage: 'subpage-whatsapp', keywords: ['whatsapp', 'message', 'connection', 'reminders'] },
        { title: 'Telegram', desc: 'Connect Telegram for owner alerts', subpage: 'subpage-telegram', keywords: ['telegram', 'alerts', 'notifications', 'owner'] },
        { title: 'Notifications', desc: 'Manage alerts and reminders', subpage: 'subpage-notifications', keywords: ['notifications', 'alerts', 'reminders', 'bell', 'sound'] },
        { title: 'Appearance', desc: 'Theme preference', subpage: 'subpage-appearance', keywords: ['appearance', 'theme', 'light', 'dark', 'system', 'color'] },
        { title: 'Backup & Restore', desc: 'Protect your shop data', subpage: 'subpage-backup', keywords: ['backup', 'restore', 'export', 'import', 'data', 'storage', 'clear'] },
        { title: 'Export Data', desc: 'Save a backup of your shop data', subpage: 'subpage-backup', keywords: ['export', 'download', 'backup', 'data'] },
        { title: 'Import Data', desc: 'Restore from a backup', subpage: 'subpage-backup', keywords: ['import', 'upload', 'restore', 'data'] },
        { title: 'App Lock', desc: 'Protect the application', action: 'coming-soon', keywords: ['app lock', 'security', 'password', 'pin', 'lock'] },
        { title: 'Login & Security', desc: 'Manage authentication', action: 'coming-soon', keywords: ['login', 'security', 'auth', 'password'] },
        { title: 'Activity Log', desc: 'Review important account activity', action: 'coming-soon', keywords: ['activity', 'log', 'history', 'security'] },
        { title: 'Products & Categories', desc: 'Manage product categories', action: 'link-stock', keywords: ['products', 'categories', 'stock', 'inventory'] },
        { title: 'Units', desc: 'Manage kg, g, L, ml, pcs, packs, etc.', action: 'coming-soon', keywords: ['units', 'kg', 'g', 'liter', 'pcs'] },
        { title: 'Suppliers', desc: 'Manage suppliers', action: 'coming-soon', keywords: ['suppliers', 'vendors', 'contacts'] },
        { title: 'Sales Settings', desc: 'Configure sales behaviour', action: 'coming-soon', keywords: ['sales', 'settings', 'behaviour'] },
        { title: 'Payment Methods', desc: 'Cash, UPI, Card and Due', action: 'coming-soon', keywords: ['payments', 'cash', 'upi', 'card', 'due'] },
        { title: 'Customer Settings', desc: 'Manage customer behaviour', action: 'link-customers', keywords: ['customers', 'contacts', 'registry'] },
        { title: 'Due Settings', desc: 'Configure customer due rules', action: 'link-dues', keywords: ['due', 'rules', 'limits'] },
        { title: 'Help & Support', desc: 'Get help using the application', action: 'coming-soon', keywords: ['help', 'support', 'faq'] },
        { title: 'About App', desc: 'Version and application information', subpage: 'subpage-about', keywords: ['about', 'version', 'app', 'info'] },
        { title: 'Privacy', desc: 'Privacy information', action: 'coming-soon', keywords: ['privacy', 'policy'] },
        { title: 'Terms', desc: 'Terms and conditions', action: 'coming-soon', keywords: ['terms', 'conditions'] }
    ];

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        
        if (!query) {
            resultsPanel.classList.remove('active');
            mainContent.style.display = 'block';
            return;
        }

        const filtered = searchableItems.filter(item => {
            return item.title.toLowerCase().includes(query) ||
                   item.desc.toLowerCase().includes(query) ||
                   item.keywords.some(kw => kw.toLowerCase().includes(query));
        });

        resultsList.innerHTML = '';

        if (filtered.length === 0) {
            resultsList.innerHTML = `
                <div class="search-empty-state">
                    <p style="font-size: 13px; color: var(--text-muted); padding: 12px 16px; margin: 0;">No matching settings found</p>
                </div>
            `;
            resultsPanel.classList.add('active');
            mainContent.style.display = 'none';
            return;
        }

        resultsPanel.classList.add('active');
        mainContent.style.display = 'none';

        filtered.forEach(match => {
            const row = document.createElement('div');
            row.className = 'settings-row';
            row.innerHTML = `
                <div class="settings-row-left">
                    <div class="settings-row-content">
                        <span class="settings-row-title">${match.title}</span>
                        <span class="settings-row-desc">${match.desc}</span>
                    </div>
                </div>
                <div class="settings-row-right">
                    <div class="settings-row-chevron"><i data-lucide="chevron-right"></i></div>
                </div>
            `;

            row.addEventListener('click', () => {
                // Clear search bar and revert views
                searchInput.value = '';
                resultsPanel.classList.remove('active');
                mainContent.style.display = 'block';

                // Trigger navigation
                if (match.subpage) {
                    const targetSubpage = document.getElementById(match.subpage);
                    if (targetSubpage) {
                        document.querySelectorAll('.settings-subpage').forEach(sp => {
                            if (sp !== targetSubpage) sp.classList.remove('active');
                        });
                        targetSubpage.classList.add('active');
                        const placeholder = document.getElementById('settings-tablet-placeholder');
                        if (placeholder && window.innerWidth >= 768) {
                            placeholder.style.display = 'none';
                        }
                    }
                } else if (match.action === 'coming-soon') {
                    Utils.showToast("Feature coming soon!", "info");
                } else if (match.action === 'link-stock') {
                    window.location.href = 'stock.html';
                } else if (match.action === 'link-customers') {
                    window.location.href = 'customers.html';
                } else if (match.action === 'link-dues') {
                    window.location.href = 'dues.html';
                }
            });

            resultsList.appendChild(row);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });
}

/* CONNECTIONS FOR WHATSAPP/TELEGRAM */
function setupMockConnections() {
    const btnConnectWA = document.getElementById('btn-connect-whatsapp');
    const btnConnectTG = document.getElementById('btn-connect-telegram');
    const btnTestTG = document.getElementById('btn-test-telegram');

    if (btnConnectWA) {
        btnConnectWA.addEventListener('click', () => {
            const isConnected = TelegramService ? WhatsAppService.isConnected() : false;
            let result;
            if (isConnected) {
                result = WhatsAppService.disconnect();
                Utils.showToast(result.message, "info");
            } else {
                result = WhatsAppService.connect();
                Utils.showToast(result.message, "success");
            }
            updateWhatsAppConnectionUI(result.connected);
        });
    }

    if (btnConnectTG) {
        btnConnectTG.addEventListener('click', () => {
            const isConnected = TelegramService ? TelegramService.isConnected() : false;
            let result;
            if (isConnected) {
                result = TelegramService.disconnect();
                Utils.showToast(result.message, "info");
            } else {
                result = TelegramService.connect();
                Utils.showToast(result.message, "success");
            }
            updateTelegramConnectionUI(result.connected);
        });
    }

    if (btnTestTG) {
        btnTestTG.addEventListener('click', () => {
            if (typeof TelegramService !== 'undefined') {
                const res = TelegramService.sendTestNotification();
                if (res.success) {
                    Utils.showToast(res.message, "success");
                } else {
                    Utils.showToast(res.error, "warning");
                }
            } else {
                Utils.showToast("Telegram service not initialized.", "error");
            }
        });
    }
}

function updateWhatsAppConnectionUI(isConnected) {
    const mainStatusVal = document.getElementById('val-whatsapp-status');
    const subStatusLbl = document.getElementById('sub-whatsapp-status-lbl');
    const btnText = document.getElementById('btn-whatsapp-connect-text');
    const heroCard = document.getElementById('wa-hero-card');
    const heroBadge = document.getElementById('wa-hero-badge');
    const rulesWrapper = document.getElementById('wa-rules-wrapper');

    if (isConnected) {
        if (mainStatusVal) {
            mainStatusVal.textContent = "Connected";
            mainStatusVal.className = "status-tag connected";
        }
        if (subStatusLbl) subStatusLbl.textContent = "Connected";
        if (btnText) btnText.textContent = "Disconnect WhatsApp Business";
        
        if (heroCard) {
            heroCard.classList.remove('disconnected');
            heroCard.classList.add('connected');
        }
        if (heroBadge) {
            heroBadge.classList.remove('disconnected');
            heroBadge.classList.add('connected');
        }
        if (rulesWrapper) {
            rulesWrapper.classList.remove('locked');
        }
    } else {
        if (mainStatusVal) {
            mainStatusVal.textContent = "Not connected";
            mainStatusVal.className = "status-tag disconnected";
        }
        if (subStatusLbl) subStatusLbl.textContent = "Not Connected";
        if (btnText) btnText.textContent = "Connect WhatsApp Business";
        
        if (heroCard) {
            heroCard.classList.remove('connected');
            heroCard.classList.add('disconnected');
        }
        if (heroBadge) {
            heroBadge.classList.remove('connected');
            heroBadge.classList.add('disconnected');
        }
        if (rulesWrapper) {
            rulesWrapper.classList.add('locked');
        }
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function setupWhatsAppRedesignEvents() {
    // 1. Overlay Connect Button
    const btnOverlayConnect = document.getElementById('btn-overlay-connect');
    const btnConnectWA = document.getElementById('btn-connect-whatsapp');
    if (btnOverlayConnect && btnConnectWA) {
        btnOverlayConnect.addEventListener('click', () => {
            btnConnectWA.click();
        });
    }

    // 2. Message Preview Accordions
    document.querySelectorAll('.wa-preview-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.dataset.previewTarget;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                const isHidden = targetEl.classList.contains('hidden');
                if (isHidden) {
                    targetEl.classList.remove('hidden');
                    toggle.classList.add('expanded');
                } else {
                    targetEl.classList.add('hidden');
                    toggle.classList.remove('expanded');
                }
            }
        });
    });

    // 3. Preset Buttons
    const btnStandard = document.getElementById('btn-wa-preset-standard');
    const btnAll = document.getElementById('btn-wa-preset-all');
    const btnClear = document.getElementById('btn-wa-preset-clear');

    if (btnStandard) {
        btnStandard.addEventListener('click', () => {
            setCheckbox('whatsapp-opt-due-tomorrow', true);
            setCheckbox('whatsapp-opt-due-today', true);
            setCheckbox('whatsapp-opt-overdue-1', true);
            setCheckbox('whatsapp-opt-overdue-3', true);
            setCheckbox('whatsapp-opt-overdue-7', false);
            saveConnectionPreferences();
            Utils.showToast("Applied Standard Reminder Preset", "success");
        });
    }

    if (btnAll) {
        btnAll.addEventListener('click', () => {
            setCheckbox('whatsapp-opt-due-tomorrow', true);
            setCheckbox('whatsapp-opt-due-today', true);
            setCheckbox('whatsapp-opt-overdue-1', true);
            setCheckbox('whatsapp-opt-overdue-3', true);
            setCheckbox('whatsapp-opt-overdue-7', true);
            saveConnectionPreferences();
            Utils.showToast("Enabled All Reminder Rules", "success");
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            setCheckbox('whatsapp-opt-due-tomorrow', false);
            setCheckbox('whatsapp-opt-due-today', false);
            setCheckbox('whatsapp-opt-overdue-1', false);
            setCheckbox('whatsapp-opt-overdue-3', false);
            setCheckbox('whatsapp-opt-overdue-7', false);
            saveConnectionPreferences();
            Utils.showToast("Disabled All Reminder Rules", "info");
        });
    }
}

function updateTelegramConnectionUI(isConnected) {
    const mainStatusVal = document.getElementById('val-telegram-status');
    const subStatusLbl = document.getElementById('sub-telegram-status-lbl');
    const btnText = document.getElementById('btn-telegram-connect-text');

    if (isConnected) {
        mainStatusVal.textContent = "Connected";
        mainStatusVal.className = "status-tag connected";
        subStatusLbl.textContent = "Connected";
        subStatusLbl.className = "status-value status-tag connected";
        btnText.textContent = "Disconnect Telegram";
    } else {
        mainStatusVal.textContent = "Not connected";
        mainStatusVal.className = "status-tag disconnected";
        subStatusLbl.textContent = "Not Connected";
        subStatusLbl.className = "status-value status-tag disconnected";
        btnText.textContent = "Connect Telegram";
    }
}

/* THEME SELECTION TRIGGER */
function setupThemeSelection() {
    document.querySelectorAll('[data-theme-val]').forEach(item => {
        item.addEventListener('click', () => {
            const selectedTheme = item.dataset.themeVal;
            
            // Save settings
            const settings = Storage.getSettings();
            settings.theme = selectedTheme;
            Storage.saveSettings(settings);

            localStorage.setItem('theme', selectedTheme);
            
            // Resolve and apply theme attribute on html root
            let appTheme = selectedTheme;
            if (selectedTheme === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                appTheme = prefersDark ? 'dark' : 'light';
            }
            document.documentElement.setAttribute('data-theme', appTheme);

            // Update UI list checkmarks
            document.querySelectorAll('[data-theme-val]').forEach(el => {
                if (el.dataset.themeVal === selectedTheme) {
                    el.classList.add('selected');
                } else {
                    el.classList.remove('selected');
                }
            });

            // Update label on main page
            const labelTheme = selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1);
            document.getElementById('val-theme').textContent = labelTheme;

            // Trigger global refresh to keep style synced
            Utils.initAppLayout('settings');

            Utils.showToast(`Theme updated to ${labelTheme}.`, "success");
        });
    });
}

/* CURRENCY AND LANGUAGE SELECTION */
function setupCurrencyAndLanguage() {
    // Currency selectors
    document.querySelectorAll('[data-currency-val]').forEach(item => {
        item.addEventListener('click', () => {
            const currencyVal = item.dataset.currencyVal;
            const settings = Storage.getSettings();
            settings.currency = currencyVal;
            Storage.saveSettings(settings);

            // Update checkmarks
            document.querySelectorAll('[data-currency-val]').forEach(el => {
                if (el.dataset.currencyVal === currencyVal) {
                    el.classList.add('selected');
                } else {
                    el.classList.remove('selected');
                }
            });

            let label = '₹ Indian Rupee';
            if (currencyVal === '$') label = '$ Dollar';
            if (currencyVal === '£') label = '£ Pound';
            if (currencyVal === '€') label = '€ Euro';
            if (currencyVal === 'AED') label = 'AED Dirham';
            document.getElementById('val-currency').textContent = label;

            Utils.showToast(`Currency updated to ${currencyVal}.`, "success");
        });
    });

    // Language selectors
    document.querySelectorAll('[data-lang-val]').forEach(item => {
        item.addEventListener('click', () => {
            const langVal = item.dataset.langVal;
            const settings = Storage.getSettings();
            settings.language = langVal;
            Storage.saveSettings(settings);

            // Update checkmarks
            document.querySelectorAll('[data-lang-val]').forEach(el => {
                if (el.dataset.langVal === langVal) {
                    el.classList.add('selected');
                } else {
                    el.classList.remove('selected');
                }
            });

            document.getElementById('val-language').textContent = langVal;
            Utils.showToast(`Language updated to ${langVal}.`, "success");
        });
    });
}

/* SAVE DATA FOR PROFILE AND BUSINESS DETAIL FORMS */
function setupSaveForms() {
    // Live Validation & Logo Upload Handlers for Redesigned Shop Profile
    setupProfileLiveValidation();

    // Shop Profile Save
    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', () => {
            const nameInput = document.getElementById('set-shop-name-input');
            const phoneInput = document.getElementById('set-shop-phone-input');
            const ownerInput = document.getElementById('set-owner-name-input');
            const emailInput = document.getElementById('set-shop-email-input');
            const addressInput = document.getElementById('set-shop-address-input');

            if (!nameInput.value.trim()) {
                Utils.showToast("Shop name is required.", "error");
                nameInput.focus();
                return;
            }

            if (!phoneInput.value.trim()) {
                Utils.showToast("Contact phone is required.", "error");
                phoneInput.focus();
                return;
            }

            // Animate Save Button to Loading State
            const btnIcon = document.getElementById('btn-save-profile-icon');
            const btnText = document.getElementById('btn-save-profile-text');
            btnSaveProfile.disabled = true;
            btnSaveProfile.classList.add('loading');
            if (btnIcon) {
                btnIcon.setAttribute('data-lucide', 'loader-2');
                btnIcon.classList.add('animate-spin');
            }
            if (btnText) btnText.textContent = "Saving Profile...";
            if (typeof lucide !== 'undefined') lucide.createIcons();

            setTimeout(() => {
                const settings = Storage.getSettings();
                settings.shopName = nameInput.value.trim();
                settings.shopPhone = phoneInput.value.trim();
                settings.shopAddress = addressInput.value.trim();
                settings.email = emailInput.value.trim();
                Storage.saveSettings(settings);

                // Update auth details
                const auth = Storage.getAuth() || {};
                auth.user = auth.user || {};
                auth.user.name = ownerInput.value.trim() || 'Owner Name';
                auth.user.email = emailInput.value.trim() || 'owner@grocery.com';
                Storage.saveAuth(auth);

                // Update UI
                document.getElementById('profile-shop-name').textContent = settings.shopName;
                const ownerNameVal = auth.user.name;
                const profileOwnerEl = document.getElementById('profile-owner-name');
                if (ownerNameVal && ownerNameVal.trim() && ownerNameVal !== 'Owner Name') {
                    profileOwnerEl.textContent = ownerNameVal;
                    profileOwnerEl.style.display = 'block';
                } else {
                    profileOwnerEl.textContent = 'Shop Owner';
                }

                // Update Preview Header Title
                const prevTitle = document.getElementById('preview-shop-title');
                if (prevTitle) prevTitle.textContent = settings.shopName;

                // Refresh global header
                Utils.initAppLayout('settings');

                // Animate Success State
                if (btnIcon) {
                    btnIcon.setAttribute('data-lucide', 'check-circle-2');
                    btnIcon.classList.remove('animate-spin');
                }
                if (btnText) btnText.textContent = "Profile Saved!";
                if (typeof lucide !== 'undefined') lucide.createIcons();

                Utils.showToast("Shop profile saved successfully.", "success");

                // Reset button state and slide out
                setTimeout(() => {
                    btnSaveProfile.disabled = false;
                    btnSaveProfile.classList.remove('loading');
                    if (btnIcon) btnIcon.setAttribute('data-lucide', 'save');
                    if (btnText) btnText.textContent = "Save Profile";
                    if (typeof lucide !== 'undefined') lucide.createIcons();

                    document.getElementById('subpage-profile').classList.remove('active');
                    const placeholder = document.getElementById('settings-tablet-placeholder');
                    if (placeholder && window.innerWidth >= 768) placeholder.style.display = 'block';
                }, 1200);
            }, 800);
        });
    }

    // Business Details Save & Validation Setup
    setupBusinessLiveValidation();

    const btnSaveBiz = document.getElementById('btn-save-business');
    if (btnSaveBiz) {
        btnSaveBiz.addEventListener('click', () => {
            const businessPhoneInput = document.getElementById('set-business-phone');
            const businessAddressInput = document.getElementById('set-business-address');
            const gstInput = document.getElementById('set-business-gst');
            const regInput = document.getElementById('set-business-reg');

            if (businessPhoneInput && !businessPhoneInput.value.trim()) {
                Utils.showToast("Business contact phone is required.", "error");
                businessPhoneInput.focus();
                return;
            }

            // Animate Save Button
            const btnIcon = document.getElementById('btn-save-biz-icon');
            const btnText = document.getElementById('btn-save-biz-text');
            btnSaveBiz.disabled = true;
            btnSaveBiz.classList.add('loading');
            if (btnIcon) {
                btnIcon.setAttribute('data-lucide', 'loader-2');
                btnIcon.classList.add('animate-spin');
            }
            if (btnText) btnText.textContent = "Saving Details...";
            if (typeof lucide !== 'undefined') lucide.createIcons();

            setTimeout(() => {
                const settings = Storage.getSettings();
                if (businessPhoneInput) settings.businessPhone = businessPhoneInput.value.trim();
                if (businessAddressInput) settings.businessAddress = businessAddressInput.value.trim();
                if (gstInput) settings.gstNumber = gstInput.value.trim();
                if (regInput) settings.regNumber = regInput.value.trim();
                Storage.saveSettings(settings);

                if (btnIcon) {
                    btnIcon.setAttribute('data-lucide', 'check-circle-2');
                    btnIcon.classList.remove('animate-spin');
                }
                if (btnText) btnText.textContent = "Details Saved!";
                if (typeof lucide !== 'undefined') lucide.createIcons();

                Utils.showToast("Business details saved successfully.", "success");

                setTimeout(() => {
                    btnSaveBiz.disabled = false;
                    btnSaveBiz.classList.remove('loading');
                    if (btnIcon) btnIcon.setAttribute('data-lucide', 'save');
                    if (btnText) btnText.textContent = "Save Details";
                    if (typeof lucide !== 'undefined') lucide.createIcons();

                    document.getElementById('subpage-business').classList.remove('active');
                    const placeholder = document.getElementById('settings-tablet-placeholder');
                    if (placeholder && window.innerWidth >= 768) placeholder.style.display = 'block';
                }, 1200);
            }, 800);
        });
    }

    // Bill & Invoice Settings Setup & Live Validation
    setupInvoiceLiveValidation();

    // Bill & Invoice Settings Save
    const billForm = document.getElementById('form-bill-settings');
    if (billForm) {
        billForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const taxEnabledInput = document.getElementById('set-tax-enabled');
            const taxRateInput = document.getElementById('set-tax-rate');
            const gstNumberInput = document.getElementById('set-gst-number');
            const invPrefixInput = document.getElementById('set-invoice-prefix');
            const defaultFormatInput = document.getElementById('set-default-bill-format');
            const shopLogoInput = document.getElementById('set-shop-logo-url');
            const billFooterInput = document.getElementById('set-bill-footer');

            const btnSaveInv = document.getElementById('btn-save-invoice-settings');
            const btnIcon = document.getElementById('btn-save-invoice-icon');
            const btnText = document.getElementById('btn-save-invoice-text');

            if (btnSaveInv) {
                btnSaveInv.disabled = true;
                btnSaveInv.classList.add('loading');
            }
            if (btnIcon) {
                btnIcon.setAttribute('data-lucide', 'loader-2');
                btnIcon.classList.add('animate-spin');
            }
            if (btnText) btnText.textContent = "Saving Settings...";
            if (typeof lucide !== 'undefined') lucide.createIcons();

            setTimeout(() => {
                const settings = Storage.getSettings();
                settings.taxEnabled = taxEnabledInput ? taxEnabledInput.checked : false;
                settings.taxRate = taxRateInput ? (parseFloat(taxRateInput.value) || 0) : 0;
                settings.gstNumber = gstNumberInput ? gstNumberInput.value.trim() : '';
                settings.invoicePrefix = invPrefixInput ? (invPrefixInput.value.trim() || 'INV-') : 'INV-';
                settings.defaultBillFormat = defaultFormatInput ? defaultFormatInput.value : 'thermal-80';
                settings.shopLogo = shopLogoInput ? shopLogoInput.value.trim() : '';
                settings.billFooter = billFooterInput ? billFooterInput.value.trim() : 'Thank you for shopping with us!';

                Storage.saveSettings(settings);

                // Sync GST to business details field if present
                if (document.getElementById('set-business-gst')) {
                    document.getElementById('set-business-gst').value = settings.gstNumber;
                }

                if (btnIcon) {
                    btnIcon.setAttribute('data-lucide', 'check-circle-2');
                    btnIcon.classList.remove('animate-spin');
                }
                if (btnText) btnText.textContent = "Settings Saved!";
                if (typeof lucide !== 'undefined') lucide.createIcons();

                Utils.showToast("Bill & Invoice settings saved successfully.", "success");

                setTimeout(() => {
                    if (btnSaveInv) {
                        btnSaveInv.disabled = false;
                        btnSaveInv.classList.remove('loading');
                    }
                    if (btnIcon) btnIcon.setAttribute('data-lucide', 'save');
                    if (btnText) btnText.textContent = "Save Bill & Invoice Settings";
                    if (typeof lucide !== 'undefined') lucide.createIcons();

                    document.getElementById('subpage-invoice-settings').classList.remove('active');
                    const placeholder = document.getElementById('settings-tablet-placeholder');
                    if (placeholder && window.innerWidth >= 768) placeholder.style.display = 'block';
                }, 1000);
            }, 600);
        });
    }
}

/* LIVE RECEIPT PREVIEW, LOGO PICKER & FORM VALIDATION */
function setupInvoiceLiveValidation() {
    const taxToggle = document.getElementById('set-tax-enabled');
    const taxSubfields = document.getElementById('tax-subfields-container');
    const taxRateInput = document.getElementById('set-tax-rate');
    const gstInput = document.getElementById('set-gst-number');
    const invPrefixInput = document.getElementById('set-invoice-prefix');
    const formatSelect = document.getElementById('set-default-bill-format');
    const formatChips = document.querySelectorAll('.format-chip');
    const billFooterInput = document.getElementById('set-bill-footer');
    const fileLogoInput = document.getElementById('file-invoice-logo-input');
    const hiddenLogoUrl = document.getElementById('set-shop-logo-url');

    // Receipt Simulator Elements
    const previewToggleBtn = document.getElementById('btn-toggle-receipt-preview');
    const previewWrap = document.getElementById('receipt-paper-wrap');
    const previewChevron = document.getElementById('preview-chevron-icon');

    const prevShopName = document.getElementById('preview-receipt-shop-name');
    const prevShopAddress = document.getElementById('preview-receipt-address');
    const prevGst = document.getElementById('preview-receipt-gst');
    const prevInvNo = document.getElementById('preview-receipt-inv-no');
    const prevBarcodeCode = document.getElementById('preview-barcode-code');
    const prevFormatBadge = document.getElementById('preview-receipt-format-badge');
    const prevTaxRow = document.getElementById('preview-tax-row');
    const prevTaxLabel = document.getElementById('preview-tax-label');
    const prevTaxVal = document.getElementById('preview-tax-val');
    const prevGrandTotal = document.getElementById('preview-grand-total');
    const prevFooterText = document.getElementById('preview-receipt-footer-text');
    const prevLogoImg = document.getElementById('preview-receipt-logo-img');
    const prevLogoPlaceholder = document.getElementById('preview-receipt-logo-placeholder');

    // Logo Uploader Card UI elements
    const logoPreviewBox = document.getElementById('invoice-logo-preview-box');
    const logoImg = document.getElementById('invoice-logo-img');
    const logoIcon = document.getElementById('invoice-logo-icon');
    const logoFilename = document.getElementById('invoice-logo-filename');
    const btnUploadText = document.getElementById('btn-logo-upload-text');
    const btnRemoveLogo = document.getElementById('btn-remove-invoice-logo');

    // 1. Toggle Receipt Preview Accordion
    if (previewToggleBtn && previewWrap) {
        previewToggleBtn.addEventListener('click', () => {
            const isOpen = previewWrap.classList.toggle('open');
            if (previewChevron) {
                previewChevron.classList.toggle('open', isOpen);
            }
        });
    }

    // 2. Function to update live receipt preview simulator
    function updateLiveReceiptPreview() {
        const settings = Storage.getSettings();
        const shopName = settings.shopName || 'Greenway Groceries';
        const shopAddress = settings.shopAddress || settings.businessAddress || '123 Main Street, Market Area';

        if (prevShopName) prevShopName.textContent = shopName;
        if (prevShopAddress) prevShopAddress.textContent = shopAddress;

        // GST update
        const gstVal = gstInput ? gstInput.value.trim().toUpperCase() : '';
        if (prevGst) {
            if (gstVal) {
                prevGst.textContent = `GSTIN: ${gstVal}`;
                prevGst.style.display = 'block';
            } else {
                prevGst.style.display = 'none';
            }
        }

        // Invoice Prefix
        const prefix = invPrefixInput ? (invPrefixInput.value.trim() || 'INV-') : 'INV-';
        const sampleInv = `${prefix}2026-0892`;
        if (prevInvNo) prevInvNo.textContent = sampleInv;
        if (prevBarcodeCode) prevBarcodeCode.textContent = sampleInv;

        // Format Badge
        const fmt = formatSelect ? formatSelect.value : 'thermal-80';
        let fmtText = '80mm Thermal';
        if (fmt === 'thermal-58') fmtText = '58mm Thermal';
        if (fmt === 'a4') fmtText = 'A4 Full Page';
        if (prevFormatBadge) prevFormatBadge.textContent = fmtText;

        // Tax calculation preview
        const isTaxEnabled = taxToggle ? taxToggle.checked : false;
        const rate = taxRateInput ? (parseFloat(taxRateInput.value) || 0) : 0;
        const subtotal = 340.00;

        if (prevTaxRow) {
            if (isTaxEnabled && rate > 0) {
                const taxAmt = (subtotal * rate) / 100;
                const grandTotal = subtotal + taxAmt;
                if (prevTaxLabel) prevTaxLabel.textContent = `Tax / GST (${rate}%)`;
                if (prevTaxVal) prevTaxVal.textContent = `₹${taxAmt.toFixed(2)}`;
                if (prevGrandTotal) prevGrandTotal.textContent = `₹${grandTotal.toFixed(2)}`;
                prevTaxRow.style.display = 'flex';
            } else {
                prevTaxRow.style.display = 'none';
                if (prevGrandTotal) prevGrandTotal.textContent = `₹${subtotal.toFixed(2)}`;
            }
        }

        // Footer Note
        const footerNote = billFooterInput ? billFooterInput.value.trim() : '';
        if (prevFooterText) {
            prevFooterText.textContent = footerNote || 'Thank you for shopping with us! Visit again.';
        }

        // Logo image preview update
        const currentLogo = hiddenLogoUrl ? hiddenLogoUrl.value : '';
        if (currentLogo) {
            if (prevLogoImg) {
                prevLogoImg.src = currentLogo;
                prevLogoImg.style.display = 'block';
            }
            if (prevLogoPlaceholder) prevLogoPlaceholder.style.display = 'none';
        } else {
            if (prevLogoImg) prevLogoImg.style.display = 'none';
            if (prevLogoPlaceholder) prevLogoPlaceholder.style.display = 'block';
        }
    }

    // 3. Tax Master Switch Toggle behavior
    if (taxToggle && taxSubfields) {
        taxToggle.addEventListener('change', () => {
            if (taxToggle.checked) {
                taxSubfields.classList.remove('disabled-state');
            } else {
                taxSubfields.classList.add('disabled-state');
            }
            updateLiveReceiptPreview();
        });
        // Initial state sync
        if (!taxToggle.checked) {
            taxSubfields.classList.add('disabled-state');
        }
    }

    // 4. GST Validation Rule (15-character GSTIN format: 2 digits + 10 alphanumeric + 1 digit/char + Z + 1 digit/char)
    if (gstInput) {
        const wrapGst = document.getElementById('wrap-invoice-gst');
        const badgeGst = document.getElementById('badge-invoice-gst');
        const helperGst = document.getElementById('helper-invoice-gst');
        const validGstIcon = document.getElementById('valid-invoice-gst');

        const validateGst = () => {
            const val = gstInput.value.trim().toUpperCase();
            gstInput.value = val;
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

            if (!val) {
                if (wrapGst) wrapGst.classList.remove('invalid', 'valid');
                if (badgeGst) {
                    badgeGst.textContent = "GSTIN Format";
                    badgeGst.className = "field-badge req-pill";
                }
                if (helperGst) {
                    helperGst.textContent = "15-digit India GSTIN (e.g., 29AAAAA0000A1Z5)";
                    helperGst.style.color = "";
                }
                if (validGstIcon) validGstIcon.style.display = 'none';
            } else if (gstRegex.test(val)) {
                if (wrapGst) {
                    wrapGst.classList.remove('invalid');
                    wrapGst.classList.add('valid');
                }
                if (badgeGst) {
                    badgeGst.textContent = "✓ Valid GSTIN";
                    badgeGst.className = "field-badge req-pill valid";
                }
                if (helperGst) {
                    helperGst.textContent = "GSTIN format verified & compliant";
                    helperGst.style.color = "var(--success)";
                }
                if (validGstIcon) validGstIcon.style.display = 'block';
            } else {
                if (wrapGst) {
                    wrapGst.classList.remove('valid');
                    wrapGst.classList.add('invalid');
                }
                if (badgeGst) {
                    badgeGst.textContent = "Invalid GSTIN";
                    badgeGst.className = "field-badge req-pill invalid";
                }
                if (helperGst) {
                    helperGst.textContent = "Expected format: 15-digit code e.g. 07AAAAA1111A1Z1";
                    helperGst.style.color = "var(--danger)";
                }
                if (validGstIcon) validGstIcon.style.display = 'none';
            }
            updateLiveReceiptPreview();
        };

        gstInput.addEventListener('input', validateGst);
        gstInput.addEventListener('blur', validateGst);
    }

    // 5. Logo File Upload & Image Converter (Base64 data URL)
    if (fileLogoInput) {
        fileLogoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    Utils.showToast("Logo image size should be under 2MB.", "warning");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const dataUrl = evt.target.result;
                    if (hiddenLogoUrl) hiddenLogoUrl.value = dataUrl;
                    if (logoImg) {
                        logoImg.src = dataUrl;
                        logoImg.style.display = 'block';
                    }
                    if (logoIcon) logoIcon.style.display = 'none';
                    if (logoFilename) logoFilename.textContent = file.name;
                    if (btnUploadText) btnUploadText.textContent = "Change Logo";
                    if (btnRemoveLogo) btnRemoveLogo.style.display = 'inline-flex';

                    updateLiveReceiptPreview();
                    Utils.showToast("Logo attached successfully.", "success");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnRemoveLogo) {
        btnRemoveLogo.addEventListener('click', () => {
            if (hiddenLogoUrl) hiddenLogoUrl.value = '';
            if (logoImg) logoImg.style.display = 'none';
            if (logoIcon) logoIcon.style.display = 'block';
            if (logoFilename) logoFilename.textContent = 'No Custom Logo Selected';
            if (btnUploadText) btnUploadText.textContent = 'Upload Logo';
            if (btnRemoveLogo) btnRemoveLogo.style.display = 'none';
            if (fileLogoInput) fileLogoInput.value = '';

            updateLiveReceiptPreview();
            Utils.showToast("Logo removed.", "info");
        });
    }

    // 6. Print Format Dropdown and Visual Chips Synchronization
    if (formatSelect && formatChips.length) {
        formatSelect.addEventListener('change', () => {
            const selectedVal = formatSelect.value;
            formatChips.forEach(chip => {
                if (chip.dataset.format === selectedVal) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
            });
            updateLiveReceiptPreview();
        });

        formatChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const targetFmt = chip.dataset.format;
                if (formatSelect) formatSelect.value = targetFmt;
                formatChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                updateLiveReceiptPreview();
            });
        });
    }

    // 7. Live listeners for inputs -> update receipt preview
    [taxRateInput, invPrefixInput, billFooterInput].forEach(inputEl => {
        if (inputEl) {
            inputEl.addEventListener('input', updateLiveReceiptPreview);
        }
    });

    // 8. Populate existing logo into Uploader UI on load
    const existingLogo = hiddenLogoUrl ? hiddenLogoUrl.value : '';
    if (existingLogo) {
        if (logoImg) {
            logoImg.src = existingLogo;
            logoImg.style.display = 'block';
        }
        if (logoIcon) logoIcon.style.display = 'none';
        if (logoFilename) logoFilename.textContent = "Custom Store Logo";
        if (btnUploadText) btnUploadText.textContent = "Change Logo";
        if (btnRemoveLogo) btnRemoveLogo.style.display = 'inline-flex';
    }

    // Initial preview render
    setTimeout(updateLiveReceiptPreview, 100);
}

/* DATA BACKUP & RECOVERY HANDLERS */
function setupDataOperations() {
    // Direct exports on main settings
    const btnMainExport = document.getElementById('row-export-data');
    if (btnMainExport) {
        btnMainExport.addEventListener('click', (e) => {
            handleBackupExport(e);
        });
    }

    // Exports inside subpage
    const btnSubExport = document.querySelector('#subpage-backup #btn-data-export');
    if (btnSubExport) {
        btnSubExport.addEventListener('click', (e) => {
            handleBackupExport(e);
        });
    }

    // Direct imports file loader bind (Main page)
    const fileLoaderMain = document.getElementById('data-import-file-loader');
    if (fileLoaderMain) {
        fileLoaderMain.addEventListener('change', (e) => {
            handleBackupImport(e);
        });
    }

    // Subpage file loader trigger
    const fileLoaderSub = document.getElementById('data-import-file-loader-subpage');
    if (fileLoaderSub) {
        fileLoaderSub.addEventListener('change', (e) => {
            handleBackupImport(e);
        });
    }

    // Clear Demo Data (Subpage and dangerous elements)
    const btnClearDemo = document.querySelector('#subpage-backup #btn-clear-demo');
    if (btnClearDemo) {
        btnClearDemo.addEventListener('click', () => {
            Utils.confirm(
                "Clear Demo Records?",
                "Are you sure you want to erase all customer registry, stock products, and sales transactions? (Your settings will remain intact)",
                () => {
                    Storage.clearAllData();
                    Utils.showToast("Demo records cleared successfully.", "success");
                    setTimeout(() => { window.location.reload(); }, 1000);
                }
            );
        });
    }

    // Reset Application Completely (Subpage and dangerous elements)
    const btnResetApp = document.querySelector('#subpage-backup #btn-reset-app');
    if (btnResetApp) {
        btnResetApp.addEventListener('click', () => {
            Utils.confirm(
                "RESET APPLICATION COMPLETELY?",
                "CRITICAL: This deletes all databases, transactions, logs, settings, preferences, and backups permanently! The application will revert to clean defaults.",
                () => {
                    Storage.resetApplication();
                    Utils.showToast("Application has been hard reset.", "success");
                    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                }
            );
        });
    }
}

function handleBackupExport(e) {
    e.preventDefault();
    const backupJson = Storage.exportData();

    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const formattedDate = new Date().toISOString().slice(0, 10);
    const fileName = `grocery_backup_${formattedDate}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Utils.showToast("JSON backup generated and downloaded.", "success");
}

function handleBackupImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const fileContent = evt.target.result;
        const result = Storage.importData(fileContent);

        if (result) {
            Utils.showToast("Shop backup database restored!", "success");
            setTimeout(() => { window.location.reload(); }, 1500);
        } else {
            Utils.showToast("Failed to parse file. Ensure it is a valid backup JSON.", "error");
        }
    };
    reader.readAsText(file);
}

/* STAGE 5: MARKET PRICE & SMART STOCK SETTINGS */
function setupMarketSettingsModal() {
    const rowTrigger = document.getElementById('row-market-settings');
    const modal = document.getElementById('modal-market-settings');
    const closeBtn = document.getElementById('modal-market-settings-close');
    const cancelBtn = document.getElementById('btn-market-settings-cancel');
    const form = document.getElementById('form-market-settings');

    const locValSpan = document.getElementById('val-market-loc');
    const locSelect = document.getElementById('setting-market-location');
    const freqSelect = document.getElementById('setting-market-refresh-freq');
    const alertsToggle = document.getElementById('setting-price-alerts-toggle');
    const thresholdSelect = document.getElementById('setting-price-alert-threshold');
    const safetyDaysInput = document.getElementById('setting-safety-buffer-days');
    const leadDaysInput = document.getElementById('setting-supplier-lead-days');

    // Populate initial values
    const settings = Storage.getSettings();
    if (locValSpan) locValSpan.textContent = settings.marketDefaultLocation || 'Kerala';
    if (locSelect) locSelect.value = settings.marketDefaultLocation || 'Kerala';
    if (freqSelect) freqSelect.value = settings.marketRefreshFrequency || 'manual';
    if (alertsToggle) alertsToggle.checked = settings.notifPriceAlerts !== false;
    if (thresholdSelect) thresholdSelect.value = String(settings.priceAlertThreshold || 5);
    if (safetyDaysInput) safetyDaysInput.value = settings.defaultSafetyStockDays || 3;
    if (leadDaysInput) leadDaysInput.value = settings.defaultSupplierLeadTime || 3;

    const openModal = () => {
        if (modal) modal.classList.add('active');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    const closeModal = () => {
        if (modal) modal.classList.remove('active');
    };

    if (rowTrigger) rowTrigger.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const newLoc = locSelect ? locSelect.value : 'Kerala';
            const newFreq = freqSelect ? freqSelect.value : 'manual';
            const newAlerts = alertsToggle ? alertsToggle.checked : true;
            const newThreshold = thresholdSelect ? parseInt(thresholdSelect.value, 10) : 5;
            const newSafety = safetyDaysInput ? (parseInt(safetyDaysInput.value, 10) || 3) : 3;
            const newLead = leadDaysInput ? (parseInt(leadDaysInput.value, 10) || 3) : 3;

            Storage.saveSettings({
                marketDefaultLocation: newLoc,
                marketRefreshFrequency: newFreq,
                notifPriceAlerts: newAlerts,
                priceAlertThreshold: newThreshold,
                defaultSafetyStockDays: newSafety,
                defaultSupplierLeadTime: newLead
            });

            if (locValSpan) locValSpan.textContent = newLoc;
            closeModal();
            Utils.showToast("Market price and stock parameters saved", "success");
        });
    }
}

/* REDESIGNED SHOP PROFILE LIVE VALIDATION & LOGO PREVIEW */
function setupProfileLiveValidation() {
    const shopNameInput = document.getElementById('set-shop-name-input');
    const phoneInput = document.getElementById('set-shop-phone-input');
    const emailInput = document.getElementById('set-shop-email-input');
    const logoFileInput = document.getElementById('set-shop-logo-file');
    const btnDeactivate = document.getElementById('btn-deactivate-terminal');

    // Logo Upload Handling
    if (logoFileInput) {
        logoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const imgEl = document.getElementById('logo-avatar-img');
                    const iconEl = document.getElementById('logo-avatar-icon');
                    if (imgEl && iconEl) {
                        imgEl.src = evt.target.result;
                        imgEl.style.display = 'block';
                        iconEl.style.display = 'none';
                    }
                    Utils.showToast("Shop logo preview updated.", "info");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Deactivate Terminal Button
    if (btnDeactivate) {
        btnDeactivate.addEventListener('click', () => {
            if (confirm("Are you sure you want to deactivate POS access for this device? Local register cache will be unlinked.")) {
                Utils.showToast("Device terminal deactivated.", "warning");
            }
        });
    }

    // Input Typing Handlers for Real-time Feedback
    const validateFields = () => {
        if (shopNameInput) {
            const nameVal = shopNameInput.value.trim();
            const wrap = document.getElementById('wrap-shop-name');
            const previewTitle = document.getElementById('preview-shop-title');
            if (previewTitle && nameVal) previewTitle.textContent = nameVal;

            if (wrap) {
                if (nameVal.length > 0) {
                    wrap.classList.remove('invalid-state');
                    wrap.classList.add('valid-state');
                } else {
                    wrap.classList.remove('valid-state');
                    wrap.classList.add('invalid-state');
                }
            }
        }

        if (phoneInput) {
            const phoneVal = phoneInput.value.trim();
            const phoneDigits = phoneVal.replace(/[^0-9]/g, '');
            const wrapPhone = document.getElementById('wrap-shop-phone');
            const badgePhone = document.getElementById('badge-phone-val');
            const helperPhone = document.getElementById('helper-shop-phone');

            if (wrapPhone) {
                if (phoneDigits.length >= 10) {
                    wrapPhone.className = 'icon-input-wrap valid-state';
                    if (badgePhone) {
                        badgePhone.textContent = 'Valid';
                        badgePhone.className = 'field-badge req-pill';
                    }
                    if (helperPhone) {
                        helperPhone.textContent = '10-digit mobile number for order & WhatsApp notifications';
                    }
                } else {
                    wrapPhone.className = 'icon-input-wrap invalid-state';
                    if (badgePhone) {
                        badgePhone.textContent = 'Invalid Phone';
                        badgePhone.className = 'field-badge req-pill';
                    }
                    if (helperPhone) {
                        helperPhone.textContent = 'Please enter a valid 10-digit contact phone number';
                    }
                }
            }
        }

        if (emailInput) {
            const emailVal = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const wrapEmail = document.getElementById('wrap-shop-email');
            const badgeEmail = document.getElementById('badge-email-val');
            const helperEmail = document.getElementById('helper-shop-email');

            if (wrapEmail) {
                if (!emailVal || emailRegex.test(emailVal)) {
                    wrapEmail.className = 'icon-input-wrap valid-state';
                    if (badgeEmail) {
                        badgeEmail.textContent = emailVal ? 'Valid' : 'Optional';
                        badgeEmail.className = 'field-badge opt-pill';
                    }
                    if (helperEmail) {
                        helperEmail.textContent = 'Used for digital invoices, sales summaries & security alerts';
                    }
                } else {
                    wrapEmail.className = 'icon-input-wrap invalid-state';
                    if (badgeEmail) {
                        badgeEmail.textContent = 'Invalid Email';
                        badgeEmail.className = 'field-badge opt-pill';
                    }
                    if (helperEmail) {
                        helperEmail.textContent = 'Please enter a valid email address format (e.g. owner@grocery.com)';
                    }
                }
            }
        }
    };

    // Debounced Automatic Save Function (Autosave)
    let autosaveTimer = null;
    const ownerNameInput = document.getElementById('set-owner-name-input');
    const addressInput = document.getElementById('set-shop-address-input');
    const autosaveStatusBadge = document.getElementById('profile-autosave-status');

    const triggerAutosave = () => {
        if (autosaveStatusBadge) {
            autosaveStatusBadge.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Saving...';
            autosaveStatusBadge.className = 'profile-autosave-tag saving';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            const nameVal = shopNameInput ? shopNameInput.value.trim() : '';
            const phoneVal = phoneInput ? phoneInput.value.trim() : '';
            const ownerVal = ownerNameInput ? ownerNameInput.value.trim() : '';
            const emailVal = emailInput ? emailInput.value.trim() : '';
            const addressVal = addressInput ? addressInput.value.trim() : '';

            // Save to Storage
            const settings = Storage.getSettings();
            if (nameVal) settings.shopName = nameVal;
            if (phoneVal) settings.shopPhone = phoneVal;
            settings.shopAddress = addressVal;
            settings.email = emailVal;
            Storage.saveSettings(settings);

            // Save Auth User
            const auth = Storage.getAuth() || {};
            auth.user = auth.user || {};
            if (ownerVal) auth.user.name = ownerVal;
            if (emailVal) auth.user.email = emailVal;
            Storage.saveAuth(auth);

            // Update UI Labels
            const profShopName = document.getElementById('profile-shop-name');
            if (profShopName && nameVal) profShopName.textContent = nameVal;
            
            const profileOwnerEl = document.getElementById('profile-owner-name');
            if (profileOwnerEl) {
                if (ownerVal && ownerVal !== 'Owner Name') {
                    profileOwnerEl.textContent = ownerVal;
                    profileOwnerEl.style.display = 'block';
                } else {
                    profileOwnerEl.textContent = 'Shop Owner';
                }
            }

            // Update Status Badge
            if (autosaveStatusBadge) {
                autosaveStatusBadge.innerHTML = '<i data-lucide="check"></i> Auto-saved';
                autosaveStatusBadge.className = 'profile-autosave-tag';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }, 400);
    };

    // Attach input & change event listeners to trigger live validation + autosave
    const allInputs = [shopNameInput, ownerNameInput, phoneInput, emailInput, addressInput];
    allInputs.forEach(inputEl => {
        if (inputEl) {
            inputEl.addEventListener('input', () => {
                validateFields();
                triggerAutosave();
            });
            inputEl.addEventListener('change', () => {
                validateFields();
                triggerAutosave();
            });
        }
    });

    // Initial validation check
    validateFields();
}

/* REDESIGNED BUSINESS DETAILS LIVE VALIDATION & PROOF DOCUMENT UPLOADS */
function setupBusinessLiveValidation() {
    const bizPhoneInput = document.getElementById('set-business-phone');
    const gstInput = document.getElementById('set-business-gst');
    const gstDocInput = document.getElementById('file-gst-doc-input');
    const licenseDocInput = document.getElementById('file-license-doc-input');

    // Proof Document Upload Handlers
    if (gstDocInput) {
        gstDocInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const titleEl = document.getElementById('text-gst-doc-name');
                const statusEl = document.getElementById('text-gst-doc-status');
                if (titleEl) titleEl.textContent = file.name;
                if (statusEl) {
                    statusEl.innerHTML = '&check; Certificate Uploaded (Verified)';
                    statusEl.style.color = 'var(--success)';
                }
                Utils.showToast("GST Certificate proof document uploaded.", "success");
            }
        });
    }

    if (licenseDocInput) {
        licenseDocInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const titleEl = document.getElementById('text-license-doc-name');
                const statusEl = document.getElementById('text-license-doc-status');
                if (titleEl) titleEl.textContent = file.name;
                if (statusEl) {
                    statusEl.innerHTML = '&check; Trade License Copy Attached';
                    statusEl.style.color = 'var(--success)';
                }
                Utils.showToast("Trade license proof document attached.", "success");
            }
        });
    }

    // Input Validation Handlers
    const validateBizFields = () => {
        if (bizPhoneInput) {
            const phoneVal = bizPhoneInput.value.trim();
            const phoneDigits = phoneVal.replace(/[^0-9]/g, '');
            const wrapPhone = document.getElementById('wrap-biz-phone');
            const badgePhone = document.getElementById('badge-biz-phone');
            const helperPhone = document.getElementById('helper-biz-phone');

            if (wrapPhone) {
                if (phoneDigits.length >= 10) {
                    wrapPhone.className = 'icon-input-wrap valid-state';
                    if (badgePhone) {
                        badgePhone.textContent = 'Valid Number';
                        badgePhone.className = 'field-badge req-pill';
                    }
                    if (helperPhone) {
                        helperPhone.textContent = 'Official 10-digit line for tax invoices & supplier communications';
                    }
                } else {
                    wrapPhone.className = 'icon-input-wrap invalid-state';
                    if (badgePhone) {
                        badgePhone.textContent = 'Invalid Phone';
                        badgePhone.className = 'field-badge req-pill';
                    }
                    if (helperPhone) {
                        helperPhone.textContent = 'Please enter a valid 10-digit contact number';
                    }
                }
            }
        }

        if (gstInput) {
            const gstVal = gstInput.value.trim().toUpperCase();
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            const wrapGst = document.getElementById('wrap-biz-gst');
            const badgeGst = document.getElementById('badge-biz-gst');
            const helperGst = document.getElementById('helper-biz-gst');

            if (wrapGst) {
                if (!gstVal || gstRegex.test(gstVal) || gstVal.length === 15) {
                    wrapGst.className = 'icon-input-wrap valid-state';
                    if (badgeGst) {
                        badgeGst.textContent = gstVal ? 'GSTIN Valid' : 'GSTIN Format';
                        badgeGst.className = 'field-badge req-pill';
                    }
                    if (helperGst) {
                        helperGst.textContent = '15-digit GSTIN used for GST-compliant invoicing & tax filing';
                    }
                } else {
                    wrapGst.className = 'icon-input-wrap invalid-state';
                    if (badgeGst) {
                        badgeGst.textContent = 'Invalid GSTIN';
                        badgeGst.className = 'field-badge req-pill';
                    }
                    if (helperGst) {
                        helperGst.textContent = 'Please enter a valid 15-digit Indian GSTIN (e.g. 07AAAAA1111A1Z1)';
                    }
                }
            }
        }
    };

    // Debounced Automatic Save Function (Autosave) for Business Details
    let bizAutosaveTimer = null;
    const bizAddrInput = document.getElementById('set-business-address');
    const regInput = document.getElementById('set-business-reg');
    const bizAutosaveStatusBadge = document.getElementById('biz-autosave-status');

    const triggerBizAutosave = () => {
        if (bizAutosaveStatusBadge) {
            bizAutosaveStatusBadge.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Saving...';
            bizAutosaveStatusBadge.className = 'profile-autosave-tag saving';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        clearTimeout(bizAutosaveTimer);
        bizAutosaveTimer = setTimeout(() => {
            const phoneVal = bizPhoneInput ? bizPhoneInput.value.trim() : '';
            const addrVal = bizAddrInput ? bizAddrInput.value.trim() : '';
            const gstVal = gstInput ? gstInput.value.trim() : '';
            const regVal = regInput ? regInput.value.trim() : '';

            // Save to Storage
            const settings = Storage.getSettings();
            if (phoneVal) settings.businessPhone = phoneVal;
            settings.businessAddress = addrVal;
            settings.gstNumber = gstVal;
            settings.regNumber = regVal;
            Storage.saveSettings(settings);

            // Update Status Badge
            if (bizAutosaveStatusBadge) {
                bizAutosaveStatusBadge.innerHTML = '<i data-lucide="check"></i> Auto-saved';
                bizAutosaveStatusBadge.className = 'profile-autosave-tag';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }, 400);
    };

    // Attach input & change event listeners to trigger live validation + autosave
    const allBizInputs = [bizPhoneInput, bizAddrInput, gstInput, regInput];
    allBizInputs.forEach(inputEl => {
        if (inputEl) {
            inputEl.addEventListener('input', () => {
                validateBizFields();
                triggerBizAutosave();
            });
            inputEl.addEventListener('change', () => {
                validateBizFields();
                triggerBizAutosave();
            });
        }
    });

    validateBizFields();
}


