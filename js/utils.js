/**
 * Shared Helper Utilities & UI Layout Components (UI Redesigned - Light Mode Default, Teal Accent)
 */

const Utils = {
    // --- FORMATTERS ---
    formatCurrency(amount) {
        const settings = Storage.getSettings();
        const currency = settings.currency || '₹';
        const parsed = parseFloat(amount);
        if (isNaN(parsed)) return `${currency}0.00`;
        return `${currency}${parsed.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // --- FORM VALIDATION ---
    validatePhone(phone) {
        const re = /^\+?[0-9\s\-]{10,15}$/;
        return re.test(phone.trim());
    },

    // --- ID GENERATOR ---
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    },

    // --- TOAST NOTIFICATIONS ---
    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'x-circle';
        if (type === 'warning') iconName = 'alert-triangle';

        toast.innerHTML = `
            <div class="toast-icon-wrap">
                <i data-lucide="${iconName}"></i>
            </div>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    },

    // --- CUSTOM CONFIRM DIALOG ---
    confirm(title, message, onConfirm, onCancel = null, confirmText = 'Delete', cancelText = 'Cancel') {
        let overlay = document.getElementById('global-dialog-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-dialog-overlay';
            overlay.className = 'dialog-overlay';
            overlay.innerHTML = `
                <div class="dialog-box">
                    <div style="color: var(--danger); margin-bottom: 12px; display: inline-flex; align-items: center; justify-content: center; background-color: var(--danger-tint); width: 44px; height: 44px; border-radius: 50%;">
                        <i data-lucide="alert-triangle" style="width: 20px; height: 20px; stroke-width: 2.2px;"></i>
                    </div>
                    <div class="dialog-title" id="global-dialog-title"></div>
                    <div class="dialog-msg" id="global-dialog-msg"></div>
                    <div class="dialog-buttons">
                        <button class="btn btn-secondary btn-sm" id="global-dialog-cancel" style="flex: 1;">Cancel</button>
                        <button class="btn btn-danger btn-sm" id="global-dialog-confirm" style="flex: 1;">Delete</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const titleEl = document.getElementById('global-dialog-title');
        const msgEl = document.getElementById('global-dialog-msg');
        const cancelBtn = document.getElementById('global-dialog-cancel');
        const confirmBtn = document.getElementById('global-dialog-confirm');

        titleEl.textContent = title;
        msgEl.textContent = message;
        cancelBtn.textContent = cancelText || 'Cancel';
        confirmBtn.textContent = confirmText || 'Delete';

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Block background scroll
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        const cleanUp = () => {
            overlay.classList.remove('active');
            const activeModals = document.querySelectorAll('.modal-overlay.active, .dialog-overlay.active');
            if (activeModals.length === 0) {
                document.body.style.overflow = ''; // Restore background scroll
            }
            const newCancel = cancelBtn.cloneNode(true);
            const newConfirm = confirmBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
            confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        };

        document.getElementById('global-dialog-cancel').addEventListener('click', () => {
            cleanUp();
            if (typeof onCancel === 'function') onCancel();
        });
        document.getElementById('global-dialog-confirm').addEventListener('click', () => {
            cleanUp();
            if (typeof onConfirm === 'function') onConfirm();
        });
    },

    // --- APP SHELL INJECTION ---
    initAppLayout(activePage = 'home') {
        const settings = Storage.getSettings();
        const unreadCount = Storage.getNotifications().filter(n => !n.read).length;

        // Apply saved theme on boot
        let savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
            savedTheme = settings.theme || 'dark';
        }
        if (savedTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            savedTheme = prefersDark ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        localStorage.setItem('theme', savedTheme);

        // Dynamic time greeting
        const hour = new Date().getHours();
        let timeGreeting = 'Welcome back';
        if (hour < 12) timeGreeting = 'Good morning';
        else if (hour < 17) timeGreeting = 'Good afternoon';
        else timeGreeting = 'Good evening';

        // 1. Inject Header (No emojis)
        const headerContainer = document.getElementById('app-header');
        if (headerContainer) {
            headerContainer.className = 'header-bar';
            headerContainer.innerHTML = `
                <div class="header-title" style="display: flex; align-items: center; gap: 8px;">
                    <div class="cashly-logo-badge" style="width: 28px; height: 28px; border-radius: 50%; background-color: rgba(37, 99, 235, 0.1); display: flex; align-items: center; justify-content: center; color: #2563EB; flex-shrink: 0;"><i data-lucide="wallet" style="width: 16px; height: 16px; stroke-width: 2.5px;"></i></div><div style="font-size: 16px; font-weight: 800; color: var(--text); letter-spacing: -0.3px;">Cashly</div>
                </div>
                <div class="header-actions" style="display: flex; align-items: center; gap: 6px;">
                    <button type="button" id="global-theme-toggle-btn" class="icon-btn" aria-label="Toggle Dark/Light Mode" title="Toggle Theme">
                        <i data-lucide="${savedTheme === 'light' ? 'sun' : 'moon'}"></i>
                    </button>
                    <a href="notifications.html" class="icon-btn" aria-label="Notifications" title="Notifications" style="position: relative;">
                        <i data-lucide="bell"></i>
                        ${unreadCount > 0 ? `<span class="badge-unread-dot" style="position: absolute; top: 0; right: 0; width: 8px; height: 8px; border-radius: 50%; background-color: var(--danger); border: 1.5px solid var(--surface);"></span>` : ''}
                    </a>
                    <a href="settings.html" class="icon-btn" aria-label="Settings" title="Settings">
                        <i data-lucide="settings"></i>
                    </a>
                </div>
            `;

            // Bind global theme toggle button event
            const themeToggleBtn = document.getElementById('global-theme-toggle-btn');
            if (themeToggleBtn) {
                themeToggleBtn.addEventListener('click', () => {
                    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
                    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', newTheme);
                    document.documentElement.classList.toggle('dark', newTheme === 'dark');
                    localStorage.setItem('theme', newTheme);
                    
                    const curSettings = Storage.getSettings();
                    curSettings.theme = newTheme;
                    Storage.saveSettings(curSettings);

                    const icon = themeToggleBtn.querySelector('i');
                    if (icon) {
                        icon.setAttribute('data-lucide', newTheme === 'light' ? 'sun' : 'moon');
                        if (typeof lucide !== 'undefined') {
                            lucide.createIcons();
                        }
                    }
                    if (typeof Utils.showToast === 'function') {
                        Utils.showToast(`Switched to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode`, 'info');
                    }
                });
            }
        }

        // 2. Inject Premium Floating Bottom Nav (4-item grid)
        let navContainer = document.getElementById('app-navigation');
        if (!navContainer) {
            navContainer = document.createElement('nav');
            navContainer.id = 'app-navigation';
            document.body.appendChild(navContainer);
        }

        navContainer.className = 'bottom-nav';
        navContainer.setAttribute('role', 'navigation');
        navContainer.setAttribute('aria-label', 'Main Navigation');
        navContainer.innerHTML = `
            <a href="index.html" class="bottom-nav-item ${activePage === 'home' ? 'active' : ''}" aria-label="Home" ${activePage === 'home' ? 'aria-current="page"' : ''}>
                <div class="bottom-nav-icon"><i data-lucide="home"></i></div>
                <span class="bottom-nav-label">Home</span>
            </a>
            <a href="sales.html" class="bottom-nav-item ${activePage === 'sales' ? 'active' : ''}" aria-label="Sales" ${activePage === 'sales' ? 'aria-current="page"' : ''}>
                <div class="bottom-nav-icon"><i data-lucide="receipt"></i></div>
                <span class="bottom-nav-label">Sales</span>
            </a>
            
            <!-- Center Notch & FAB Cradle Scoop -->
            <div class="bottom-nav-cradle-wrap" aria-hidden="true">
                <svg viewBox="0 0 76 34" class="bottom-nav-cradle-svg" preserveAspectRatio="none">
                    <path class="cradle-cutout-fill" d="M 0 0 C 13 0, 16 28, 38 28 C 60 28, 63 0, 76 0 Z"/>
                    <path class="cradle-cutout-stroke" d="M 0 0.5 C 13 0.5, 16 28, 38 28 C 60 28, 63 0.5, 76 0.5" fill="none" stroke-width="1"/>
                </svg>
            </div>

            <a href="stock.html" class="bottom-nav-item ${activePage === 'stock' ? 'active' : ''}" aria-label="Stock" ${activePage === 'stock' ? 'aria-current="page"' : ''}>
                <div class="bottom-nav-icon"><i data-lucide="package"></i></div>
                <span class="bottom-nav-label">Stock</span>
            </a>
            <a href="customers.html" class="bottom-nav-item ${activePage === 'customers' ? 'active' : ''}" aria-label="Customers" ${activePage === 'customers' ? 'aria-current="page"' : ''}>
                <div class="bottom-nav-icon"><i data-lucide="users"></i></div>
                <span class="bottom-nav-label">Customers</span>
            </a>
        `;

        // 3. Inject Dynamic FAB Popover Menu (Slide-up bottom sheetactions tray)
        this._injectFABPopover();

        // More Tab Trigger
        const moreTrigger = document.getElementById('bottom-nav-more-trigger');
        if (moreTrigger) {
            moreTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                this._showMoreMenu();
            });
        }

        // Render Lucide Icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Initialize Custom Premium Dropdowns globally
        this.initializeCustomDropdowns();
    },

    // Reusable custom accessible dropdown component compiler
    initializeCustomDropdowns() {
        const selects = document.querySelectorAll('select');
        selects.forEach(select => {
            if (select.dataset.customized === 'true' || select.dataset.noCustom === 'true' || select.style.display === 'none') return;
            select.dataset.customized = 'true';
            
            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper';
            if (select.id) wrapper.id = `custom-wrapper-${select.id}`;
            
            if (select.className) {
                const classes = select.className.split(/\s+/).filter(c => c !== 'form-control');
                if (classes.length > 0) {
                    wrapper.className += ' ' + classes.join(' ');
                }
            }
            
            // Hide native select
            select.classList.add('custom-select-native');
            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(select);
            
            // Create trigger
            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'custom-select-trigger';
            
            const labelSpan = document.createElement('span');
            labelSpan.className = 'custom-select-label';
            
            const chevron = document.createElement('i');
            chevron.setAttribute('data-lucide', 'chevron-down');
            chevron.className = 'custom-select-chevron';
            
            trigger.appendChild(labelSpan);
            trigger.appendChild(chevron);
            wrapper.appendChild(trigger);
            
            // Create dropdown menu
            const dropdown = document.createElement('div');
            dropdown.className = 'custom-select-dropdown';
            wrapper.appendChild(dropdown);
            
            // Function to rebuild options list
            const rebuildOptions = () => {
                dropdown.innerHTML = '';
                const options = select.querySelectorAll('option');
                options.forEach(opt => {
                    const optDiv = document.createElement('div');
                    optDiv.className = 'custom-select-option';
                    optDiv.setAttribute('data-value', opt.value);
                    optDiv.setAttribute('role', 'option');
                    optDiv.setAttribute('tabindex', '0');
                    if (opt.selected) {
                        optDiv.classList.add('selected');
                        labelSpan.textContent = opt.textContent;
                    }
                    
                    const textSpan = document.createElement('span');
                    textSpan.textContent = opt.textContent;
                    
                    const checkIcon = document.createElement('i');
                    checkIcon.setAttribute('data-lucide', 'check');
                    checkIcon.className = 'custom-select-check';
                    
                    optDiv.appendChild(textSpan);
                    optDiv.appendChild(checkIcon);
                    
                    // Click option
                    optDiv.addEventListener('click', (e) => {
                        e.stopPropagation();
                        select.value = opt.value;
                        select.dispatchEvent(new Event('change'));
                        wrapper.classList.remove('open');
                        trigger.focus();
                    });
                    
                    // Keyboard space/enter on option
                    optDiv.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            optDiv.click();
                        }
                    });
                    
                    dropdown.appendChild(optDiv);
                });
                
                // Re-instantiate icons
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons({
                        attrs: {
                            'stroke-width': 2
                        },
                        nameAttr: 'data-lucide',
                        nodeList: dropdown.querySelectorAll('[data-lucide]')
                    });
                }
            };
            
            // Rebuild initial list
            rebuildOptions();
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({
                    attrs: {
                        'stroke-width': 2
                    },
                    nameAttr: 'data-lucide',
                    nodeList: wrapper.querySelectorAll('[data-lucide="chevron-down"]')
                });
            }
            
            // Watch for dynamic changes in select options
            const observer = new MutationObserver(() => {
                rebuildOptions();
                const selectedOpt = select.querySelector('option:checked');
                if (selectedOpt) {
                    labelSpan.textContent = selectedOpt.textContent;
                }
            });
            observer.observe(select, { childList: true, characterData: true, subtree: true });
            
            // Watch for value changes done programmatically via JS
            const originalValueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
            if (originalValueDescriptor) {
                // To support programmatically setting select.value
                Object.defineProperty(select, 'value', {
                    get() {
                        return originalValueDescriptor.get.call(this);
                    },
                    set(val) {
                        originalValueDescriptor.set.call(this, val);
                        // Sync custom UI
                        const options = dropdown.querySelectorAll('.custom-select-option');
                        options.forEach(opt => {
                            if (opt.getAttribute('data-value') === val) {
                                opt.classList.add('selected');
                                labelSpan.textContent = opt.querySelector('span').textContent;
                            } else {
                                opt.classList.remove('selected');
                            }
                        });
                    }
                });
            }
            
            // Set selected index observer
            const originalIndexDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
            if (originalIndexDescriptor) {
                Object.defineProperty(select, 'selectedIndex', {
                    get() {
                        return originalIndexDescriptor.get.call(this);
                    },
                    set(idx) {
                        originalIndexDescriptor.set.call(this, idx);
                        const opt = select.options[idx];
                        if (opt) {
                            select.value = opt.value;
                        }
                    }
                });
            }
            
            // Toggle open states
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other custom dropdowns
                document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                    if (w !== wrapper) w.classList.remove('open');
                });
                wrapper.classList.toggle('open');
            });
            
            // Keyboard trigger navigation
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!wrapper.classList.contains('open')) {
                        wrapper.classList.add('open');
                    }
                    setTimeout(() => {
                        const firstOpt = dropdown.querySelector('.custom-select-option');
                        if (firstOpt) firstOpt.focus();
                    }, 50);
                } else if (e.key === 'Escape') {
                    wrapper.classList.remove('open');
                }
            });
            
            // Arrow down / arrow up navigation inside dropdown menu
            dropdown.addEventListener('keydown', (e) => {
                const active = document.activeElement;
                if (!active || !active.classList.contains('custom-select-option')) return;
                
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = active.nextElementSibling;
                    if (next) next.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = active.previousElementSibling;
                    if (prev) prev.focus();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    wrapper.classList.remove('open');
                    trigger.focus();
                }
            });
        });
        
        // Document-wide click handler to close dropdowns when clicking outside
        if (!window.customSelectBound) {
            window.customSelectBound = true;
            document.addEventListener('click', () => {
                document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
            });
        }
    },

    // Injects sliding actions tray bottom sheet modal
    _injectFABPopover() {
        let fabBtn = document.getElementById('global-action-fab');
        let actionsSheet = document.getElementById('global-actions-sheet');

        if (!fabBtn) {
            fabBtn = document.createElement('button');
            fabBtn.id = 'global-action-fab';
            fabBtn.className = 'fab';
            fabBtn.setAttribute('aria-label', 'Quick Actions');
            fabBtn.innerHTML = `<i data-lucide="plus"></i>`;
            document.body.appendChild(fabBtn);

            actionsSheet = document.createElement('div');
            actionsSheet.id = 'global-actions-sheet';
            actionsSheet.className = 'modal-overlay';
            actionsSheet.innerHTML = `
                <div class="modal-container" style="max-height: 60vh; border-top: 1px solid var(--border);">
                    <div class="modal-header" style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                        <h3 class="modal-title" style="font-size: 0.95rem;">Quick Actions</h3>
                        <button class="modal-close" id="actions-sheet-close"><i data-lucide="x"></i></button>
                    </div>
                    <div class="actions-grid">
                        <a href="new-sale.html" class="action-grid-card action-primary" style="grid-column: span 2; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 16px; padding: 20px; background-color: var(--accent); color: var(--text-on-accent);">
                            <div class="action-grid-icon-wrap" style="background-color: rgba(255, 255, 255, 0.15); color: var(--text-on-accent); width: 44px; height: 44px;">
                                <i data-lucide="shopping-cart" style="width: 22px; height: 22px;"></i>
                            </div>
                            <div>
                                <div class="action-grid-title" style="font-size: 1.1rem; color: var(--text-on-accent);">New Sale</div>
                            </div>
                        </a>
                        <a href="customers.html?openAdd=true" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--info-tint); color: var(--info);">
                                <i data-lucide="user-plus"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Add Customer</div>
                            </div>
                        </a>
                        <a href="stock.html?openAddStock=true" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--warning-tint); color: var(--warning);">
                                <i data-lucide="package-plus"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Add Stock</div>
                            </div>
                        </a>
                        <a href="stock.html?openAddProduct=true" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--accent-tint); color: var(--accent);">
                                <i data-lucide="package"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Add Product</div>
                            </div>
                        </a>
                        <a href="dues.html?openRecordPayment=true" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--danger-tint); color: var(--danger);">
                                <i data-lucide="circle-dollar-sign"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Record Payment</div>
                            </div>
                        </a>
                        <a href="market-prices.html" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--accent-tint); color: var(--accent);">
                                <i data-lucide="scale"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Market Prices</div>
                            </div>
                        </a>
                    </div>
                </div>
            `;
            document.body.appendChild(actionsSheet);

            // Bind click controllers
            fabBtn.addEventListener('click', () => {
                actionsSheet.classList.add('active');
            });

            document.getElementById('actions-sheet-close').addEventListener('click', () => {
                actionsSheet.classList.remove('active');
            });

            actionsSheet.addEventListener('click', (e) => {
                if (e.target === actionsSheet) {
                    actionsSheet.classList.remove('active');
                }
            });

            actionsSheet.querySelectorAll('.action-grid-card').forEach(card => {
                card.addEventListener('click', () => {
                    actionsSheet.classList.remove('active');
                });
            });
        }
    },

    // Injects sliding modal drawer containing more links
    _showMoreMenu() {
        let moreMenu = document.getElementById('more-menu-overlay');
        if (!moreMenu) {
            moreMenu = document.createElement('div');
            moreMenu.id = 'more-menu-overlay';
            moreMenu.className = 'modal-overlay';
            moreMenu.innerHTML = `
                <div class="modal-container" style="max-height: 70vh; border-top: 1px solid var(--border);">
                    <div class="modal-header" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                        <h3 class="modal-title">More Options</h3>
                        <button class="modal-close" id="more-menu-close"><i data-lucide="x"></i></button>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px; padding-bottom: 16px;">
                        <a href="barcode-management.html" class="btn btn-outline" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="barcode" style="color: var(--primary);"></i> 
                            <span style="margin-left: 8px;">Barcode Management</span>
                        </a>
                        <a href="dues.html" class="btn btn-outline" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="wallet-cards" style="color: var(--danger);"></i> 
                            <span style="margin-left: 8px;">Due Management</span>
                        </a>
                        <a href="#" class="btn btn-outline" onclick="Utils.showToast('Reports summary available soon!', 'info')" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="chart-pie" style="color: var(--accent);"></i> 
                            <span style="margin-left: 8px;">Reports</span>
                        </a>
                        <a href="#" class="btn btn-outline" onclick="Utils.showToast('Suppliers registry available soon!', 'info')" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="truck" style="color: var(--info);"></i> 
                            <span style="margin-left: 8px;">Suppliers</span>
                        </a>
                        <a href="notifications.html" class="btn btn-outline" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="bell" style="color: var(--warning);"></i> 
                            <span style="margin-left: 8px;">Notifications</span>
                        </a>
                        <a href="settings.html" class="btn btn-outline" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="settings" style="color: var(--text-muted);"></i> 
                            <span style="margin-left: 8px;">Settings</span>
                        </a>
                        <a href="settings.html" class="btn btn-outline" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="download" style="color: var(--accent);"></i> 
                            <span style="margin-left: 8px;">Data Backup</span>
                        </a>
                        <a href="#" class="btn btn-outline" onclick="Utils.showToast('Grocery Shop App v2.0 - Operations cashier system.', 'info')" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="info" style="color: var(--info);"></i> 
                            <span style="margin-left: 8px;">About</span>
                        </a>
                    </div>
                </div>
            `;
            document.body.appendChild(moreMenu);

            document.getElementById('more-menu-close').addEventListener('click', () => {
                moreMenu.classList.remove('active');
            });
            moreMenu.addEventListener('click', (e) => {
                if (e.target === moreMenu) {
                    moreMenu.classList.remove('active');
                }
            });
        }
        moreMenu.classList.add('active');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // --- STAGE 2: PROFESSIONAL BILL & INVOICE ENGINE ---

    // Generates inline vector SVG Barcode (Code 39 standard - no external dependencies, 100% offline)
    generateBarcodeSVG(text, height = 42, barWidth = 1.8) {
        if (!text) return '';
        const CODE39 = {
            '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
            '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
            '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
            'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
            'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
            'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
            'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
            'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
            'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
            '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
            '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
        };

        const cleanText = `*${text.toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '')}*`;
        let totalBars = 0;
        const patternArr = [];

        for (let i = 0; i < cleanText.length; i++) {
            const char = cleanText[i];
            const pattern = CODE39[char] || CODE39['*'];
            patternArr.push(pattern);
            // 9 elements: 5 bars (at index 0,2,4,6,8) and 4 spaces (at 1,3,5,7)
            for (let j = 0; j < 9; j++) {
                totalBars += pattern[j] === '1' ? 3 : 1;
            }
            if (i < cleanText.length - 1) {
                totalBars += 1; // inter-character narrow space
            }
        }

        const svgWidth = Math.ceil(totalBars * barWidth) + 20; // 10px quiet zone each side
        let x = 10;
        let rects = '';

        patternArr.forEach((pattern, pIdx) => {
            for (let j = 0; j < 9; j++) {
                const isBar = j % 2 === 0;
                const width = (pattern[j] === '1' ? 3 : 1) * barWidth;
                if (isBar) {
                    rects += `<rect x="${x.toFixed(1)}" y="0" width="${width.toFixed(1)}" height="${height}" fill="#000000"/>`;
                }
                x += width;
            }
            if (pIdx < patternArr.length - 1) {
                x += 1 * barWidth;
            }
        });

        return `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${height + 16}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
                ${rects}
                <text x="${svgWidth / 2}" y="${height + 12}" text-anchor="middle" font-family="'Courier New', monospace, sans-serif" font-size="11" font-weight="700" fill="#17191C" letter-spacing="2">${text}</text>
            </svg>
        `;
    },

    // Resolves a sale object from an ID or returns the object
    _resolveSale(saleIdOrObject) {
        if (!saleIdOrObject) return null;
        if (typeof saleIdOrObject === 'object') return saleIdOrObject;
        return Storage.getSale(saleIdOrObject);
    },

    // Render HTML representation of a Bill / Invoice
    formatBillHTML(saleIdOrObject, format = 'thermal-80') {
        const sale = this._resolveSale(saleIdOrObject);
        if (!sale) return '<div class="bill-error">Sale record not found.</div>';

        const settings = Storage.getSettings();
        const shopName = settings.shopName || 'My Grocery Shop';
        const shopPhone = settings.shopPhone || '';
        const shopAddress = settings.shopAddress || '';
        const shopEmail = settings.shopEmail || '';
        const shopGst = settings.gstNumber || '';
        const shopLogo = settings.shopLogo || '';
        const footerMsg = settings.billFooter || 'Thank you for shopping with us!';

        const invoiceNum = sale.invoiceNumber || (sale.id ? `INV-${sale.id.slice(-6).toUpperCase()}` : 'INV-000000');
        const saleDate = sale.date ? this.formatDateTime(sale.date) : this.formatDateTime(new Date().toISOString());
        const customerName = sale.customerName || (sale.customerId === 'walk-in' || !sale.customerId ? 'Walk-in Customer' : 'Customer');
        const customerPhone = sale.customerPhone || '';
        const paymentMethod = sale.paymentMethod || 'Cash';

        const subtotal = parseFloat(sale.subtotal !== undefined ? sale.subtotal : sale.total) || 0;
        const discount = parseFloat(sale.discount) || 0;
        const tax = parseFloat(sale.tax) || 0;
        const grandTotal = parseFloat(sale.grandTotal !== undefined ? sale.grandTotal : sale.total) || 0;
        const paid = parseFloat(sale.amountPaid !== undefined ? sale.amountPaid : sale.paymentAmount) || 0;
        const due = parseFloat(sale.amountDue !== undefined ? sale.amountDue : sale.dueAmount) || 0;
        const change = parseFloat(sale.change) || 0;
        const items = sale.items || [];

        const barcodeSvg = this.generateBarcodeSVG(invoiceNum, 36, 1.6);

        // Status badge calculation
        let statusBadge = '';
        if (due <= 0.001) {
            statusBadge = '<span class="bill-status-badge badge-paid">PAID</span>';
        } else if (paid > 0.001) {
            statusBadge = `<span class="bill-status-badge badge-partial">PARTIAL PAID (DUE: ${this.formatCurrency(due)})</span>`;
        } else {
            statusBadge = '<span class="bill-status-badge badge-due">PAYMENT DUE</span>';
        }

        if (format === 'a4') {
            // ==========================================
            // FORMAL A4 INVOICE FORMAT
            // ==========================================
            return `
                <div class="a4-invoice-container" id="printable-bill-surface">
                    <div class="a4-header-row">
                        <div class="a4-brand-col">
                            ${shopLogo ? `<img src="${shopLogo}" alt="${shopName}" class="a4-shop-logo" />` : ''}
                            <h1 class="a4-shop-name">${shopName}</h1>
                            ${shopAddress ? `<p class="a4-shop-meta">${shopAddress}</p>` : ''}
                            ${shopPhone ? `<p class="a4-shop-meta">Phone: ${shopPhone}</p>` : ''}
                            ${shopEmail ? `<p class="a4-shop-meta">Email: ${shopEmail}</p>` : ''}
                            ${shopGst ? `<p class="a4-shop-meta font-bold">GSTIN: ${shopGst}</p>` : ''}
                        </div>
                        <div class="a4-meta-col">
                            <div class="a4-invoice-title-badge">INVOICE</div>
                            <div class="a4-meta-entry">
                                <span class="a4-meta-lbl">Invoice No:</span>
                                <span class="a4-meta-val font-bold">${invoiceNum}</span>
                            </div>
                            <div class="a4-meta-entry">
                                <span class="a4-meta-lbl">Date & Time:</span>
                                <span class="a4-meta-val">${saleDate}</span>
                            </div>
                            <div class="a4-meta-entry">
                                <span class="a4-meta-lbl">Payment Mode:</span>
                                <span class="a4-meta-val">${paymentMethod}</span>
                            </div>
                            <div class="a4-meta-entry" style="margin-top: 6px;">
                                ${statusBadge}
                            </div>
                        </div>
                    </div>

                    <div class="a4-bill-to-strip">
                        <div class="a4-customer-box">
                            <span class="a4-box-title">BILLED TO:</span>
                            <div class="a4-cust-name">${customerName}</div>
                            ${customerPhone ? `<div class="a4-cust-phone">${customerPhone}</div>` : ''}
                        </div>
                        <div class="a4-barcode-box">
                            ${barcodeSvg}
                        </div>
                    </div>

                    <table class="a4-items-table">
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;">#</th>
                                <th>Item Description</th>
                                <th style="width: 80px; text-align: center;">Qty</th>
                                <th style="width: 100px; text-align: right;">Rate</th>
                                <th style="width: 110px; text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((it, idx) => `
                                <tr>
                                    <td style="text-align: center; color: #737982;">${idx + 1}</td>
                                    <td>
                                        <div class="a4-item-title">${it.productName || 'Item'}</div>
                                        ${it.sku ? `<div class="a4-item-sku">SKU: ${it.sku}</div>` : ''}
                                    </td>
                                    <td style="text-align: center; font-weight: 600;">${it.quantity} ${it.unit || ''}</td>
                                    <td style="text-align: right;">${this.formatCurrency(it.rate)}</td>
                                    <td style="text-align: right; font-weight: 700;">${this.formatCurrency(it.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="a4-bottom-grid">
                        <div class="a4-notes-col">
                            <div class="a4-footer-thanks">${footerMsg}</div>
                            <div class="a4-terms-box">
                                <strong>Terms & Conditions:</strong>
                                <p>Goods once sold can be returned/exchanged within 3 days with original invoice. Computer generated invoice, no physical signature required.</p>
                            </div>
                        </div>
                        <div class="a4-summary-col">
                            <div class="a4-sum-line">
                                <span>Subtotal:</span>
                                <span>${this.formatCurrency(subtotal)}</span>
                            </div>
                            ${discount > 0 ? `
                                <div class="a4-sum-line a4-sum-discount">
                                    <span>Discount:</span>
                                    <span>-${this.formatCurrency(discount)}</span>
                                </div>
                            ` : ''}
                            ${tax > 0 ? `
                                <div class="a4-sum-line">
                                    <span>Tax / GST:</span>
                                    <span>+${this.formatCurrency(tax)}</span>
                                </div>
                            ` : ''}
                            <div class="a4-sum-line a4-grand-total">
                                <span>Grand Total:</span>
                                <span>${this.formatCurrency(grandTotal)}</span>
                            </div>
                            <div class="a4-sum-line a4-paid-line">
                                <span>Amount Paid:</span>
                                <span>${this.formatCurrency(paid)}</span>
                            </div>
                            ${due > 0 ? `
                                <div class="a4-sum-line a4-due-line">
                                    <span>Balance Due:</span>
                                    <span>${this.formatCurrency(due)}</span>
                                </div>
                            ` : ''}
                            ${change > 0 ? `
                                <div class="a4-sum-line">
                                    <span>Change Returned:</span>
                                    <span>${this.formatCurrency(change)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        // ==========================================
        // THERMAL RECEIPT FORMAT (58mm / 80mm)
        // ==========================================
        const thermalClass = format === 'thermal-58' ? 'thermal-receipt receipt-58' : 'thermal-receipt receipt-80';

        return `
            <div class="${thermalClass}" id="printable-bill-surface">
                <!-- Shop Header -->
                <div class="receipt-header">
                    ${shopLogo ? `<img src="${shopLogo}" alt="${shopName}" class="receipt-logo" />` : ''}
                    <h2 class="receipt-shop-title">${shopName}</h2>
                    ${shopAddress ? `<div class="receipt-shop-info">${shopAddress}</div>` : ''}
                    ${shopPhone ? `<div class="receipt-shop-info">Tel: ${shopPhone}</div>` : ''}
                    ${shopGst ? `<div class="receipt-shop-info font-bold">GSTIN: ${shopGst}</div>` : ''}
                </div>

                <div class="receipt-divider-dashed"></div>

                <!-- Invoice & Customer Metadata -->
                <div class="receipt-meta-block">
                    <div class="receipt-meta-row">
                        <span class="font-bold">Invoice:</span>
                        <span class="font-bold">${invoiceNum}</span>
                    </div>
                    <div class="receipt-meta-row">
                        <span>Date:</span>
                        <span>${saleDate}</span>
                    </div>
                    <div class="receipt-meta-row">
                        <span>Customer:</span>
                        <span class="font-bold">${customerName}</span>
                    </div>
                    ${customerPhone ? `
                        <div class="receipt-meta-row">
                            <span>Phone:</span>
                            <span>${customerPhone}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="receipt-divider-dashed"></div>

                <!-- Itemized Table -->
                <div class="receipt-items-table">
                    <div class="receipt-item-head">
                        <span style="flex: 2; text-align: left;">ITEM</span>
                        <span style="flex: 1; text-align: center;">QTY</span>
                        <span style="flex: 1; text-align: right;">RATE</span>
                        <span style="flex: 1.2; text-align: right;">TOTAL</span>
                    </div>
                    <div class="receipt-divider-dotted"></div>
                    ${items.map(it => `
                        <div class="receipt-item-row">
                            <div class="receipt-item-name">${it.productName || 'Item'}</div>
                            <div class="receipt-item-cols">
                                <span style="flex: 2; text-align: left; color: #737982; font-size: 0.85em;">&nbsp;</span>
                                <span style="flex: 1; text-align: center;">${it.quantity} ${it.unit ? it.unit.slice(0, 3) : ''}</span>
                                <span style="flex: 1; text-align: right;">${this.formatCurrency(it.rate)}</span>
                                <span style="flex: 1.2; text-align: right; font-weight: 700;">${this.formatCurrency(it.total)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="receipt-divider-dashed"></div>

                <!-- Financial Totals -->
                <div class="receipt-totals-block">
                    <div class="receipt-total-row">
                        <span>Subtotal:</span>
                        <span>${this.formatCurrency(subtotal)}</span>
                    </div>
                    ${discount > 0 ? `
                        <div class="receipt-total-row receipt-discount-txt">
                            <span>Discount:</span>
                            <span>-${this.formatCurrency(discount)}</span>
                        </div>
                    ` : ''}
                    ${tax > 0 ? `
                        <div class="receipt-total-row">
                            <span>Tax:</span>
                            <span>+${this.formatCurrency(tax)}</span>
                        </div>
                    ` : ''}
                    <div class="receipt-divider-dotted"></div>
                    <div class="receipt-total-row receipt-grand-total">
                        <span>TOTAL:</span>
                        <span>${this.formatCurrency(grandTotal)}</span>
                    </div>
                    <div class="receipt-total-row">
                        <span>Paid (${paymentMethod}):</span>
                        <span class="font-bold">${this.formatCurrency(paid)}</span>
                    </div>
                    ${due > 0 ? `
                        <div class="receipt-total-row receipt-due-txt">
                            <span>Amount Due:</span>
                            <span class="font-bold">${this.formatCurrency(due)}</span>
                        </div>
                    ` : ''}
                    ${change > 0 ? `
                        <div class="receipt-total-row">
                            <span>Change:</span>
                            <span>${this.formatCurrency(change)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="receipt-divider-dashed"></div>

                <!-- Invoice Barcode -->
                <div class="receipt-barcode-wrap">
                    ${barcodeSvg}
                </div>

                <!-- Footer Greetings -->
                <div class="receipt-footer">
                    <div class="receipt-footer-msg">${footerMsg}</div>
                    <div class="receipt-footer-sub">*** Please Visit Again ***</div>
                </div>
            </div>
        `;
    },

    // Global Interactive Bill Modal
    showBillModal(saleIdOrObject, initialFormat = null) {
        const sale = this._resolveSale(saleIdOrObject);
        if (!sale) {
            this.showToast('Sale invoice not found.', 'error');
            return;
        }

        const settings = Storage.getSettings();
        let activeFormat = initialFormat || settings.defaultBillFormat || 'thermal-80';

        let modal = document.getElementById('global-bill-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'global-bill-modal';
            modal.className = 'modal-overlay bill-modal-overlay';
            modal.innerHTML = `
                <div class="modal-container bill-modal-dialog">
                    <div class="bill-modal-header">
                        <div class="bill-modal-title-group">
                            <h3 class="bill-modal-heading">
                                <i data-lucide="receipt" style="width: 18px; height: 18px; color: var(--accent);"></i>
                                Invoice Preview
                            </h3>
                            <span class="bill-modal-inv-badge" id="bill-modal-inv-num">INV-000000</span>
                        </div>
                        <button type="button" class="modal-close" id="btn-bill-modal-close"><i data-lucide="x"></i></button>
                    </div>

                    <!-- Format switcher bar -->
                    <div class="bill-format-toolbar">
                        <span class="bill-format-label">Format:</span>
                        <div class="bill-format-toggles">
                            <button type="button" class="btn-bill-format active" data-format="thermal-80">Thermal 80mm</button>
                            <button type="button" class="btn-bill-format" data-format="thermal-58">Thermal 58mm</button>
                            <button type="button" class="btn-bill-format" data-format="a4">A4 Invoice</button>
                        </div>
                    </div>

                    <!-- Scrollable Bill Preview Area -->
                    <div class="bill-preview-viewport" id="bill-preview-viewport">
                        <div id="bill-render-mount"></div>
                    </div>

                    <!-- Modal Actions Footer -->
                    <div class="bill-modal-actions">
                        <button type="button" class="btn btn-primary" id="btn-bill-action-print">
                            <i data-lucide="printer"></i> Print Bill
                        </button>
                        <button type="button" class="btn btn-outline" id="btn-bill-action-pdf">
                            <i data-lucide="download"></i> Download PDF
                        </button>
                        <button type="button" class="btn btn-outline" id="btn-bill-action-share">
                            <i data-lucide="share-2"></i> Share
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Bind close triggers
            document.getElementById('btn-bill-modal-close').addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }

        // Store active sale on modal element
        modal._activeSale = sale;
        modal._activeFormat = activeFormat;

        const invoiceNum = sale.invoiceNumber || `INV-${sale.id.slice(-6).toUpperCase()}`;
        document.getElementById('bill-modal-inv-num').textContent = invoiceNum;

        // Render current format
        const renderMount = document.getElementById('bill-render-mount');
        renderMount.innerHTML = this.formatBillHTML(sale, activeFormat);

        // Update format toggle buttons
        modal.querySelectorAll('.btn-bill-format').forEach(btn => {
            if (btn.dataset.format === activeFormat) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            // Clean previous listener
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => {
                modal.querySelectorAll('.btn-bill-format').forEach(b => b.classList.remove('active'));
                newBtn.classList.add('active');
                activeFormat = newBtn.dataset.format;
                modal._activeFormat = activeFormat;
                renderMount.innerHTML = Utils.formatBillHTML(sale, activeFormat);
                if (typeof lucide !== 'undefined') lucide.createIcons();
            });
        });

        // Bind Action buttons
        const printBtn = document.getElementById('btn-bill-action-print');
        const newPrintBtn = printBtn.cloneNode(true);
        printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
        newPrintBtn.addEventListener('click', () => {
            this.printBill(sale, modal._activeFormat);
        });

        const pdfBtn = document.getElementById('btn-bill-action-pdf');
        const newPdfBtn = pdfBtn.cloneNode(true);
        pdfBtn.parentNode.replaceChild(newPdfBtn, pdfBtn);
        newPdfBtn.addEventListener('click', () => {
            this.downloadBillPDF(sale, modal._activeFormat);
        });

        const shareBtn = document.getElementById('btn-bill-action-share');
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.addEventListener('click', () => {
            this.shareBill(sale);
        });

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // Print Bill Handler using @media print
    printBill(saleIdOrObject, format = 'thermal-80') {
        const sale = this._resolveSale(saleIdOrObject);
        if (!sale) return;

        // Ensure printable bill container exists in DOM
        let printZone = document.getElementById('print-media-zone');
        if (!printZone) {
            printZone = document.createElement('div');
            printZone.id = 'print-media-zone';
            printZone.className = 'print-media-zone';
            document.body.appendChild(printZone);
        }

        printZone.innerHTML = this.formatBillHTML(sale, format);
        window.print();
    },

    // Client-side PDF Generation with html2pdf or fallback
    downloadBillPDF(saleIdOrObject, format = 'thermal-80') {
        const sale = this._resolveSale(saleIdOrObject);
        if (!sale) return;

        const invoiceNum = sale.invoiceNumber || `INV-${sale.id.slice(-6).toUpperCase()}`;
        const fileName = `${invoiceNum}_Receipt.pdf`;

        // Create temporary container for clean rendering
        const tempContainer = document.createElement('div');
        tempContainer.className = 'pdf-render-temp';
        tempContainer.innerHTML = this.formatBillHTML(sale, format);
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.background = '#ffffff';
        tempContainer.style.zIndex = '-1000';
        document.body.appendChild(tempContainer);

        const targetEl = tempContainer.firstElementChild || tempContainer;

        if (typeof html2pdf !== 'undefined') {
            const opt = {
                margin: format === 'a4' ? [10, 10, 10, 10] : [4, 4, 4, 4],
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF: {
                    unit: 'mm',
                    format: format === 'a4' ? 'a4' : (format === 'thermal-58' ? [58, 180] : [80, 220]),
                    orientation: 'portrait'
                }
            };

            this.showToast('Generating PDF...', 'info');

            html2pdf().set(opt).from(targetEl).save().then(() => {
                tempContainer.remove();
                Utils.showToast('PDF downloaded successfully!', 'success');
            }).catch(err => {
                console.error('PDF generation error:', err);
                tempContainer.remove();
                Utils.showToast('Failed to generate PDF. Opening print dialog...', 'warning');
                Utils.printBill(sale, format);
            });
        } else {
            // Fallback if html2pdf script isn't loaded: trigger print to PDF
            tempContainer.remove();
            this.showToast('Opening print dialog to Save as PDF...', 'info');
            this.printBill(sale, format);
        }
    },

    // Native Web Share API or Fallback
    shareBill(saleIdOrObject) {
        const sale = this._resolveSale(saleIdOrObject);
        if (!sale) return;

        const settings = Storage.getSettings();
        const shopName = settings.shopName || 'My Grocery Shop';
        const invoiceNum = sale.invoiceNumber || `INV-${sale.id.slice(-6).toUpperCase()}`;
        const totalStr = this.formatCurrency(sale.grandTotal !== undefined ? sale.grandTotal : sale.total);
        const dateStr = sale.date ? this.formatDateTime(sale.date) : '';

        const shareData = {
            title: `${shopName} Invoice ${invoiceNum}`,
            text: `${shopName}\nInvoice: ${invoiceNum}\nDate: ${dateStr}\nTotal: ${totalStr}\nStatus: ${(sale.paymentStatus || 'paid').toUpperCase()}\nThank you for shopping with us!`
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            navigator.share(shareData).catch(err => {
                if (err.name !== 'AbortError') {
                    console.error('Error sharing:', err);
                }
            });
        } else {
            // Native sharing not available on this device
            this.confirm(
                "Share Invoice",
                `Native sharing isn't supported on this device browser. Would you like to download the PDF bill instead?\n\nInvoice: ${invoiceNum}\nTotal: ${totalStr}`,
                () => {
                    this.downloadBillPDF(sale, 'thermal-80');
                }
            );
        }
    }
};

// Auto run layout initialization on page load
document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.dataset.page;
    if (pageId) {
        if (typeof lucide === 'undefined') {
            const script = document.createElement('script');
            script.src = "https://unpkg.com/lucide@latest";
            script.onload = () => {
                Utils.initAppLayout(pageId);
            };
            document.head.appendChild(script);
        } else {
            Utils.initAppLayout(pageId);
        }
    }
});

if (typeof window !== 'undefined') {
    window.Utils = Utils;
}

