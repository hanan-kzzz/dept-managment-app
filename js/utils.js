
window.routeMap = {"index.html":"","sales.html":"pages/sales/","new-sale.html":"pages/sales/","dues.html":"pages/sales/","stock.html":"pages/inventory/","product-details.html":"pages/inventory/","barcode-management.html":"pages/inventory/","market-prices.html":"pages/inventory/","customers.html":"pages/customers/","customer-details.html":"pages/customers/","settings.html":"pages/settings/","notifications.html":"pages/settings/","login.html":"auth/","signup.html":"auth/","forgot-password.html":"auth/","reset-password.html":"auth/","otp-verification.html":"auth/"};

window.computeBasePath = function() {
    if (typeof window.BASE_PATH === 'string' && window.BASE_PATH !== '') {
        return window.BASE_PATH;
    }
    const path = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    
    // 3 levels deep: e.g. pages/settings/backup/index.html or pages/settings/*/index.html
    if (path.includes('/pages/settings/') && 
        !path.endsWith('/pages/settings/settings.html') && 
        !path.endsWith('/pages/settings/notifications.html') &&
        !path.endsWith('/pages/settings/settings') && 
        !path.endsWith('/pages/settings/notifications')) {
        return '../../../';
    }
    
    // 2 levels deep: pages/customers/*, pages/inventory/*, pages/sales/*, pages/settings/*
    if (path.includes('/pages/customers/') || 
        path.includes('/pages/inventory/') || 
        path.includes('/pages/sales/') || 
        path.includes('/pages/settings/')) {
        return '../../';
    }
    
    // 1 level deep: auth/*
    if (path.includes('/auth/')) {
        return '../';
    }
    
    return '';
};

window.getAppLink = function(targetFile) {
    if (!targetFile) return '#';
    if (targetFile.startsWith('http://') || targetFile.startsWith('https://') || targetFile.startsWith('#') || targetFile.startsWith('javascript:')) {
        return targetFile;
    }
    const basePath = window.computeBasePath();
    
    if (targetFile.startsWith('pages/') || targetFile.startsWith('auth/')) {
        return basePath + targetFile;
    }
    
    const parts = targetFile.split('?');
    let baseFile = parts[0];
    const query = parts.length > 1 ? '?' + parts[1] : '';
    const folder = window.routeMap[baseFile] !== undefined ? window.routeMap[baseFile] : '';
    
    return basePath + folder + baseFile + query;
};
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

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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

        this.openModal(overlay);

        const cleanUp = () => {
            this.closeModal(overlay);
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

    // --- GLOBAL MODAL CONTROLLER (LOCKS BACKGROUND SCROLL & TOUCH MOVEMENT) ---
    openModal(modal) {
        if (typeof modal === 'string') modal = document.getElementById(modal);
        if (!modal) return;

        modal.classList.add('active');
        if (modal.style.display === 'none') {
            modal.style.display = 'flex';
        }

        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';

        if (!modal._hasTouchMoveBound) {
            modal.addEventListener('touchmove', this._handleModalTouchMove, { passive: false });
            modal._hasTouchMoveBound = true;
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    closeModal(modal) {
        if (typeof modal === 'string') modal = document.getElementById(modal);
        if (!modal) return;

        modal.classList.remove('active');
        if (modal.id === 'pos-camera-scanner-overlay' || modal.classList.contains('scanner-subdialog-overlay')) {
            modal.style.display = 'none';
        }

        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            Array.from(form.elements).forEach(el => el.classList.remove('is-invalid'));
        }

        const activeModals = document.querySelectorAll('.modal-overlay.active, .dialog-overlay.active, .scanner-modal-overlay.active, .bill-modal-wrapper.active, .scanner-subdialog-overlay[style*="display: block"]');
        if (activeModals.length === 0) {
            document.documentElement.classList.remove('modal-open');
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }
    },

    _handleModalTouchMove(e) {
        const isScrollableContent = e.target.closest('.modal-container, .scanner-modal-card, .bill-modal-sheet, .dialog-box, .modal-body, .bill-modal-body, .rem-textarea, .form-control-textarea, .modal-custom-picker-content');
        if (isScrollableContent) {
            e.stopPropagation();
        } else {
            e.preventDefault();
        }
    },

    // --- APP SHELL INJECTION ---
    initAppLayout(activePage = 'home') {
        const settings = Storage.getSettings();
        const unreadCount = Storage.getNotifications().filter(n => !n.read).length;

        // Apply saved theme on boot
        let savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
            savedTheme = settings.theme || 'light';
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

        // 0. Inject Phone Mockup Status Bar & Home Indicator
        this._injectPhoneMockupElements();

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
                    <a href="${window.getAppLink('notifications.html')}" class="icon-btn" aria-label="Notifications" title="Notifications" style="position: relative;">
                        <i data-lucide="bell"></i>
                        ${unreadCount > 0 ? `<span class="badge-unread-dot" style="position: absolute; top: 0; right: 0; width: 8px; height: 8px; border-radius: 50%; background-color: var(--danger); border: 1.5px solid var(--surface);"></span>` : ''}
                    </a>
                    <a href="${window.getAppLink('settings.html')}" class="icon-btn" aria-label="Settings" title="Settings">
                        <i data-lucide="settings"></i>
                    </a>
                </div>
            `;

            // Bind global theme toggle button event
            const themeToggleBtn = document.getElementById('global-theme-toggle-btn');
            if (themeToggleBtn) {
                themeToggleBtn.addEventListener('click', () => {
                    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
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
            <a href="${window.getAppLink('index.html')}" class="bottom-nav-item ${activePage === 'home' ? 'active' : ''}" aria-label="Home" ${activePage === 'home' ? 'aria-current="page"' : ''}>
                <div class="bottom-nav-icon"><i data-lucide="home"></i></div>
                <span class="bottom-nav-label">Home</span>
            </a>
            <a href="${window.getAppLink('sales.html')}" class="bottom-nav-item ${activePage === 'sales' ? 'active' : ''}" aria-label="Sales" ${activePage === 'sales' ? 'aria-current="page"' : ''}>
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

            <a href="${window.getAppLink('stock.html')}" class="bottom-nav-item ${activePage === 'stock' ? 'active' : ''}" aria-label="Stock" ${activePage === 'stock' ? 'aria-current="page"' : ''}>
                <div class="bottom-nav-icon"><i data-lucide="package"></i></div>
                <span class="bottom-nav-label">Stock</span>
            </a>
            <a href="${window.getAppLink('customers.html')}" class="bottom-nav-item ${activePage === 'customers' ? 'active' : ''}" aria-label="Customers" ${activePage === 'customers' ? 'aria-current="page"' : ''}>
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

    _injectPhoneMockupElements() {
        if (!document.getElementById('phone-mockup-status-bar')) {
            const statusBar = document.createElement('div');
            statusBar.id = 'phone-mockup-status-bar';
            statusBar.className = 'phone-mockup-status-bar';
            
            const updateClock = () => {
                const now = new Date();
                let hours = now.getHours();
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                const timeStr = `${hours}:${minutes} ${ampm}`;
                const timeEl = document.getElementById('phone-status-time');
                if (timeEl) timeEl.textContent = timeStr;
            };

            statusBar.innerHTML = `
                <div class="phone-status-time" id="phone-status-time">10:15 PM</div>
                <div class="phone-dynamic-island">
                    <div class="dynamic-island-camera"></div>
                    <div class="dynamic-island-sensor"></div>
                </div>
                <div class="phone-status-icons">
                    <svg class="phone-icon-signal" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 3L2 21h20L12 3z"/></svg>
                    <svg class="phone-icon-wifi" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 3C7.03 3 2.64 5.02.04 8.27l1.77 1.77C4.1 7.37 7.79 5.5 12 5.5s7.9 1.87 10.19 4.54l1.77-1.77C21.36 5.02 16.97 3 12 3zm0 5c-3.5 0-6.6 1.4-8.8 3.7l1.77 1.77C6.67 11.8 9.17 10.5 12 10.5s5.33 1.3 7.03 3.03l1.77-1.77C18.6 9.4 15.5 8 12 8zm0 5c-2.07 0-3.9.83-5.23 2.17l1.77 1.77C9.47 16.07 10.64 15.5 12 15.5s2.53.57 3.46 1.44l1.77-1.77C15.9 13.83 14.07 13 12 13zm0 5a2 2 0 100 4 2 2 0 000-4z"/></svg>
                    <div class="phone-icon-battery">
                        <div class="phone-battery-level"></div>
                    </div>
                </div>
            `;
            document.body.prepend(statusBar);
            updateClock();
            setInterval(updateClock, 30000);
        }

        if (!document.getElementById('phone-mockup-home-indicator')) {
            const homeIndicator = document.createElement('div');
            homeIndicator.id = 'phone-mockup-home-indicator';
            homeIndicator.className = 'phone-mockup-home-indicator';
            document.body.appendChild(homeIndicator);
        }
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
                        <a href="${window.getAppLink('new-sale.html')}" class="action-grid-card action-primary" style="grid-column: span 2; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 16px; padding: 20px; background-color: var(--accent); color: var(--text-on-accent);">
                            <div class="action-grid-icon-wrap" style="background-color: rgba(255, 255, 255, 0.15); color: var(--text-on-accent); width: 44px; height: 44px;">
                                <i data-lucide="shopping-cart" style="width: 22px; height: 22px;"></i>
                            </div>
                            <div>
                                <div class="action-grid-title" style="font-size: 1.1rem; color: var(--text-on-accent);">New Sale</div>
                            </div>
                        </a>
                        <a href="${window.getAppLink('customers.html?openAdd=true')}" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--info-tint); color: var(--info);">
                                <i data-lucide="user-plus"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Add Customer</div>
                            </div>
                        </a>
                        <a href="${window.getAppLink('stock.html?openAddStock=true')}" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--warning-tint); color: var(--warning);">
                                <i data-lucide="package-plus"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Add Stock</div>
                            </div>
                        </a>
                        <a href="${window.getAppLink('stock.html?openAddProduct=true')}" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--accent-tint); color: var(--accent);">
                                <i data-lucide="package"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Add Product</div>
                            </div>
                        </a>
                        <a href="${window.getAppLink('market-prices.html')}" class="action-grid-card">
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
                Utils.openModal(actionsSheet);
            });

            document.getElementById('actions-sheet-close').addEventListener('click', () => {
                Utils.closeModal(actionsSheet);
            });

            actionsSheet.addEventListener('click', (e) => {
                if (e.target === actionsSheet) {
                    Utils.closeModal(actionsSheet);
                }
            });

            actionsSheet.querySelectorAll('.action-grid-card').forEach(card => {
                card.addEventListener('click', () => {
                    Utils.closeModal(actionsSheet);
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
                        <a href="${window.getAppLink('barcode-management.html')}" class="btn btn-outline" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="barcode" style="color: var(--primary);"></i> 
                            <span style="margin-left: 8px;">Barcode Management</span>
                        </a>
                        <a href="${window.getAppLink('dues.html')}" class="btn btn-outline" style="justify-content: flex-start; padding-left: 20px;">
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
                        <a href="${window.getAppLink('notifications.html')}" class="btn btn-outline" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="bell" style="color: var(--warning);"></i> 
                            <span style="margin-left: 8px;">Notifications</span>
                        </a>
                        <a href="${window.getAppLink('settings.html')}" class="btn btn-outline" style="justify-content: flex-start; padding-left: 20px;">
                            <i data-lucide="settings" style="color: var(--text-muted);"></i> 
                            <span style="margin-left: 8px;">Settings</span>
                        </a>
                        <a href="${window.getAppLink('settings.html')}" class="btn btn-outline" style="justify-content: flex-start; padding-left: 20px;">
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
                Utils.closeModal(moreMenu);
            });
            moreMenu.addEventListener('click', (e) => {
                if (e.target === moreMenu) {
                    Utils.closeModal(moreMenu);
                }
            });
        }
        Utils.openModal(moreMenu);
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

    // Toggles expandable items list in digital transaction summary
    toggleMoreItems(btn) {
        const container = document.getElementById('moreItemsContainer');
        if (!container) return;
        const isHidden = container.classList.contains('hidden');
        if (isHidden) {
            container.classList.remove('hidden');
            btn.innerHTML = `<span>- Show less</span><svg class="w-3.5 h-3.5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
        } else {
            container.classList.add('hidden');
            const hiddenCount = container.children.length;
            btn.innerHTML = `<span>+ ${hiddenCount} more item${hiddenCount === 1 ? '' : 's'}</span><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
        }
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
        const shopName = settings.shopName || 'My Shop';
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

        if (format === 'digital-super') {
            // ==========================================
            // MODERN DIGITAL TRANSACTION SUMMARY EXPERIENCE
            // ==========================================
            let formattedDateStr = saleDate;
            try {
                const d = sale.date ? new Date(sale.date) : new Date();
                if (!isNaN(d.getTime())) {
                    const month = d.toLocaleString('en-US', { month: 'short' });
                    const day = d.getDate();
                    const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    formattedDateStr = `${month} ${day} · ${time}`;
                }
            } catch (e) {}

            const refId = sale.id ? (sale.id.replace(/[^0-9]/g, '') + '2026272216250').slice(0, 12) : '2026272216250';
            const payStatus = sale.paymentStatus || (due <= 0.001 ? 'paid' : (paid > 0.001 ? 'partial' : 'due'));

            // Status Badge HTML
            let statusBadgeHtml = '<span class="tx-status-badge status-paid"><svg class="w-3 h-3 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg> PAID</span>';
            if (payStatus === 'failed') {
                statusBadgeHtml = '<span class="tx-status-badge status-failed"><svg class="w-3 h-3 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> FAILED</span>';
            } else if (payStatus === 'pending') {
                statusBadgeHtml = '<span class="tx-status-badge status-pending"><svg class="w-3 h-3 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> PENDING</span>';
            } else if (payStatus === 'partial') {
                statusBadgeHtml = `<span class="tx-status-badge status-partial">PARTIAL (DUE: ${this.formatCurrency(due)})</span>`;
            }

            const visibleItems = items.slice(0, 3);
            const hiddenItems = items.slice(3);

            return `
                <div class="digital-tx-wrapper w-full max-w-md md:max-w-lg mx-auto space-y-3" id="printable-bill-surface">
                    
                    <!-- PREMIUM BLUE TRANSACTION CARD (Fintech Banking Style) -->
                    <div class="digital-tx-card rounded-[18px] p-4 sm:p-5 space-y-4 relative overflow-hidden">
                        
                        <!-- Translucent Decorative Top-Right Corner Highlight Accent -->
                        <div class="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-blue-500/10 dark:bg-blue-400/10 pointer-events-none blur-xl"></div>
                        
                        <!-- Single Sheen Highlight Sweep Animation -->
                        <div class="card-sheen-sweep"></div>
                        
                        <!-- Header: Shop Name & Receipt # -->
                        <div class="flex items-start justify-between gap-2 pb-2.5 border-b pos-card-divider relative z-10">
                            <div>
                                <div class="font-extrabold text-[15px] sm:text-base pos-card-navy leading-tight">${shopName}</div>
                                <div class="text-[9px] sm:text-[10px] font-bold pos-card-sub uppercase tracking-wider mt-0.5">Payment Receipt</div>
                            </div>
                            <div class="text-[10px] sm:text-[11px] font-semibold pos-card-muted font-mono tracking-tight text-right">Receipt #${invoiceNum}</div>
                        </div>

                        <!-- Customer & Payment Blocks (Grouped with Spacing) -->
                        <div class="space-y-3 pt-0.5 relative z-10">
                            <!-- Customer Info -->
                            ${customerName ? `
                                <div class="space-y-0.5">
                                    <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider pos-card-sub flex items-center gap-1">
                                        <svg class="w-3 h-3 pos-card-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        <span>CUSTOMER</span>
                                    </div>
                                    <div class="font-bold text-[13px] sm:text-sm pos-card-navy">${customerName}</div>
                                    ${customerPhone ? `<div class="text-[11px] pos-card-sub font-mono">${customerPhone}</div>` : ''}
                                </div>
                            ` : ''}

                            <!-- Payment Method Compact Row -->
                            <div class="space-y-1 pt-0.5">
                                <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider pos-card-sub flex items-center gap-1">
                                    <svg class="w-3 h-3 pos-card-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                                    <span>PAYMENT</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="font-bold text-xs sm:text-[13px] pos-card-navy">${paymentMethod}</span>
                                    ${statusBadgeHtml}
                                </div>
                            </div>
                        </div>

                        <!-- Items Section -->
                        ${items.length > 0 ? `
                            <div class="space-y-2 pt-0.5 relative z-10">
                                <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider pos-card-sub flex items-center justify-between">
                                    <span>ITEMS</span>
                                    <span>${items.length} ITEM${items.length === 1 ? '' : 'S'}</span>
                                </div>

                                <div class="space-y-2">
                                    ${visibleItems.map(it => `
                                        <div class="flex justify-between items-center text-xs">
                                            <div class="space-y-0.5">
                                                <div class="font-semibold text-[12px] sm:text-[13px] pos-card-navy">${it.productName || 'Item'}</div>
                                                <div class="text-[11px] pos-card-sub">${it.quantity} ${it.unit || ''} &times; ${this.formatCurrency(it.rate || (it.total / (it.quantity || 1)))}</div>
                                            </div>
                                            <div class="font-bold pos-card-navy font-mono-num text-xs sm:text-[13px]">${this.formatCurrency(it.total)}</div>
                                        </div>
                                    `).join('')}

                                    ${hiddenItems.length > 0 ? `
                                        <div id="moreItemsContainer" class="hidden space-y-2 pt-1">
                                            ${hiddenItems.map(it => `
                                                <div class="flex justify-between items-center text-xs">
                                                    <div class="space-y-0.5">
                                                        <div class="font-semibold text-[12px] sm:text-[13px] pos-card-navy">${it.productName || 'Item'}</div>
                                                        <div class="text-[11px] pos-card-sub">${it.quantity} ${it.unit || ''} &times; ${this.formatCurrency(it.rate || (it.total / (it.quantity || 1)))}</div>
                                                    </div>
                                                    <div class="font-bold pos-card-navy font-mono-num text-xs sm:text-[13px]">${this.formatCurrency(it.total)}</div>
                                                </div>
                                            `).join('')}
                                        </div>
                                        
                                        <button type="button" onclick="Utils.toggleMoreItems(this)" class="w-full py-1 text-center text-xs font-bold text-[#087FF5] dark:text-[#2F8FFF] hover:underline flex items-center justify-center gap-1 transition-all">
                                            <span>+ ${hiddenItems.length} more item${hiddenItems.length === 1 ? '' : 's'}</span>
                                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Total Breakdown Section (Subtle Divider) -->
                        <div class="pt-3 border-t pos-card-divider space-y-1.5 relative z-10">
                            <div class="flex justify-between items-center text-xs pos-card-sub">
                                <span>Subtotal</span>
                                <span class="font-bold pos-card-navy font-mono-num">${this.formatCurrency(subtotal)}</span>
                            </div>
                            ${discount > 0 ? `
                                <div class="flex justify-between items-center text-xs text-[#16A34A] dark:text-[#34D399]">
                                    <span>Discount</span>
                                    <span class="font-bold font-mono-num">-${this.formatCurrency(discount)}</span>
                                </div>
                            ` : ''}
                            ${tax > 0 ? `
                                <div class="flex justify-between items-center text-xs pos-card-sub">
                                    <span>Tax</span>
                                    <span class="font-bold pos-card-navy font-mono-num">+${this.formatCurrency(tax)}</span>
                                </div>
                            ` : ''}
                            <div class="flex justify-between items-center pt-2">
                                <span class="font-extrabold text-[14px] sm:text-[15px] pos-card-navy uppercase tracking-tight">TOTAL PAID</span>
                                <span class="font-extrabold text-[18px] sm:text-[20px] pos-card-navy font-mono-num">${this.formatCurrency(grandTotal)}</span>
                            </div>
                        </div>

                        <!-- Collapsible Transaction Details Accordion (Subtle Divider) -->
                        <details class="group pt-2 border-t pos-card-divider relative z-10">
                            <summary class="flex items-center justify-between text-xs font-bold pos-card-sub hover:text-[#087FF5] p-1.5 rounded-lg cursor-pointer transition-colors select-none">
                                <span class="flex items-center gap-1.5">
                                    <svg class="w-3.5 h-3.5 pos-card-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                    Transaction details
                                </span>
                                <svg class="w-4 h-4 transition-transform group-open:rotate-180 pos-card-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                            </summary>
                            <div class="pt-2 pb-1 space-y-1.5 text-[11px] pos-card-sub">
                                <div class="flex justify-between items-center">
                                    <span class="pos-card-sub font-medium">Transaction ID</span>
                                    <span class="font-mono font-bold pos-card-navy">${invoiceNum}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="pos-card-sub font-medium">Payment reference</span>
                                    <span class="font-mono pos-card-navy">${refId}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="pos-card-sub font-medium">Payment method</span>
                                    <span class="font-semibold pos-card-navy">${paymentMethod}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-[#526B84] dark:text-[#9DB0C6] font-medium">Date & Time</span>
                                    <span class="font-medium text-[#0F172A] dark:text-[#F8FAFC]">${formattedDateStr}</span>
                                </div>
                            </div>
                        </details>

                        <!-- Clean Subtle Success Footer -->
                        <div class="text-center pt-2 space-y-0.5 relative z-10">
                            <div class="text-xs font-bold text-[#16A34A] dark:text-[#34D399] flex items-center justify-center gap-1">
                                <svg class="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>Payment received</span>
                            </div>
                            <div class="text-[10px] text-[#526B84] dark:text-[#9DB0C6] font-medium">Thank you for shopping with us.</div>
                        </div>
                    </div>
                </div>
            `;
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
                <!-- Serrated Paper Top Trim -->
                <div class="receipt-paper-serrated-top"></div>

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
                        <span class="font-bold">Invoice No:</span>
                        <span class="font-bold font-mono">${invoiceNum}</span>
                    </div>
                    <div class="receipt-meta-row">
                        <span>Date:</span>
                        <span>${saleDate}</span>
                    </div>
                    ${customerName ? `
                        <div class="receipt-meta-row">
                            <span>Customer:</span>
                            <span class="font-bold">${customerName}</span>
                        </div>
                    ` : ''}
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
                                <span style="flex: 2; text-align: left; color: #64748B; font-size: 0.85em;">&nbsp;</span>
                                <span style="flex: 1; text-align: center;">${it.quantity} ${it.unit ? it.unit.slice(0, 3) : ''}</span>
                                <span style="flex: 1; text-align: right;">${this.formatCurrency(it.rate || (it.total / (it.quantity || 1)))}</span>
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

                <!-- Serrated Paper Bottom Trim -->
                <div class="receipt-paper-serrated-bottom"></div>
            </div>
        `;
    },

    // Global Interactive Full Screen Bill UI - Modern Fintech Invoice Sheet
    showBillModal(saleIdOrObject, initialFormat = null) {
        const sale = this._resolveSale(saleIdOrObject);
        if (!sale) {
            this.showToast('Sale invoice not found.', 'error');
            return;
        }

        const settings = Storage.getSettings();
        const shopName = settings.shopName || 'My Grocery Shop';
        const items = sale.items || [];
        const invoiceNum = sale.invoiceNumber || `INV-${(sale.id || '2026').slice(-6).toUpperCase()}`;
        const subtotal = sale.subtotal !== undefined ? sale.subtotal : (sale.total || 0);
        const discount = sale.discountAmount || sale.discount || 0;
        const tax = sale.taxAmount || sale.tax || 0;
        const grandTotal = sale.grandTotal !== undefined ? sale.grandTotal : (sale.total || 0);
        const paid = sale.paidAmount !== undefined ? sale.paidAmount : grandTotal;
        const due = sale.dueAmount !== undefined ? sale.dueAmount : (grandTotal - paid);
        const customerName = sale.customerName || sale.customer || '';
        const customerPhone = sale.customerPhone || '';
        const paymentMethod = sale.paymentMethod || 'Cash';

        let formattedDateStr = sale.date ? this.formatDateTime(sale.date) : '';
        try {
            const d = sale.date ? new Date(sale.date) : new Date();
            if (!isNaN(d.getTime())) {
                const month = d.toLocaleString('en-US', { month: 'short' });
                const day = d.getDate();
                const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                formattedDateStr = `${month} ${day} · ${time}`;
            }
        } catch (e) {}

        const refId = sale.id ? (sale.id.replace(/[^0-9]/g, '') + '296294852926').slice(0, 12) : '296294852926';

        let modal = document.getElementById('global-bill-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'global-bill-modal';
            modal.className = 'bill-modal-wrapper';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bill-modal-backdrop" id="bill-modal-backdrop"></div>
            <div class="bill-modal-sheet" id="bill-modal-sheet">
                
                <!-- STICKY HEADER -->
                <header class="bill-modal-header">
                    <button type="button" class="bill-nav-back-btn" id="btn-bill-nav-back">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                        <span>Bill Details</span>
                    </button>

                    <div class="bill-header-title-text">
                        <span>Bill #${invoiceNum}</span>
                    </div>

                    <div class="bill-header-right-actions">
                        <button type="button" class="bill-modal-close-btn" id="btn-bill-nav-close" aria-label="Close">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </header>

                <!-- SCROLLABLE BODY -->
                <div class="bill-modal-body">
                    
                    <!-- 3. RECEIPT HERO CARD -->
                    <div class="bill-hero-accent-card">
                        <div class="bill-hero-shop-title">${shopName}</div>
                        <div class="bill-hero-subtitle">Payment Receipt</div>
                        
                        <div class="bill-hero-amount-wrap">
                            <span class="bill-hero-currency-amount">${this.formatCurrency(grandTotal)}</span>
                            <span class="bill-hero-status-pill status-pill-paid">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                                PAID
                            </span>
                        </div>

                        <div class="bill-hero-timestamp">${formattedDateStr}</div>
                    </div>

                    <!-- MAIN BILL CONTENT SURFACE -->
                    <div class="bill-content-card-surface">

                        <!-- 4. CUSTOMER CARD -->
                        <div class="bill-section-block">
                            <div class="bill-section-label">CUSTOMER</div>
                            <div class="bill-customer-row">
                                <div class="bill-cust-avatar-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </div>
                                <div class="bill-cust-info">
                                    <div class="bill-cust-name">${customerName || 'Walk-in Customer'}</div>
                                    ${customerPhone ? `<div class="bill-cust-phone">${customerPhone}</div>` : ''}
                                </div>
                            </div>
                        </div>

                        <div class="bill-card-divider"></div>

                        <!-- 5. PAYMENT SECTION -->
                        <div class="bill-section-block">
                            <div class="bill-section-label">PAYMENT</div>
                            <div class="bill-payment-row">
                                <div class="bill-pay-method flex items-center gap-2">
                                    <div class="bill-pay-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                                    </div>
                                    <span class="bill-pay-method-name">${paymentMethod}</span>
                                </div>
                                <div class="bill-pay-status-tag">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>PAID</span>
                                </div>
                            </div>
                        </div>

                        <div class="bill-card-divider"></div>

                        <!-- 6. ITEMS SECTION -->
                        <div class="bill-section-block">
                            <div class="bill-section-label">ITEMS</div>
                            <div class="bill-items-list">
                                ${items.map(it => `
                                    <div class="bill-item-line">
                                        <div class="bill-item-left">
                                            <div class="bill-item-name">${it.productName || 'Item'}</div>
                                            <div class="bill-item-sub">${it.quantity} ${it.unit || ''} &times; ${this.formatCurrency(it.rate || (it.total / (it.quantity || 1)))}</div>
                                        </div>
                                        <div class="bill-item-right font-mono-num">${this.formatCurrency(it.total)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="bill-card-divider"></div>

                        <!-- 7. BILL SUMMARY -->
                        <div class="bill-section-block bill-summary-block">
                            <div class="bill-summary-row">
                                <span class="bill-summary-lbl">Subtotal</span>
                                <span class="bill-summary-val font-mono-num">${this.formatCurrency(subtotal)}</span>
                            </div>
                            ${discount > 0 ? `
                                <div class="bill-summary-row bill-discount-row">
                                    <span class="bill-summary-lbl">Discount</span>
                                    <span class="bill-summary-val font-mono-num">-${this.formatCurrency(discount)}</span>
                                </div>
                            ` : ''}
                            ${tax > 0 ? `
                                <div class="bill-summary-row">
                                    <span class="bill-summary-lbl">Tax</span>
                                    <span class="bill-summary-val font-mono-num">+${this.formatCurrency(tax)}</span>
                                </div>
                            ` : ''}
                            
                            <div class="bill-card-divider-strong"></div>

                            <div class="bill-summary-row bill-grand-total-row">
                                <span class="bill-total-paid-lbl">TOTAL PAID</span>
                                <span class="bill-total-paid-val font-mono-num">${this.formatCurrency(grandTotal)}</span>
                            </div>
                        </div>

                        <div class="bill-card-divider"></div>

                        <!-- 8. COLLAPSIBLE TRANSACTION DETAILS -->
                        <details class="bill-tx-details-accordion">
                            <summary class="bill-accordion-summary">
                                <span class="flex items-center gap-1.5">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>
                                    <span>Transaction details</span>
                                </span>
                                <svg class="bill-accordion-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                            </summary>
                            <div class="bill-accordion-content">
                                <div class="bill-detail-entry">
                                    <span class="bill-detail-key">Transaction ID</span>
                                    <span class="bill-detail-val font-mono">${invoiceNum}</span>
                                </div>
                                <div class="bill-detail-entry">
                                    <span class="bill-detail-key">Payment reference</span>
                                    <span class="bill-detail-val font-mono">${refId}</span>
                                </div>
                                <div class="bill-detail-entry">
                                    <span class="bill-detail-key">Payment method</span>
                                    <span class="bill-detail-val">${paymentMethod}</span>
                                </div>
                                <div class="bill-detail-entry">
                                    <span class="bill-detail-key">Date & Time</span>
                                    <span class="bill-detail-val">${formattedDateStr}</span>
                                </div>
                            </div>
                        </details>

                    </div>

                </div>

                <!-- 12. BILL ACTIONS STICKY DOCK -->
                <footer class="bill-sticky-action-dock">
                    <button type="button" class="btn-bill-action-whatsapp" id="btn-bill-whatsapp">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        <span>Send Receipt via WhatsApp</span>
                    </button>

                    <div class="bill-secondary-actions-row">
                        <button type="button" class="btn-bill-action-secondary" id="btn-bill-action-share">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                            <span>Share</span>
                        </button>
                        <button type="button" class="btn-bill-action-secondary" id="btn-bill-action-print">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                            <span>Print</span>
                        </button>
                        <button type="button" class="btn-bill-action-secondary" id="btn-bill-action-pdf">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                            <span>PDF</span>
                        </button>
                    </div>
                </footer>

            </div>
        `;

        modal._activeSale = sale;

        const closeModal = () => {
            this.closeModal(modal);
            document.removeEventListener('keydown', handleEsc);
        };

        const handleEsc = (e) => {
            if (e.key === 'Escape') closeModal();
        };

        // Bind Close Triggers
        document.getElementById('btn-bill-nav-back').addEventListener('click', closeModal);
        document.getElementById('btn-bill-nav-close').addEventListener('click', closeModal);
        document.getElementById('bill-modal-backdrop').addEventListener('click', closeModal);
        document.addEventListener('keydown', handleEsc);

        // Bind Action Buttons
        document.getElementById('btn-bill-whatsapp').addEventListener('click', () => {
            this.sendWhatsAppBill(sale);
        });
        document.getElementById('btn-bill-action-share').addEventListener('click', () => {
            this.shareBill(sale);
        });
        document.getElementById('btn-bill-action-print').addEventListener('click', () => {
            this.printBill(sale, 'thermal-80');
        });
        document.getElementById('btn-bill-action-pdf').addEventListener('click', () => {
            this.downloadBillPDF(sale, 'digital-super');
        });

        // Activate modal sheet animation
        requestAnimationFrame(() => {
            this.openModal(modal);
        });
    },


    // Send Invoice via WhatsApp Web / App
    sendWhatsAppBill(saleIdOrObject) {
        const sale = this._resolveSale(saleIdOrObject);
        if (!sale) return;

        const settings = Storage.getSettings();
        const shopName = settings.shopName || 'My Grocery Shop';
        const invoiceNum = sale.invoiceNumber || `INV-${(sale.id || '2026').slice(-6).toUpperCase()}`;
        const totalStr = this.formatCurrency(sale.grandTotal !== undefined ? sale.grandTotal : sale.total);
        const dateStr = sale.date ? this.formatDateTime(sale.date) : '';
        const custName = sale.customerName || sale.customer || 'Customer';
        const rawPhone = (sale.customerPhone || '').replace(/[^0-9]/g, '');

        let text = `*${shopName}*\n` +
            `*Payment Receipt*\n` +
            `-----------------------------\n` +
            `Invoice: *${invoiceNum}*\n` +
            `Date: ${dateStr}\n` +
            `Customer: ${custName}\n` +
            `-----------------------------\n` +
            `Total Paid: *${totalStr}* ✓\n` +
            `-----------------------------\n` +
            `Thank you for shopping with us! Please visit again.`;

        let phone = rawPhone;
        if (!phone) {
            phone = prompt("Enter customer WhatsApp phone number with country code (e.g. 919876543210):", "91");
            if (!phone) return;
            phone = phone.replace(/[^0-9]/g, '');
        }

        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
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
                margin: format === 'a4' ? [10, 10, 10, 10] : (format === 'digital-super' ? [0, 0, 0, 0] : [4, 4, 4, 4]),
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: format === 'digital-super' ? '#4f36e3' : '#ffffff' },
                jsPDF: {
                    unit: 'mm',
                    format: format === 'a4' ? 'a4' : (format === 'thermal-58' ? [58, 180] : (format === 'digital-super' ? [90, 220] : [80, 220])),
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
        const shopName = settings.shopName || 'My Shop';
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


